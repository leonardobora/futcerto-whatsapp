import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export const weeklyScheduleTool = {
  type: 'function' as const,
  function: {
    name: 'get_weekly_schedule',
    description: 'Retorna a grade semanal de uma quadra com reservas e bloqueios',
    parameters: {
      type: 'object',
      properties: {
        court_id: {
          type: 'string',
          description: 'ID da quadra',
        },
        gestor_phone: {
          type: 'string',
          description: 'Telefone do gestor (para verificação de permissão)',
        },
        week_start: {
          type: 'string',
          description: 'Data de início da semana (YYYY-MM-DD, padrão: hoje)',
        },
      },
      required: ['court_id', 'gestor_phone'],
    },
  },
}

export async function getWeeklySchedule(args: {
  court_id: string
  gestor_phone: string
  week_start?: string
}): Promise<object> {
  const { court_id, gestor_phone, week_start } = args

  // Verifica permissão
  const { data: court } = await supabase
    .from('courts')
    .select('id, name, owner:users!courts_owner_id_fkey(phone)')
    .eq('id', court_id)
    .single()

  if (!court || court.owner.phone !== gestor_phone) {
    return { error: 'Sem permissão para ver esta quadra.' }
  }

  // Define período da semana
  const start = week_start ? new Date(week_start) : new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]

  // Busca reservas e bloqueios em paralelo
  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    supabase
      .from('bookings')
      .select('date, start_time, end_time, status, booking_code, player:users!bookings_player_id_fkey(name)')
      .eq('court_id', court_id)
      .gte('date', startStr)
      .lte('date', endStr)
      .in('status', ['pending', 'confirmed']),
    supabase
      .from('time_blocks')
      .select('date, start_time, end_time, reason')
      .eq('court_id', court_id)
      .gte('date', startStr)
      .lte('date', endStr),
  ])

  // Organiza por dia
  const schedule: Record<string, object[]> = {}
  for (let i = 0; i <= 6; i++) {
    const day = new Date(start)
    day.setDate(day.getDate() + i)
    const dayStr = day.toISOString().split('T')[0]
    schedule[dayStr] = []
  }

  for (const booking of bookings || []) {
    if (schedule[booking.date]) {
      schedule[booking.date].push({
        type: 'booking',
        code: booking.booking_code,
        player: booking.player?.name || 'N/A',
        start: booking.start_time,
        end: booking.end_time,
        status: booking.status,
      })
    }
  }

  for (const block of blocks || []) {
    if (schedule[block.date]) {
      schedule[block.date].push({
        type: 'block',
        reason: block.reason,
        start: block.start_time,
        end: block.end_time,
      })
    }
  }

  return {
    court_name: court.name,
    period: { start: startStr, end: endStr },
    schedule,
  }
}

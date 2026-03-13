import { createClient } from '@supabase/supabase-js'
import { config } from '../config'
import { generateBookingCode } from '../services/booking-codes'
import { notifyGestor } from '../services/notifications'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export const createBookingTool = {
  type: 'function' as const,
  function: {
    name: 'create_booking',
    description: 'Cria uma nova reserva de quadra. Verifica disponibilidade antes de criar.',
    parameters: {
      type: 'object',
      properties: {
        court_id: {
          type: 'string',
          description: 'ID da quadra',
        },
        player_phone: {
          type: 'string',
          description: 'Telefone do jogador',
        },
        date: {
          type: 'string',
          description: 'Data da reserva (YYYY-MM-DD)',
        },
        start_time: {
          type: 'string',
          description: 'Hora de início (HH:MM)',
        },
        end_time: {
          type: 'string',
          description: 'Hora de término (HH:MM)',
        },
        duration_hours: {
          type: 'number',
          description: 'Duração em horas (ex: 1, 1.5, 2)',
        },
      },
      required: ['court_id', 'player_phone', 'date', 'start_time', 'end_time', 'duration_hours'],
    },
  },
}

export async function createBooking(args: {
  court_id: string
  player_phone: string
  date: string
  start_time: string
  end_time: string
  duration_hours: number
}): Promise<{ success: boolean; message: string; booking_code?: string; total_price?: number }> {
  const { court_id, player_phone, date, start_time, end_time, duration_hours } = args

  // Busca jogador
  const { data: player } = await supabase
    .from('users')
    .select('id, name')
    .eq('phone', player_phone)
    .single()

  if (!player) return { success: false, message: 'Jogador não encontrado.' }

  // Busca quadra
  const { data: court } = await supabase
    .from('courts')
    .select('id, name, price_per_hour, owner:users!courts_owner_id_fkey(phone)')
    .eq('id', court_id)
    .eq('active', true)
    .single()

  if (!court) return { success: false, message: 'Quadra não encontrada ou inativa.' }

  // Verifica disponibilidade
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('court_id', court_id)
    .eq('date', date)
    .in('status', ['pending', 'confirmed'])
    .or(`start_time.lt.${end_time},end_time.gt.${start_time}`)

  if (conflicts && conflicts.length > 0) {
    return { success: false, message: `Horário indisponível para ${date} das ${start_time} às ${end_time}.` }
  }

  // Calcula preço
  const total_price = court.price_per_hour * duration_hours
  const booking_code = generateBookingCode()

  // Cria reserva
  const { error } = await supabase
    .from('bookings')
    .insert({
      court_id,
      player_id: player.id,
      date,
      start_time,
      end_time,
      duration_hours,
      total_price,
      booking_code,
      status: 'pending',
    })

  if (error) return { success: false, message: 'Erro ao criar reserva. Tente novamente.' }

  // Notifica gestor
  await notifyGestor(court.owner.phone, {
    type: 'new_booking_request',
    booking_code,
    player_name: player.name || player_phone,
    court_name: court.name,
    date,
    start_time,
    end_time,
    total_price,
  })

  return {
    success: true,
    message: `Reserva criada com sucesso! Código: ${booking_code}`,
    booking_code,
    total_price,
  }
}

import { createClient } from '@supabase/supabase-js'
import { config } from '../config'
import { formatDate, formatTime } from '../utils/date-helpers'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export const getBookingsTool = {
  type: 'function' as const,
  function: {
    name: 'get_bookings',
    description: 'Lista reservas do jogador (próximas e histórico recente)',
    parameters: {
      type: 'object',
      properties: {
        player_phone: {
          type: 'string',
          description: 'Telefone do jogador',
        },
        status_filter: {
          type: 'string',
          enum: ['all', 'upcoming', 'pending', 'confirmed', 'cancelled'],
          description: 'Filtro de status (padrão: upcoming)',
        },
      },
      required: ['player_phone'],
    },
  },
}

export async function getBookings(args: {
  player_phone: string
  status_filter?: string
}): Promise<object[]> {
  const { player_phone, status_filter = 'upcoming' } = args

  const { data: player } = await supabase
    .from('users')
    .select('id')
    .eq('phone', player_phone)
    .single()

  if (!player) return []

  let query = supabase
    .from('bookings')
    .select('booking_code, date, start_time, end_time, status, total_price, court:courts(name, address)')
    .eq('player_id', player.id)
    .order('date', { ascending: true })
    .limit(10)

  if (status_filter === 'upcoming') {
    query = query.gte('date', new Date().toISOString().split('T')[0]).in('status', ['pending', 'confirmed'])
  } else if (status_filter !== 'all') {
    query = query.eq('status', status_filter)
  }

  const { data: bookings } = await query
  return bookings || []
}

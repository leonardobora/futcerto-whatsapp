import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export const getPendingBookingsTool = {
  type: 'function' as const,
  function: {
    name: 'get_pending_bookings',
    description: 'Lista reservas pendentes de aprovação para as quadras do gestor',
    parameters: {
      type: 'object',
      properties: {
        gestor_phone: {
          type: 'string',
          description: 'Telefone do gestor',
        },
      },
      required: ['gestor_phone'],
    },
  },
}

export async function getPendingBookings(args: { gestor_phone: string }): Promise<object[]> {
  const { gestor_phone } = args

  const { data } = await supabase
    .from('bookings')
    .select(`
      booking_code, date, start_time, end_time, total_price, created_at,
      court:courts!inner(name, owner:users!courts_owner_id_fkey!inner(phone)),
      player:users!bookings_player_id_fkey(name, phone)
    `)
    .eq('status', 'pending')
    .eq('court.owner.phone', gestor_phone)
    .order('created_at', { ascending: true })

  return data || []
}

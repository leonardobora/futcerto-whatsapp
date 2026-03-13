import { createClient } from '@supabase/supabase-js'
import { config } from '../config'
import { notifyPlayer } from '../services/notifications'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export const rejectBookingTool = {
  type: 'function' as const,
  function: {
    name: 'reject_booking',
    description: 'Recusa uma reserva pendente. Notifica o jogador com o motivo.',
    parameters: {
      type: 'object',
      properties: {
        booking_code: {
          type: 'string',
          description: 'Código da reserva',
        },
        gestor_phone: {
          type: 'string',
          description: 'Telefone do gestor',
        },
        reason: {
          type: 'string',
          description: 'Motivo da recusa (será enviado ao jogador)',
        },
      },
      required: ['booking_code', 'gestor_phone', 'reason'],
    },
  },
}

export async function rejectBooking(args: {
  booking_code: string
  gestor_phone: string
  reason: string
}): Promise<{ success: boolean; message: string }> {
  const { booking_code, gestor_phone, reason } = args

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      court:courts(name, owner:users!courts_owner_id_fkey(phone)),
      player:users!bookings_player_id_fkey(name, phone)
    `)
    .eq('booking_code', booking_code)
    .eq('status', 'pending')
    .single()

  if (!booking || booking.court.owner.phone !== gestor_phone) {
    return { success: false, message: `Reserva ${booking_code} não encontrada ou sem permissão.` }
  }

  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking.id)

  await notifyPlayer(booking.player.phone, {
    type: 'booking_rejected',
    booking_code,
    court_name: booking.court.name,
    reason,
  })

  return { success: true, message: `Reserva ${booking_code} recusada. Jogador notificado.` }
}

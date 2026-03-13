import { createClient } from '@supabase/supabase-js'
import { config } from '../config'
import { notifyPlayer, notifyGestor } from '../services/notifications'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export const cancelBookingTool = {
  type: 'function' as const,
  function: {
    name: 'cancel_booking',
    description: 'Cancela uma reserva. Verifica prazo mínimo de cancelamento.',
    parameters: {
      type: 'object',
      properties: {
        booking_code: {
          type: 'string',
          description: 'Código da reserva',
        },
        player_phone: {
          type: 'string',
          description: 'Telefone do jogador cancelando',
        },
        reason: {
          type: 'string',
          description: 'Motivo do cancelamento (opcional)',
        },
      },
      required: ['booking_code', 'player_phone'],
    },
  },
}

export async function cancelBooking(args: {
  booking_code: string
  player_phone: string
  reason?: string
}): Promise<{ success: boolean; message: string; refund?: boolean }> {
  const { booking_code, player_phone, reason } = args

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      court:courts(name, owner:users!courts_owner_id_fkey(phone)),
      player:users!bookings_player_id_fkey(phone)
    `)
    .eq('booking_code', booking_code)
    .in('status', ['pending', 'confirmed'])
    .single()

  if (!booking || booking.player.phone !== player_phone) {
    return { success: false, message: `Reserva ${booking_code} não encontrada.` }
  }

  // Verifica prazo mínimo
  const bookingDateTime = new Date(`${booking.date}T${booking.start_time}`)
  const now = new Date()
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  const refund = hoursUntilBooking >= config.business.cancelamentoHorasMinimo

  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking.id)

  await notifyGestor(booking.court.owner.phone, {
    type: 'booking_cancelled',
    booking_code,
    reason: reason || 'Não informado',
  })

  return {
    success: true,
    message: `Reserva ${booking_code} cancelada.`,
    refund,
  }
}

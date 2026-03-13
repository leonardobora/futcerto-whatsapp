import { createClient } from '@supabase/supabase-js'
import { config } from '../config'
import { notifyPlayer } from '../services/notifications'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export const approveBookingTool = {
  type: 'function' as const,
  function: {
    name: 'approve_booking',
    description: 'Aprova uma reserva pendente. Notifica o jogador automaticamente.',
    parameters: {
      type: 'object',
      properties: {
        booking_code: {
          type: 'string',
          description: 'Código da reserva (ex: FC-1234)',
        },
        gestor_phone: {
          type: 'string',
          description: 'Telefone do gestor aprovando a reserva',
        },
      },
      required: ['booking_code', 'gestor_phone'],
    },
  },
}

export async function approveBooking(args: {
  booking_code: string
  gestor_phone: string
}): Promise<{ success: boolean; message: string; booking?: object }> {
  const { booking_code, gestor_phone } = args

  // Busca a reserva pelo código
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      court:courts(name, owner_id, owner:users!courts_owner_id_fkey(phone)),
      player:users!bookings_player_id_fkey(name, phone)
    `)
    .eq('booking_code', booking_code)
    .eq('status', 'pending')
    .single()

  if (error || !booking) {
    return { success: false, message: `Reserva ${booking_code} não encontrada ou já processada.` }
  }

  // Verifica se o gestor é dono da quadra
  if (booking.court.owner.phone !== gestor_phone) {
    return { success: false, message: 'Você não tem permissão para aprovar esta reserva.' }
  }

  // Atualiza status para confirmado
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', booking.id)

  if (updateError) {
    return { success: false, message: 'Erro ao aprovar reserva. Tente novamente.' }
  }

  // Notifica jogador
  await notifyPlayer(booking.player.phone, {
    type: 'booking_confirmed',
    booking_code,
    court_name: booking.court.name,
    date: booking.date,
    start_time: booking.start_time,
    end_time: booking.end_time,
  })

  return {
    success: true,
    message: `Reserva ${booking_code} aprovada com sucesso!`,
    booking: {
      code: booking_code,
      player: booking.player.name,
      date: booking.date,
      time: `${booking.start_time} - ${booking.end_time}`,
    },
  }
}

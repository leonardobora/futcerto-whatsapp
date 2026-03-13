/**
 * Serviço de notificações WhatsApp
 * Abstrai o canal de envio (Evolution, OpenClaw, Tyxter)
 */

import { config } from '../config'

type NotificationPayload =
  | { type: 'new_booking_request'; booking_code: string; player_name: string; court_name: string; date: string; start_time: string; end_time: string; total_price: number }
  | { type: 'booking_confirmed'; booking_code: string; court_name: string; date: string; start_time: string; end_time: string }
  | { type: 'booking_rejected'; booking_code: string; court_name: string; reason: string }
  | { type: 'booking_cancelled'; booking_code: string; reason: string }
  | { type: 'booking_reminder'; booking_code: string; court_name: string; date: string; start_time: string }

export async function notifyPlayer(phone: string, payload: NotificationPayload): Promise<void> {
  const message = formatPlayerMessage(payload)
  await sendWhatsApp(phone, message)
}

export async function notifyGestor(phone: string, payload: NotificationPayload): Promise<void> {
  const message = formatGestorMessage(payload)
  await sendWhatsApp(phone, message)
}

function formatPlayerMessage(payload: NotificationPayload): string {
  switch (payload.type) {
    case 'booking_confirmed':
      return `✅ Reserva confirmada!\n\n🏟️ ${payload.court_name}\n📅 ${payload.date} às ${payload.start_time}\n\nAte lá! ⚽`
    case 'booking_rejected':
      return `❌ Reserva não aprovada.\n\nMotivo: ${payload.reason}\n\nTente outro horário!`
    case 'booking_cancelled':
      return `⚠️ Reserva cancelada.\n\nCódigo: ${payload.booking_code}`
    case 'booking_reminder':
      return `🔔 Lembrete! Você tem uma reserva amanhã:\n🏟️ ${payload.court_name}\n⏰ ${payload.start_time}`
    default:
      return 'Notificação do FutCerto'
  }
}

function formatGestorMessage(payload: NotificationPayload): string {
  switch (payload.type) {
    case 'new_booking_request':
      return `🆕 Novo pedido de reserva!\n\nCódigo: *${payload.booking_code}*\nJogador: ${payload.player_name}\n📅 ${payload.date} - ${payload.start_time} às ${payload.end_time}\n💰 R$ ${payload.total_price}\n\nResponda: \"aprovar ${payload.booking_code}\" ou \"recusar ${payload.booking_code} [motivo]\"`
    case 'booking_cancelled':
      return `⚠️ Reserva cancelada pelo jogador.\n\nCódigo: ${payload.booking_code}\nMotivo: ${payload.reason}`
    default:
      return 'Notificação do FutCerto'
  }
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  // Detecta canal disponível e envia
  if (config.channels.evolution?.apiKey) {
    const { EvolutionChannel } = await import('../channels/evolution-api')
    const ch = new EvolutionChannel()
    await ch.sendMessage(phone, message)
  } else if (config.channels.tyxter?.apiKey) {
    const { TyxterChannel } = await import('../channels/tyxter')
    const ch = new TyxterChannel()
    await ch.sendMessage(phone, message)
  } else if (config.channels.openclaw?.apiKey) {
    const { OpenClawChannel } = await import('../channels/openclaw')
    const ch = new OpenClawChannel()
    await ch.sendMessage(phone, message)
  } else {
    console.log(`[NOTIFY] ${phone}: ${message}`)
  }
}

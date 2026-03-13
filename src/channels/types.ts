/**
 * Tipos compartilhados para o sistema de canais WhatsApp
 */

export type ChannelType = 'evolution' | 'openclaw' | 'tyxter'

export interface NormalizedMessage {
  channel: ChannelType
  phone: string
  message: string
  raw: unknown
}

export interface IChannel {
  sendMessage(phone: string, message: string): Promise<void>
}

export interface IWebhookParser {
  parseWebhook(body: unknown): { phone: string; message: string } | null
}

export type NotificationType =
  | 'new_booking_request'
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'booking_reminder'

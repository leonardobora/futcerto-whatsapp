import axios from 'axios'
import { config } from '../config'

export class OpenClawChannel {
  private apiKey: string
  private baseUrl = 'https://api.openclaw.io/v1'

  constructor() {
    this.apiKey = config.channels.openclaw?.apiKey || ''
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    await axios.post(
      `${this.baseUrl}/messages`,
      { to: phone, text: message },
      {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      }
    )
  }

  async sendQuickReplies(
    phone: string,
    text: string,
    replies: { id: string; label: string }[]
  ): Promise<void> {
    await axios.post(
      `${this.baseUrl}/messages`,
      {
        to: phone,
        type: 'quick_reply',
        text,
        quick_replies: replies,
      },
      {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      }
    )
  }

  /**
   * Verifica assinatura HMAC do webhook OpenClaw
   */
  static verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    const crypto = require('crypto')
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
    return signature === `sha256=${expected}`
  }

  static parseWebhook(body: unknown): { phone: string; message: string } | null {
    try {
      const payload = body as { from: string; text: string }
      if (!payload.from || !payload.text) return null
      return { phone: payload.from, message: payload.text }
    } catch {
      return null
    }
  }
}

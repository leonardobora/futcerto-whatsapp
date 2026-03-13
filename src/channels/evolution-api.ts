import axios from 'axios'
import { config } from '../config'

export interface WhatsAppMessage {
  phone: string
  message: string
  channel: 'evolution' | 'openclaw' | 'tyxter'
}

export class EvolutionChannel {
  private baseUrl: string
  private apiKey: string
  private instanceName: string

  constructor() {
    this.baseUrl = config.channels.evolution.apiUrl || 'http://localhost:8080'
    this.apiKey = config.channels.evolution.apiKey || ''
    this.instanceName = config.channels.evolution.instanceName || 'futcerto'
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    const url = `${this.baseUrl}/message/sendText/${this.instanceName}`
    await axios.post(
      url,
      {
        number: phone,
        options: { delay: 500 },
        textMessage: { text: message },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
      }
    )
  }

  async sendButtonMessage(phone: string, text: string, buttons: { id: string; text: string }[]): Promise<void> {
    const url = `${this.baseUrl}/message/sendButtons/${this.instanceName}`
    await axios.post(
      url,
      {
        number: phone,
        buttonMessage: {
          text,
          footerText: 'FutCerto',
          buttons: buttons.map(b => ({ buttonId: b.id, buttonText: { displayText: b.text }, type: 1 })),
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
      }
    )
  }

  /**
   * Normaliza o payload recebido via webhook da Evolution API
   */
  static parseWebhook(body: unknown): { phone: string; message: string } | null {
    try {
      const payload = body as {
        data: {
          key: { remoteJid: string }
          message: { conversation?: string; extendedTextMessage?: { text: string } }
        }
      }

      const phone = payload.data.key.remoteJid.replace('@s.whatsapp.net', '')
      const message =
        payload.data.message.conversation ||
        payload.data.message.extendedTextMessage?.text ||
        ''

      if (!phone || !message) return null
      return { phone, message }
    } catch {
      return null
    }
  }
}

export class TyxterChannel {
  private apiKey: string
  private baseUrl = 'https://api.tyxter.com/v1'

  constructor() {
    this.apiKey = config.channels.tyxter?.apiKey || ''
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    await axios.post(
      `${this.baseUrl}/messages/send`,
      { to: phone, type: 'text', text: { body: message } },
      { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } }
    )
  }

  async sendInteractiveList(
    phone: string,
    text: string,
    sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
  ): Promise<void> {
    await axios.post(
      `${this.baseUrl}/messages/send`,
      {
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text },
          action: { button: 'Ver opções', sections },
        },
      },
      { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } }
    )
  }

  static parseWebhook(body: unknown): { phone: string; message: string } | null {
    try {
      const payload = body as { contact: { phone: string }; message: { text: string } }
      return { phone: payload.contact.phone, message: payload.message.text }
    } catch {
      return null
    }
  }
}

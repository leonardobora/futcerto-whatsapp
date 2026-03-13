import { createClient } from '@supabase/supabase-js'
import { config } from '../config'
import { GestorAgent } from './gestor'
import { JogadorAgent } from './jogador'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export interface IncomingMessage {
  channel: 'evolution' | 'openclaw' | 'tyxter'
  phone: string
  message: string
  raw: unknown
}

// Cache simples de agentes em memória (em produção usar Redis)
const agentCache = new Map<string, GestorAgent | JogadorAgent>()

export class MessageRouter {
  async route(incoming: IncomingMessage): Promise<void> {
    const { phone, message, channel } = incoming

    // Busca ou cria usuário
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single()

    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ phone, profile: 'jogador' })
        .select()
        .single()
      user = newUser
    }

    // Obtém ou cria agente para este usuário
    const cacheKey = `${phone}:${user.profile}`
    let agent = agentCache.get(cacheKey)

    if (!agent) {
      agent = user.profile === 'gestor' ? new GestorAgent() : new JogadorAgent()
      agentCache.set(cacheKey, agent)
    }

    // Processa a mensagem
    const response = await agent.process(phone, message)

    // Envia resposta pelo canal correto
    await sendResponse(channel, phone, response)
  }
}

async function sendResponse(channel: IncomingMessage['channel'], phone: string, message: string): Promise<void> {
  switch (channel) {
    case 'evolution': {
      const { EvolutionChannel } = await import('../channels/evolution')
      const ch = new EvolutionChannel()
      await ch.sendMessage(phone, message)
      break
    }
    case 'openclaw': {
      const { OpenClawChannel } = await import('../channels/openclaw')
      const ch = new OpenClawChannel()
      await ch.sendMessage(phone, message)
      break
    }
    case 'tyxter': {
      const { TyxterChannel } = await import('../channels/tyxter')
      const ch = new TyxterChannel()
      await ch.sendMessage(phone, message)
      break
    }
  }
}

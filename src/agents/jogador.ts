import OpenAI from 'openai'
import { config } from '../config'
import { tools as jogadorTools } from '../tools/jogador-tools'

const openai = new OpenAI({ apiKey: config.ai.apiKey })

const SYSTEM_PROMPT = `Você é o assistente do FutCerto para JOGADORES.

Suas responsabilidades:
- Ajudar a encontrar quadras disponíveis
- Fazer reservas de quadras
- Mostrar reservas do jogador
- Cancelar reservas (respeitando prazo mínimo)
- Responder dúvidas sobre a plataforma

Regras de conduta:
- Seja amigável e descontraído
- Sempre confirme os detalhes antes de fazer uma reserva
- Informe o valor total antes de confirmar
- Use formatação simples (sem markdown excessivo) pois é WhatsApp
- Quando mostrar quadras, liste no máximo 5 opções

Formato de datas: DD/MM/YYYY
Formato de horas: HH:MM
Moeda: R$ com 2 casas decimais`

export class JogadorAgent {
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = []

  async process(phone: string, message: string): Promise<string> {
    this.conversationHistory.push({ role: 'user', content: message })

    let response = await openai.chat.completions.create({
      model: config.ai.model,
      temperature: config.ai.temperature,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...this.conversationHistory,
      ],
      tools: jogadorTools,
      tool_choice: 'auto',
    })

    // Agentic loop
    while (response.choices[0].finish_reason === 'tool_calls') {
      const toolCalls = response.choices[0].message.tool_calls!
      this.conversationHistory.push(response.choices[0].message)

      const toolResults = await Promise.all(
        toolCalls.map(async (tc) => {
          const result = await executeTool(tc.function.name, JSON.parse(tc.function.arguments))
          return {
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          }
        })
      )

      this.conversationHistory.push(...toolResults)

      response = await openai.chat.completions.create({
        model: config.ai.model,
        temperature: config.ai.temperature,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...this.conversationHistory,
        ],
        tools: jogadorTools,
        tool_choice: 'auto',
      })
    }

    const assistantMessage = response.choices[0].message.content || ''
    this.conversationHistory.push({ role: 'assistant', content: assistantMessage })

    // Mantém apenas as últimas 20 mensagens
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20)
    }

    return assistantMessage
  }
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const { buscarQuadras, verificarDisponibilidade, criarReserva, cancelarReserva, listarReservasJogador } = await import('../tools/jogador-tools-impl')

  switch (name) {
    case 'buscarQuadras': return buscarQuadras(args)
    case 'verificarDisponibilidade': return verificarDisponibilidade(args)
    case 'criarReserva': return criarReserva(args)
    case 'cancelarReserva': return cancelarReserva(args)
    case 'listarReservasJogador': return listarReservasJogador(args)
    default: throw new Error(`Tool desconhecida: ${name}`)
  }
}

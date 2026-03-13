import OpenAI from 'openai'
import { config } from '../config'
import { tools as gestorTools } from '../tools/gestor-tools'

const openai = new OpenAI({ apiKey: config.ai.apiKey })

const SYSTEM_PROMPT = `Você é o assistente do FutCerto para GESTORES de quadras esportivas.

Suas responsabilidades:
- Mostrar agenda e reservas da quadra
- Gerenciar bloqueios de horário
- Cancelar reservas quando necessário
- Fornecer relatórios de ocupação e faturamento
- Responder dúvidas sobre a plataforma

Regras de conduta:
- Seja direto e profissional
- Confirme ações importantes antes de executar
- Sempre informe o total de reservas ao mostrar a agenda
- Use formatação simples (sem markdown excessivo) pois é WhatsApp

Formato de datas: DD/MM/YYYY
Formato de horas: HH:MM
Moeda: R$ com 2 casas decimais`

export class GestorAgent {
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
      tools: gestorTools,
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
        tools: gestorTools,
        tool_choice: 'auto',
      })
    }

    const assistantMessage = response.choices[0].message.content || ''
    this.conversationHistory.push({ role: 'assistant', content: assistantMessage })

    // Mantém apenas as últimas 20 mensagens para não exceder o contexto
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20)
    }

    return assistantMessage
  }
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const { listarReservasGestor, gerenciarBloqueios, cancelarReservaGestor } = await import('../tools/gestor-tools-impl')

  switch (name) {
    case 'listarReservasGestor': return listarReservasGestor(args)
    case 'gerenciarBloqueios': return gerenciarBloqueios(args)
    case 'cancelarReservaGestor': return cancelarReservaGestor(args)
    default: throw new Error(`Tool desconhecida: ${name}`)
  }
}

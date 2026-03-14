// =============================================================================
// jogador.ts - Jogador Agent
// FutCerto v2.0
// Gerencia busca, reserva e cancelamento para jogadores
// =============================================================================

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { getConfig } from "../config";
import { getSupabaseServiceClient } from "../services/supabase";
import { createModuleLogger } from "../utils/logger";
import { JOGADOR_TOOLS } from "../tools/registry";
import { searchCourts } from "../tools/search-courts";
import { createBooking } from "../tools/create-booking";
import { getBookings } from "../tools/get-bookings";
import { cancelBooking } from "../tools/cancel-booking";
import type { IncomingMessage, UserContext, AgentResult } from "../channels/types";

const log = createModuleLogger("agent:jogador");

// Carrega o prompt do arquivo .md
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "prompts/jogador.md"),
  "utf-8"
);

// Mapa de execução das tools
const TOOL_EXECUTORS: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  search_courts: (args) => searchCourts(args as Parameters<typeof searchCourts>[0]),
  create_booking: (args) => createBooking(args as Parameters<typeof createBooking>[0]),
  get_user_bookings: (args) => getBookings(args as Parameters<typeof getBookings>[0]),
  cancel_booking: (args) => cancelBooking(args as Parameters<typeof cancelBooking>[0]),
};

/**
 * Processa mensagem do jogador com loop de tool calling
 */
export async function handleJogadorMessage(
  message: IncomingMessage,
  context: UserContext
): Promise<AgentResult> {
  const config = getConfig();
  const supabase = getSupabaseServiceClient();
  const openai = new OpenAI({ apiKey: config.openai.apiKey });

  // Busca histórico de conversa (últimas 20 mensagens)
  const { data: history } = await supabase
    .from("conversation_history")
    .select("message, sender, agent_type")
    .eq("user_id", context.userId!)
    .order("created_at", { ascending: false })
    .limit(20);

  // Monta mensagem do usuário (texto ou localização)
  let userMessageText: string;
  if (message.type === "text") {
    userMessageText = message.text ?? "";
  } else if (message.type === "location" && message.location) {
    userMessageText = `[Compartilhou localização: lat=${message.location.latitude}, lng=${message.location.longitude}${
      message.location.address ? `, endereço: ${message.location.address}` : ""
    }]`;
  } else {
    userMessageText = `[Enviou ${message.type}]`;
  }

  // Monta histórico invertido para o OpenAI
  const conversationHistory: OpenAI.ChatCompletionMessageParam[] = (history ?? [])
    .reverse()
    .map(h => ({
      role: (h.sender === "user" ? "user" : "assistant") as "user" | "assistant",
      content: h.message,
    }));

  // Contexto do usuário para o agente
  const userContext = `
Usuário atual:
- Nome: ${context.name}
- ID: ${context.userId}
- Número: ${context.phoneNumber}
`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${userContext}` },
    ...conversationHistory,
    { role: "user", content: userMessageText },
  ];

  const toolsCalled: string[] = [];
  let intent: string | undefined;

  // Loop de tool calling (máximo 5 iterações para evitar loops infinitos)
  for (let iteration = 0; iteration < 5; iteration++) {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      temperature: config.openai.temperature,
      messages,
      tools: JOGADOR_TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // Agente deu resposta final (sem tool calls)
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      const responseText = assistantMessage.content ?? "Desculpe, não entendi. Pode repetir?";

      // Salva no histórico
      await saveHistory(supabase, context.userId!, userMessageText, responseText, intent);

      return {
        response: responseText,
        intent,
        toolsCalled,
      };
    }

    // Processa tool calls
    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      toolsCalled.push(toolName);

      if (!intent) intent = toolName;

      log.info({ toolName, userId: context.userId }, "Tool chamada pelo Jogador Agent");

      let toolResult: unknown;
      try {
        const args = JSON.parse(toolCall.function.arguments);

        // Injeta user_id automaticamente quando necessário
        if (["create_booking", "get_user_bookings", "cancel_booking"].includes(toolName)) {
          args.user_id = context.userId;
        }

        const executor = TOOL_EXECUTORS[toolName];
        if (executor) {
          toolResult = await executor(args);
        } else {
          toolResult = { error: `Tool '${toolName}' não implementada` };
        }
      } catch (error) {
        log.error({ error, toolName }, "Erro ao executar tool");
        toolResult = { error: `Erro ao executar ${toolName}: ${String(error)}` };
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  // Fallback se atingir limite de iterações
  return {
    response: "Desculpe, tive um problema ao processar sua solicitação. Tente novamente. 🙏",
    toolsCalled,
  };
}

async function saveHistory(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  userId: string,
  userMessage: string,
  botResponse: string,
  intent?: string
) {
  await supabase.from("conversation_history").insert([
    {
      user_id: userId,
      message: userMessage,
      sender: "user" as const,
      agent_type: "jogador" as const,
      intent: intent ?? null,
    },
    {
      user_id: userId,
      message: botResponse,
      sender: "bot" as const,
      agent_type: "jogador" as const,
      intent: intent ?? null,
    },
  ]).catch(() => {});
}

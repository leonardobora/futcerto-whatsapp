// =============================================================================
// gestor.ts - Gestor Agent
// FutCerto v2.0
// Gerencia aprovações, grade e operações para gestores de quadra
// =============================================================================

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { getConfig } from "../config";
import { getSupabaseServiceClient } from "../services/supabase";
import { createModuleLogger } from "../utils/logger";
import { GESTOR_TOOLS } from "../tools/registry";
import { getBookings } from "../tools/get-bookings";
import { approveBooking } from "../tools/approve-booking";
import { rejectBooking } from "../tools/reject-booking";
import { getWeeklySchedule } from "../tools/weekly-schedule";
import { blockTimeslot } from "../tools/block-timeslot";
import type { IncomingMessage, UserContext, AgentResult } from "../channels/types";

const log = createModuleLogger("agent:gestor");

// Carrega o prompt do arquivo .md
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "prompts/gestor.md"),
  "utf-8"
);

// Mapa de execução das tools do gestor
const TOOL_EXECUTORS: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  get_user_bookings: (args) => getBookings(args as Parameters<typeof getBookings>[0]),
  approve_booking: (args) => approveBooking(args as Parameters<typeof approveBooking>[0]),
  reject_booking: (args) => rejectBooking(args as Parameters<typeof rejectBooking>[0]),
  get_weekly_schedule: (args) => getWeeklySchedule(args as Parameters<typeof getWeeklySchedule>[0]),
  block_timeslot: (args) => blockTimeslot(args as Parameters<typeof blockTimeslot>[0]),
};

/**
 * Busca todas as quadras do gestor
 */
async function getManagerCourts(managerId: string) {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("courts")
    .select("id, name")
    .eq("manager_id", managerId)
    .eq("is_active", true);
  return data ?? [];
}

/**
 * Busca resumo de pendências para mostrar ao gestor no início
 */
async function getPendingSummary(managerId: string): Promise<string> {
  const supabase = getSupabaseServiceClient();
  const courts = await getManagerCourts(managerId);

  if (courts.length === 0) {
    return "Nenhuma quadra cadastrada ainda.";
  }

  const courtIds = courts.map(c => c.id);

  const { data: pending } = await supabase
    .from("bookings")
    .select("id, court_id")
    .in("court_id", courtIds)
    .eq("status", "pending");

  const pendingCount = pending?.length ?? 0;

  return courts.map(c => {
    const courtPending = pending?.filter(p => p.court_id === c.id).length ?? 0;
    return `🏟️ *${c.name}*: ${courtPending} pedido(s) pendente(s)`;
  }).join("\n") + (pendingCount > 0 ? `\n\n⚠️ Total: ${pendingCount} reserva(s) aguardando aprovação` : "");
}

/**
 * Processa mensagem do gestor com loop de tool calling
 */
export async function handleGestorMessage(
  message: IncomingMessage,
  context: UserContext
): Promise<AgentResult> {
  const config = getConfig();
  const supabase = getSupabaseServiceClient();
  const openai = new OpenAI({ apiKey: config.openai.apiKey });

  // Busca quadras do gestor
  const courts = await getManagerCourts(context.userId!);
  const courtIds = courts.map(c => c.id);
  const pendingSummary = await getPendingSummary(context.userId!);

  // Busca histórico de conversa
  const { data: history } = await supabase
    .from("conversation_history")
    .select("message, sender")
    .eq("user_id", context.userId!)
    .eq("agent_type", "gestor")
    .order("created_at", { ascending: false })
    .limit(20);

  const userMessageText = message.type === "text" ? (message.text ?? "") : `[${message.type}]`;

  const conversationHistory: OpenAI.ChatCompletionMessageParam[] = (history ?? [])
    .reverse()
    .map(h => ({
      role: (h.sender === "user" ? "user" : "assistant") as "user" | "assistant",
      content: h.message,
    }));

  // Contexto do gestor
  const gestorContext = `
Gestor atual:
- Nome: ${context.name}
- ID: ${context.userId}
- Quadras: ${courts.map(c => `${c.name} (ID: ${c.id})`).join(", ")}
- IDs das quadras: ${courtIds.join(", ")}

Resumo de pendências:
${pendingSummary}

IMPORTANTE: Use manager_id = "${context.userId}" em todas as chamadas de tools que precisarem de autenticação.
`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${gestorContext}` },
    ...conversationHistory,
    { role: "user", content: userMessageText },
  ];

  const toolsCalled: string[] = [];
  let intent: string | undefined;

  // Loop de tool calling
  for (let iteration = 0; iteration < 5; iteration++) {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      temperature: 0.3, // Gestor: mais determinístico
      messages,
      tools: GESTOR_TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      const responseText = assistantMessage.content ?? "Não entendi. Digite 'ajuda' para ver as opções.";

      await saveHistory(supabase, context.userId!, userMessageText, responseText, intent);

      return { response: responseText, intent, toolsCalled };
    }

    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      toolsCalled.push(toolName);
      if (!intent) intent = toolName;

      log.info({ toolName, managerId: context.userId }, "Tool chamada pelo Gestor Agent");

      let toolResult: unknown;
      try {
        const args = JSON.parse(toolCall.function.arguments);

        // Injeta manager_id e court_id(s) automaticamente
        if (["approve_booking", "reject_booking", "block_timeslot"].includes(toolName)) {
          args.manager_id = context.userId;
        }
        // Se tool precisar de court_id e não foi informado, usa a primeira quadra
        if (toolName === "get_weekly_schedule" && !args.court_id && courtIds.length > 0) {
          args.court_id = courtIds[0];
        }

        const executor = TOOL_EXECUTORS[toolName];
        toolResult = executor ? await executor(args) : { error: `Tool '${toolName}' não implementada` };
      } catch (error) {
        toolResult = { error: String(error) };
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return {
    response: "Desculpe, tive um problema. Tente novamente. 🙏",
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
    { user_id: userId, message: userMessage, sender: "user" as const, agent_type: "gestor" as const, intent: intent ?? null },
    { user_id: userId, message: botResponse, sender: "bot" as const, agent_type: "gestor" as const, intent: intent ?? null },
  ]).catch(() => {});
}

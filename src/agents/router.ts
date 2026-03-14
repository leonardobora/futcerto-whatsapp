// =============================================================================
// router.ts - Router Agent (Orquestrador)
// FutCerto v2.0
// Identifica jogador vs gestor e roteia para o agente correto
// =============================================================================

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { getConfig } from "../config";
import { getSupabaseServiceClient } from "../services/supabase";
import { createModuleLogger } from "../utils/logger";
import type { IncomingMessage, UserContext, AgentResult } from "../channels/types";
import { handleJogadorMessage } from "./jogador";
import { handleGestorMessage } from "./gestor";

const log = createModuleLogger("agent:router");

// Carrega o prompt do arquivo .md
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "prompts/router.md"),
  "utf-8"
);

/**
 * Ponto de entrada principal — processa qualquer mensagem recebida
 * Identifica o usuário e roteia para o agente correto
 */
export async function handleMessage(
  message: IncomingMessage,
  context: UserContext
): Promise<AgentResult> {
  const supabase = getSupabaseServiceClient();

  // 1. Busca usuário no banco pelo número de telefone
  const { data: user } = await supabase
    .from("users")
    .select("id, name, role, preferences")
    .eq("phone_number", context.phoneNumber)
    .single();

  // 2. Atualiza last_interaction se usuário existir
  if (user) {
    await supabase
      .from("users")
      .update({ last_interaction: new Date().toISOString() })
      .eq("id", user.id)
      .catch(() => {}); // Não falha se der erro aqui

    const updatedContext: UserContext = {
      ...context,
      userId: user.id,
      name: user.name,
      role: user.role,
      currentAgent: user.role as "jogador" | "gestor",
    };

    // 3. Roteia para o agente especializado
    if (user.role === "jogador") {
      log.info({ phone: context.phoneNumber, role: "jogador" }, "Roteando para Jogador Agent");
      return handleJogadorMessage(message, updatedContext);
    }

    if (user.role === "gestor") {
      log.info({ phone: context.phoneNumber, role: "gestor" }, "Roteando para Gestor Agent");
      return handleGestorMessage(message, updatedContext);
    }
  }

  // 4. Novo usuário — processo de onboarding
  return handleOnboarding(message, context);
}

/**
 * Fluxo de onboarding para novos usuários
 */
async function handleOnboarding(
  message: IncomingMessage,
  context: UserContext
): Promise<AgentResult> {
  const config = getConfig();
  const supabase = getSupabaseServiceClient();

  // Busca histórico de onboarding (se já iniciou e está a meio caminho)
  const { data: history } = await supabase
    .from("conversation_history")
    .select("message, sender, metadata")
    .eq("user_id", context.phoneNumber) // Usa phone como temp ID durante onboarding
    .eq("agent_type", "router")
    .order("created_at", { ascending: false })
    .limit(4);

  const messageText = message.type === "text" ? (message.text ?? "") : "";

  // Verifica se está aguardando escolha de papel (1 ou 2)
  const lastBotMessage = history?.find(h => h.sender === "bot");
  const isWaitingForRole = lastBotMessage?.metadata &&
    (lastBotMessage.metadata as Record<string, unknown>).state === "waiting_role";

  // Verifica se está aguardando nome
  const isWaitingForName = lastBotMessage?.metadata &&
    (lastBotMessage.metadata as Record<string, unknown>).state === "waiting_name";
  const pendingRole = isWaitingForName
    ? (lastBotMessage!.metadata as Record<string, unknown>).role as string
    : undefined;

  // Usa OpenAI para processar onboarding de forma conversacional
  const openai = new OpenAI({ apiKey: config.openai.apiKey });

  // Monta histórico de conversa para contexto
  const conversationHistory: OpenAI.ChatCompletionMessageParam[] = (history ?? [])
    .reverse()
    .map(h => ({
      role: h.sender === "user" ? "user" : "assistant",
      content: h.message,
    }));

  // Prompt de onboarding
  const systemPrompt = `${SYSTEM_PROMPT}

Estado atual:
- Número: ${context.phoneNumber}
- Nome do contato WhatsApp: ${message.contactName ?? "não informado"}
- Aguardando role: ${isWaitingForRole ? "sim" : "não"}
- Aguardando nome: ${isWaitingForName ? `sim (role: ${pendingRole})` : "não"}

Instruções de estado:
${!history?.length ? "- É o primeiro contato deste usuário. Mostre a mensagem de boas-vindas com as opções 1 e 2." : ""}
${isWaitingForRole ? "- Processe a resposta do usuário para identificar se é jogador (1) ou gestor (2)." : ""}
${isWaitingForName ? `- O usuário já escolheu ser ${pendingRole}. Agora aguarda o nome. Salve o usuário quando o nome for informado.` : ""}

Quando souber o nome E o role, responda com JSON especial no formato:
<CREATE_USER>{"phone_number":"${context.phoneNumber}","name":"NOME","role":"jogador|gestor"}</CREATE_USER>`;

  const response = await openai.chat.completions.create({
    model: config.openai.model,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: messageText || `[${message.type}]` },
    ],
  });

  let responseText = response.choices[0].message.content ?? "";

  // Verifica se o agente quer criar o usuário
  const createUserMatch = responseText.match(/<CREATE_USER>(.+?)<\/CREATE_USER>/s);
  if (createUserMatch) {
    try {
      const userData = JSON.parse(createUserMatch[1]);

      // Cria usuário no banco
      const { data: newUser, error } = await supabase
        .from("users")
        .insert({
          phone_number: userData.phone_number,
          name: userData.name,
          role: userData.role,
        })
        .select("id")
        .single();

      if (!error && newUser) {
        log.info({ userId: newUser.id, role: userData.role }, "Novo usuário criado via onboarding");

        // Remove o bloco JSON da resposta
        responseText = responseText.replace(/<CREATE_USER>.+?<\/CREATE_USER>/s, "").trim();

        // Salva histórico
        await saveHistory(supabase, null, context.phoneNumber, messageText, responseText, "router", "onboarding_complete");

        return {
          response: responseText,
          newAgent: userData.role,
          intent: "onboarding_complete",
          metadata: { user_id: newUser.id, role: userData.role },
        };
      }
    } catch (e) {
      log.error({ e }, "Falha ao criar usuário durante onboarding");
    }
  }

  // Determina estado para próxima mensagem
  let state = "initial";
  if (responseText.includes("Você é:") || responseText.includes("Digite 1 ou 2")) {
    state = "waiting_role";
  } else if (responseText.includes("nome completo") || responseText.includes("seu nome")) {
    state = "waiting_name";
  }

  // Salva histórico
  await saveHistory(supabase, null, context.phoneNumber, messageText, responseText, "router", "onboarding", { state });

  return {
    response: responseText,
    intent: "onboarding",
    metadata: { state },
  };
}

async function saveHistory(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  userId: string | null,
  phoneNumber: string,
  userMessage: string,
  botResponse: string,
  agentType: "router" | "jogador" | "gestor",
  intent?: string,
  metadata?: Record<string, unknown>
) {
  const userRow = userId
    ? { user_id: userId }
    : { user_id: "00000000-0000-0000-0000-000000000000" }; // Placeholder para usuários não cadastrados

  await supabase.from("conversation_history").insert([
    {
      ...userRow,
      message: userMessage,
      sender: "user" as const,
      agent_type: agentType,
      intent: intent ?? null,
    },
    {
      ...userRow,
      message: botResponse,
      sender: "bot" as const,
      agent_type: agentType,
      intent: intent ?? null,
      metadata: metadata ?? {},
    },
  ]).catch(() => {});
}

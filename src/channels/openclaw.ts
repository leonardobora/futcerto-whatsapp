// =============================================================================
// openclaw.ts - Adaptador para OpenClaw (WhatsApp via Baileys QR scan)
// FutCerto v2.0
//
// OpenClaw: Open source AI agent com sistema de skills
// GitHub: https://github.com/openclaw/openclaw
// Conecta ao WhatsApp via QR scan (Baileys), sem necessidade de backend
// =============================================================================

import express, { Request, Response } from "express";
import { createModuleLogger } from "../utils/logger";
import type { IncomingMessage, OutgoingMessage, ChannelAdapter } from "./types";

const log = createModuleLogger("channel:openclaw");

/**
 * Payload padrão que o OpenClaw envia para as skills
 */
interface OpenClawToolCall {
  tool: string;
  args: Record<string, unknown>;
  context: {
    phone_number: string;
    contact_name?: string;
    session_id: string;
    message_id: string;
    timestamp: number;
  };
}

/**
 * Resposta esperada pelo OpenClaw das skills
 */
interface OpenClawToolResponse {
  result: unknown;
  success: boolean;
  error?: string;
}

export class OpenClawAdapter implements ChannelAdapter {
  private messageHandler?: (message: IncomingMessage) => Promise<void>;
  private skillHandlers: Map<string, (args: Record<string, unknown>, from: string) => Promise<unknown>> = new Map();

  async initialize(): Promise<void> {
    log.info("OpenClaw adapter inicializado — aguardando skill calls via HTTP");
    log.info("Configure o OpenClaw para apontar suas skills para http://SEU_HOST:3000/openclaw/skill");
  }

  async sendMessage(_message: OutgoingMessage): Promise<void> {
    // OpenClaw gerencia o envio de mensagens diretamente — o agente retorna
    // o texto como resposta da skill call. Não há endpoint de envio separado.
    log.debug("OpenClaw: envio gerenciado pelo agente interno");
  }

  onMessage(handler: (message: IncomingMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  /**
   * Registra um handler para uma tool específica do OpenClaw
   * @param toolName Nome da tool conforme definido no SKILL.md
   * @param handler Função que processa os argumentos e retorna resultado
   */
  registerToolHandler(
    toolName: string,
    handler: (args: Record<string, unknown>, from: string) => Promise<unknown>
  ): void {
    this.skillHandlers.set(toolName, handler);
    log.debug({ toolName }, "Tool handler registrado no OpenClaw adapter");
  }

  /**
   * Registra endpoints Express para o OpenClaw
   * - POST /openclaw/skill: recebe chamadas de tools do agente
   * - POST /openclaw/message: recebe mensagens de texto (opcional)
   */
  registerRoutes(app: express.Application): void {
    // Endpoint principal: recebe chamadas de tools do agente OpenClaw
    app.post("/openclaw/skill", express.json(), async (req: Request, res: Response) => {
      const { tool, args, context } = req.body as OpenClawToolCall;

      log.info({ tool, phone: context?.phone_number }, "Skill call recebida do OpenClaw");

      const handler = this.skillHandlers.get(tool);

      if (!handler) {
        const response: OpenClawToolResponse = {
          success: false,
          result: null,
          error: `Tool '${tool}' não encontrada. Tools disponíveis: ${Array.from(this.skillHandlers.keys()).join(", ")}`,
        };
        return res.status(404).json(response);
      }

      try {
        const result = await handler(args, context.phone_number);
        const response: OpenClawToolResponse = {
          success: true,
          result,
        };
        return res.json(response);
      } catch (error) {
        log.error({ error, tool }, "Erro ao executar skill OpenClaw");
        const response: OpenClawToolResponse = {
          success: false,
          result: null,
          error: String(error),
        };
        return res.status(500).json(response);
      }
    });

    // Endpoint de mensagens diretas (permite integração com message handler)
    app.post("/openclaw/message", express.json(), async (req: Request, res: Response) => {
      if (!this.messageHandler) {
        return res.status(503).json({ error: "No message handler registered" });
      }

      const { from, text, type = "text", location, messageId, timestamp, contactName } = req.body;

      const message: IncomingMessage = {
        from,
        type,
        text,
        location,
        messageId: messageId ?? `openclaw_${Date.now()}`,
        timestamp: timestamp ?? Math.floor(Date.now() / 1000),
        contactName,
      };

      try {
        await this.messageHandler(message);
        return res.json({ success: true });
      } catch (error) {
        log.error({ error }, "Erro ao processar mensagem OpenClaw");
        return res.status(500).json({ error: String(error) });
      }
    });

    // Health check
    app.get("/openclaw/health", (_req: Request, res: Response) => {
      res.json({
        status: "ok",
        adapter: "openclaw",
        tools: Array.from(this.skillHandlers.keys()),
      });
    });

    log.info("Endpoints OpenClaw registrados: /openclaw/skill, /openclaw/message, /openclaw/health");
  }
}

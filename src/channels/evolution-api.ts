// =============================================================================
// evolution-api.ts - Adaptador para Evolution API (WhatsApp via Baileys)
// FutCerto v2.0
//
// Evolution API: https://doc.evolution-api.com
// Repositório: https://github.com/atendai/evolution-api
// =============================================================================

import express, { Request, Response } from "express";
import axios from "axios";
import { getConfig } from "../config";
import { createModuleLogger } from "../utils/logger";
import type { IncomingMessage, OutgoingMessage, ChannelAdapter } from "./types";

const log = createModuleLogger("channel:evolution-api");

export class EvolutionApiAdapter implements ChannelAdapter {
  private config = getConfig();
  private messageHandler?: (message: IncomingMessage) => Promise<void>;

  /**
   * Inicializa a instância WhatsApp na Evolution API
   * Se a instância não existir, cria automaticamente
   */
  async initialize(): Promise<void> {
    const { evolutionApi } = this.config;

    if (!evolutionApi.apiKey) {
      log.warn("EVOLUTION_API_KEY não configurada — canal WhatsApp desabilitado");
      return;
    }

    try {
      // Verifica se a instância já existe
      const response = await axios.get(
        `${evolutionApi.url}/instance/fetchInstances`,
        {
          headers: { apikey: evolutionApi.apiKey },
          timeout: 5000,
        }
      );

      const instances = response.data;
      const exists = instances.some(
        (i: { instance: { instanceName: string } }) =>
          i.instance.instanceName === evolutionApi.instanceName
      );

      if (!exists) {
        // Cria nova instância
        await this.createInstance();
        log.info({ instanceName: evolutionApi.instanceName }, "Instância Evolution API criada");
      } else {
        log.info({ instanceName: evolutionApi.instanceName }, "Instância Evolution API encontrada");
      }

      // Configura o webhook para receber mensagens
      await this.configureWebhook();

    } catch (error) {
      log.error({ error }, "Falha ao inicializar Evolution API — verifique se o container está rodando");
    }
  }

  private async createInstance(): Promise<void> {
    const { evolutionApi } = this.config;

    await axios.post(
      `${evolutionApi.url}/instance/create`,
      {
        instanceName: evolutionApi.instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      },
      {
        headers: {
          "Content-Type": "application/json",
          apikey: evolutionApi.apiKey!,
        },
      }
    );
  }

  private async configureWebhook(): Promise<void> {
    const { evolutionApi, app } = this.config;
    const webhookUrl = `http://host.docker.internal:${app.port}/webhook/messages`;

    await axios.post(
      `${evolutionApi.url}/webhook/set/${evolutionApi.instanceName}`,
      {
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "CONNECTION_UPDATE",
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          apikey: evolutionApi.apiKey!,
        },
      }
    );

    log.info({ webhookUrl }, "Webhook configurado na Evolution API");
  }

  /**
   * Envia mensagem de texto via Evolution API
   */
  async sendMessage(message: OutgoingMessage): Promise<void> {
    const { evolutionApi } = this.config;

    if (!evolutionApi.apiKey) {
      log.info({ to: message.to, text: message.text.substring(0, 80) }, "[DEV] Mensagem não enviada (sem API key)");
      return;
    }

    try {
      await axios.post(
        `${evolutionApi.url}/message/sendText/${evolutionApi.instanceName}`,
        {
          number: message.to,
          options: {
            delay: message.delay ?? 1200,
            presence: "composing",
          },
          textMessage: {
            text: message.text,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            apikey: evolutionApi.apiKey,
          },
          timeout: 15000,
        }
      );
    } catch (error) {
      log.error({ error, to: message.to }, "Falha ao enviar mensagem via Evolution API");
      throw error;
    }
  }

  /**
   * Registra handler para processar mensagens recebidas
   */
  onMessage(handler: (message: IncomingMessage) => Promise<void>): void {
    this.messageHandler = handler;
  }

  /**
   * Registra o endpoint Express para receber webhooks da Evolution API
   * Deve ser chamado com o router Express da aplicação
   */
  registerWebhookRoute(app: express.Application): void {
    app.post("/webhook/messages", express.json({ limit: "10mb" }), async (req: Request, res: Response) => {
      // Responde imediatamente para não deixar a Evolution API esperando
      res.status(200).json({ received: true });

      try {
        await this.processWebhook(req.body);
      } catch (error) {
        log.error({ error }, "Erro ao processar webhook da Evolution API");
      }
    });

    log.info("Endpoint /webhook/messages registrado");
  }

  /**
   * Processa payload do webhook da Evolution API
   */
  private async processWebhook(payload: unknown): Promise<void> {
    if (!this.messageHandler) {
      log.warn("Mensagem recebida mas nenhum handler registrado");
      return;
    }

    const p = payload as Record<string, unknown>;

    // Ignora eventos que não são mensagens de texto/localização
    if (p.event !== "messages.upsert") return;

    const data = p.data as Record<string, unknown>;
    if (!data) return;

    // Ignora mensagens enviadas pelo bot
    if (data.key && (data.key as Record<string, unknown>).fromMe) return;

    // Ignora mensagens de grupos
    const remoteJid = ((data.key as Record<string, unknown>)?.remoteJid as string) ?? "";
    if (remoteJid.includes("@g.us")) return;

    // Extrai número do remetente (remove @s.whatsapp.net)
    const from = remoteJid.replace("@s.whatsapp.net", "");
    if (!from) return;

    const messageData = data.message as Record<string, unknown>;
    if (!messageData) return;

    // Normaliza para IncomingMessage
    const normalized = this.normalizeMessage(
      from,
      (data.key as Record<string, unknown>).id as string,
      (data.messageTimestamp as number) ?? Date.now() / 1000,
      messageData,
      (data.pushName as string) ?? undefined
    );

    if (normalized) {
      await this.messageHandler(normalized);
    }
  }

  /**
   * Normaliza o payload da Evolution API para IncomingMessage padrão
   */
  private normalizeMessage(
    from: string,
    messageId: string,
    timestamp: number,
    messageData: Record<string, unknown>,
    contactName?: string
  ): IncomingMessage | null {
    // Mensagem de texto
    if (messageData.conversation) {
      return {
        from,
        type: "text",
        text: messageData.conversation as string,
        messageId,
        timestamp,
        contactName,
      };
    }

    // Mensagem de texto com mídia
    if (messageData.extendedTextMessage) {
      const ext = messageData.extendedTextMessage as Record<string, unknown>;
      return {
        from,
        type: "text",
        text: ext.text as string,
        messageId,
        timestamp,
        contactName,
      };
    }

    // Localização GPS
    if (messageData.locationMessage) {
      const loc = messageData.locationMessage as Record<string, unknown>;
      return {
        from,
        type: "location",
        location: {
          latitude: loc.degreesLatitude as number,
          longitude: loc.degreesLongitude as number,
          name: loc.name as string | undefined,
          address: loc.address as string | undefined,
        },
        messageId,
        timestamp,
        contactName,
      };
    }

    // Outros tipos de mensagem (áudio, imagem, etc.)
    const type = Object.keys(messageData)[0]?.replace("Message", "") as IncomingMessage["type"];
    if (type) {
      return {
        from,
        type: type as IncomingMessage["type"],
        messageId,
        timestamp,
        contactName,
        metadata: { raw: messageData },
      };
    }

    return null;
  }
}

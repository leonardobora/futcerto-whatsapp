// =============================================================================
// index.ts - Ponto de entrada principal do FutCerto v2.0
// =============================================================================

import express from "express";
import { getConfig } from "./config";
import { logger } from "./utils/logger";
import { handleMessage } from "./agents/router";
import { EvolutionApiAdapter } from "./channels/evolution-api";
import { OpenClawAdapter } from "./channels/openclaw";
import type { IncomingMessage, UserContext } from "./channels/types";

const config = getConfig();
const app = express();

// Middleware básico
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "futcerto-whatsapp",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    environment: config.app.nodeEnv,
  });
});

// Inicializa adaptadores de canal
const evolutionAdapter = new EvolutionApiAdapter();
const openclawAdapter = new OpenClawAdapter();

/**
 * Handler principal de mensagens — processa e responde
 */
async function processMessage(message: IncomingMessage): Promise<void> {
  const context: UserContext = {
    phoneNumber: message.from,
    contactName: message.contactName,
    role: "unknown",
  };

  try {
    logger.info({
      from: message.from.replace(/(\d{4})\d+(\d{4})/, "$1****$2"),
      type: message.type,
    }, "Mensagem recebida");

    const result = await handleMessage(message, context);

    if (result.response) {
      await evolutionAdapter.sendMessage({
        to: message.from,
        text: result.response,
        delay: 1200,
      });
    }
  } catch (error) {
    logger.error({ error, from: message.from }, "Erro ao processar mensagem");

    // Envia mensagem de erro amigável ao usuário
    try {
      await evolutionAdapter.sendMessage({
        to: message.from,
        text: "Desculpe, tive um problema técnico. Tente novamente em instantes. 🙏",
      });
    } catch {}
  }
}

// Registra handlers de mensagem
evolutionAdapter.onMessage(processMessage);
openclawAdapter.onMessage(processMessage);

// Registra rotas dos canais
evolutionAdapter.registerWebhookRoute(app);
openclawAdapter.registerRoutes(app);

// Inicia servidor
async function start() {
  try {
    logger.info("Iniciando FutCerto v2.0...");

    // Inicializa Evolution API (cria instância se necessário)
    await evolutionAdapter.initialize();

    app.listen(config.app.port, () => {
      logger.info({
        port: config.app.port,
        env: config.app.nodeEnv,
      }, `FutCerto v2.0 rodando na porta ${config.app.port}`);

      logger.info("Endpoints disponíveis:");
      logger.info(`  GET  /health`);
      logger.info(`  POST /webhook/messages (Evolution API)`);
      logger.info(`  POST /openclaw/skill (OpenClaw)`);
      logger.info(`  POST /openclaw/message (OpenClaw)`);
    });
  } catch (error) {
    logger.fatal({ error }, "Falha ao iniciar o servidor");
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM recebido — encerrando servidor...");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT recebido — encerrando servidor...");
  process.exit(0);
});

start();

// =============================================================================
// logger.ts - Logger estruturado com Pino
// FutCerto v2.0
// =============================================================================

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  // Pretty printing em desenvolvimento
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "dd/mm/yyyy HH:MM:ss",
          ignore: "pid,hostname",
          messageFormat: "[FutCerto] {msg}",
        },
      }
    : undefined,
  // Campos padrão em todos os logs
  base: {
    app: "futcerto-whatsapp",
    version: "2.0.0",
  },
  // Redaction de dados sensíveis
  redact: {
    paths: [
      "openai_api_key",
      "supabase_key",
      "*.password",
      "*.token",
      "*.apiKey",
    ],
    censor: "[REDACTED]",
  },
  // Serializers customizados
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

// Logger filho para cada módulo
export function createModuleLogger(module: string) {
  return logger.child({ module });
}

// Logger filho para cada interação de usuário
export function createUserLogger(phoneNumber: string, agentType: string) {
  // Mascara número para privacidade nos logs
  const maskedPhone = phoneNumber.replace(/(\d{4})\d+(\d{4})/, "$1****$2");
  return logger.child({
    user: maskedPhone,
    agent: agentType,
  });
}

export default logger;

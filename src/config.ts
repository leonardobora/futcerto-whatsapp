// =============================================================================
// config.ts - Carregador de configuração de ambiente
// FutCerto v2.0
// =============================================================================

import dotenv from "dotenv";
import { z } from "zod";

// Carrega variáveis do arquivo .env
dotenv.config();

// Schema de validação com Zod
const configSchema = z.object({
  // Supabase
  supabase: z.object({
    url: z.string().url("SUPABASE_URL deve ser uma URL válida"),
    anonKey: z.string().min(1, "SUPABASE_ANON_KEY é obrigatória"),
    serviceKey: z.string().min(1, "SUPABASE_SERVICE_KEY é obrigatória"),
  }),

  // OpenAI
  openai: z.object({
    apiKey: z.string().min(1, "OPENAI_API_KEY é obrigatória"),
    model: z.string().default("gpt-4-turbo"),
    temperature: z.number().min(0).max(2).default(0.5),
  }),

  // Mapbox (opcional em dev)
  mapbox: z.object({
    apiKey: z.string().optional(),
  }),

  // Evolution API (opcional se usar outro canal)
  evolutionApi: z.object({
    url: z.string().default("http://localhost:8080"),
    apiKey: z.string().optional(),
    instanceName: z.string().default("futcerto"),
  }),

  // Tyxter Studio (opcional se usar outro canal)
  tyxter: z.object({
    apiKey: z.string().optional(),
    webhookSecret: z.string().optional(),
  }),

  // App
  app: z.object({
    port: z.number().default(3000),
    nodeEnv: z.enum(["development", "production", "test"]).default("development"),
    logLevel: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
  }),

  // Regras de negócio
  business: z.object({
    city: z.string().default("Curitiba"),
    maxDistanceKm: z.number().default(10),
    bookingCancelHours: z.number().default(4),
    reminderHoursBefore: z.number().default(2),
    bookingAutoCancelMinutes: z.number().default(60),
  }),
});

export type Config = z.infer<typeof configSchema>;

// Converte variáveis de ambiente em objeto tipado
function loadConfig(): Config {
  const raw = {
    supabase: {
      url: process.env.SUPABASE_URL ?? "",
      anonKey: process.env.SUPABASE_ANON_KEY ?? "",
      serviceKey: process.env.SUPABASE_SERVICE_KEY ?? "",
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY ?? "",
      model: process.env.AI_MODEL ?? "gpt-4-turbo",
      temperature: parseFloat(process.env.AI_TEMPERATURE ?? "0.5"),
    },
    mapbox: {
      apiKey: process.env.MAPBOX_API_KEY,
    },
    evolutionApi: {
      url: process.env.EVOLUTION_API_URL ?? "http://localhost:8080",
      apiKey: process.env.EVOLUTION_API_KEY,
      instanceName: process.env.EVOLUTION_INSTANCE_NAME ?? "futcerto",
    },
    tyxter: {
      apiKey: process.env.TYXTER_API_KEY,
      webhookSecret: process.env.TYXTER_WEBHOOK_SECRET,
    },
    app: {
      port: parseInt(process.env.APP_PORT ?? "3000"),
      nodeEnv: (process.env.NODE_ENV ?? "development") as "development" | "production" | "test",
      logLevel: (process.env.LOG_LEVEL ?? "info") as "trace" | "debug" | "info" | "warn" | "error",
    },
    business: {
      city: process.env.DEFAULT_CITY ?? "Curitiba",
      maxDistanceKm: parseInt(process.env.DEFAULT_MAX_DISTANCE_KM ?? "10"),
      bookingCancelHours: parseInt(process.env.BOOKING_CANCEL_HOURS ?? "4"),
      reminderHoursBefore: parseInt(process.env.REMINDER_HOURS_BEFORE ?? "2"),
      bookingAutoCancelMinutes: parseInt(process.env.BOOKING_AUTO_CANCEL_MINUTES ?? "60"),
    },
  };

  const result = configSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.errors
      .map(e => `  ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Configuração inválida:\n${errors}`);
  }

  return result.data;
}

// Singleton de configuração
let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

// Para testes — permite resetar a configuração
export function resetConfig(): void {
  _config = null;
}

export default getConfig();

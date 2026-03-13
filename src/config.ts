import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const ConfigSchema = z.object({
  // Supabase
  supabase: z.object({
    url: z.string().url(),
    anonKey: z.string().min(1),
    serviceKey: z.string().min(1),
  }),

  // OpenAI
  ai: z.object({
    apiKey: z.string().min(1),
    model: z.string().default('gpt-4-turbo'),
    temperature: z.number().min(0).max(2).default(0.5),
  }),

  // Mapbox
  mapbox: z.object({
    apiKey: z.string().optional(),
  }),

  // WhatsApp Channels
  channels: z.object({
    evolution: z.object({
      apiUrl: z.string().url().optional(),
      apiKey: z.string().optional(),
      instanceName: z.string().optional(),
    }),
    openclaw: z.object({
      apiKey: z.string().optional(),
      webhookSecret: z.string().optional(),
    }),
    tyxter: z.object({
      apiKey: z.string().optional(),
      webhookSecret: z.string().optional(),
    }),
  }),

  // App
  app: z.object({
    port: z.number().default(3000),
    nodeEnv: z.enum(['development', 'staging', 'production']).default('development'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),

  // Business Rules
  business: z.object({
    maxBookingDaysAhead: z.number().default(30),
    cancelamentoHorasMinimo: z.number().default(2),
    comissaoPercentual: z.number().default(10),
  }),
})

export type Config = z.infer<typeof ConfigSchema>

export const config = ConfigSchema.parse({
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  ai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL,
    temperature: process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : undefined,
  },
  mapbox: {
    apiKey: process.env.MAPBOX_API_KEY,
  },
  channels: {
    evolution: {
      apiUrl: process.env.EVOLUTION_API_URL,
      apiKey: process.env.EVOLUTION_API_KEY,
      instanceName: process.env.EVOLUTION_INSTANCE_NAME,
    },
    openclaw: {
      apiKey: process.env.OPENCLAW_API_KEY,
      webhookSecret: process.env.OPENCLAW_WEBHOOK_SECRET,
    },
    tyxter: {
      apiKey: process.env.TYXTER_API_KEY,
      webhookSecret: process.env.TYXTER_WEBHOOK_SECRET,
    },
  },
  app: {
    port: process.env.APP_PORT ? parseInt(process.env.APP_PORT) : undefined,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
  },
  business: {
    maxBookingDaysAhead: process.env.MAX_BOOKING_DAYS_AHEAD ? parseInt(process.env.MAX_BOOKING_DAYS_AHEAD) : undefined,
    cancelamentoHorasMinimo: process.env.CANCELAMENTO_HORAS_MINIMO ? parseInt(process.env.CANCELAMENTO_HORAS_MINIMO) : undefined,
    comissaoPercentual: process.env.COMISSAO_PERCENTUAL ? parseFloat(process.env.COMISSAO_PERCENTUAL) : undefined,
  },
})

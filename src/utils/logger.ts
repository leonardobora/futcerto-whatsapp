/**
 * Logger simples para o FutCerto
 * Em produção, substituir por Winston ou Pino
 */

import { config } from '../config'

const levels = { debug: 0, info: 1, warn: 2, error: 3 }
const currentLevel = levels[config.app.logLevel] ?? 1

function log(level: keyof typeof levels, message: string, data?: unknown): void {
  if (levels[level] < currentLevel) return

  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`

  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2))
  } else {
    console.log(`${prefix} ${message}`)
  }
}

export const logger = {
  debug: (msg: string, data?: unknown) => log('debug', msg, data),
  info: (msg: string, data?: unknown) => log('info', msg, data),
  warn: (msg: string, data?: unknown) => log('warn', msg, data),
  error: (msg: string, data?: unknown) => log('error', msg, data),
}

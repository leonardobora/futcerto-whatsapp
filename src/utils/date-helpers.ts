/**
 * Utilitários de data e hora para o FutCerto
 * Timezone padrão: America/Sao_Paulo
 */

const TIMEZONE = 'America/Sao_Paulo'

/**
 * Formata uma data ISO para DD/MM/YYYY
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Formata um horário HH:MM:SS para HH:MM
 */
export function formatTime(time: string): string {
  return time.substring(0, 5)
}

/**
 * Converte DD/MM/YYYY para YYYY-MM-DD
 */
export function parseDate(brDate: string): string {
  const [day, month, year] = brDate.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Retorna a data atual no timezone de São Paulo
 */
export function today(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TIMEZONE })
}

/**
 * Retorna o dia da semana em português
 */
export function getDayOfWeek(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  return days[date.getUTCDay()]
}

/**
 * Verifica se uma data está dentro do período de antecipação permitido
 */
export function isWithinBookingWindow(date: string, maxDaysAhead: number): boolean {
  const targetDate = new Date(`${date}T00:00:00`)
  const now = new Date()
  const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= maxDaysAhead
}

/**
 * Calcula quantas horas faltam para uma data/hora
 */
export function hoursUntil(date: string, time: string): number {
  const target = new Date(`${date}T${time}:00`)
  const now = new Date()
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60)
}

/**
 * Formata \"tempo atrás\" para exibição
 * Ex: \"há 5 minutos\", \"há 2 horas\"
 */
export function timeAgo(isoTimestamp: string): string {
  const past = new Date(isoTimestamp)
  const now = new Date()
  const diffMs = now.getTime() - past.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMinutes < 1) return 'agora mesmo'
  if (diffMinutes < 60) return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`
  return `há ${Math.floor(diffHours / 24)} dia${Math.floor(diffHours / 24) > 1 ? 's' : ''}`
}

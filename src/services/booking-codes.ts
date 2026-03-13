/**
 * Gera códigos únicos para reservas no formato FC-XXXX
 * onde XXXX é uma combinação alfanumérica maiúscula
 */
export function generateBookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Remove caracteres ambíguos (0/O, 1/I)
  let code = 'FC-'
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Valida se um código de reserva está no formato correto
 */
export function isValidBookingCode(code: string): boolean {
  return /^FC-[A-Z2-9]{4}$/.test(code)
}

/**
 * Extrai o código de reserva de uma mensagem de texto
 * Suporta formatos: FC-1234, fc-1234, #FC-1234
 */
export function extractBookingCode(text: string): string | null {
  const match = text.match(/#?(FC-[A-Z2-9]{4})/i)
  return match ? match[1].toUpperCase() : null
}

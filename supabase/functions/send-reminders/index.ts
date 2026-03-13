import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Busca reservas confirmadas para amanhã
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, date, start_time, end_time,
      court:courts(name, address),
      player:users(phone, name)
    `)
    .eq('date', tomorrowStr)
    .eq('status', 'confirmed')

  if (!bookings) return new Response('No bookings found')

  // Envia lembretes via WhatsApp (implementação do canal fica no app principal)
  const reminders = bookings.map(booking => ({
    phone: booking.player.phone,
    message: `Lembrete FutCerto! Você tem uma reserva amanhã:\n🏟️ ${booking.court.name}\n📍 ${booking.court.address}\n⏰ ${booking.start_time} - ${booking.end_time}`
  }))

  return new Response(JSON.stringify({ sent: reminders.length, reminders }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

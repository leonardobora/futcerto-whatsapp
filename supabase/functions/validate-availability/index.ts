import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { court_id, date, start_time, end_time } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Verifica conflitos de reserva
  const { data: bookingConflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('court_id', court_id)
    .eq('date', date)
    .eq('status', 'confirmed')
    .or(`start_time.lt.${end_time},end_time.gt.${start_time}`)

  // Verifica bloqueios
  const { data: blockConflicts } = await supabase
    .from('time_blocks')
    .select('id')
    .eq('court_id', court_id)
    .eq('date', date)
    .or(`start_time.lt.${end_time},end_time.gt.${start_time}`)

  const available = (
    (!bookingConflicts || bookingConflicts.length === 0) &&
    (!blockConflicts || blockConflicts.length === 0)
  )

  return new Response(JSON.stringify({ available }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

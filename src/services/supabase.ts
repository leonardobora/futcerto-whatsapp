import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { config } from '../config'

// Singleton do cliente Supabase com service key (acesso total)
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Cliente público com anon key (respeita RLS)
export const supabaseClient: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey
)

/**
 * Busca usuário por telefone. Cria se não existir.
 */
export async function getOrCreateUser(phone: string): Promise<{
  id: string
  phone: string
  name: string | null
  profile: 'jogador' | 'gestor' | 'admin'
}> {
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, phone, name, profile')
    .eq('phone', phone)
    .single()

  if (existing) return existing

  const { data: created, error } = await supabaseAdmin
    .from('users')
    .insert({ phone, profile: 'jogador' })
    .select('id, phone, name, profile')
    .single()

  if (error || !created) throw new Error(`Failed to create user for phone ${phone}`)

  return created
}

/**
 * Salva mensagem no histórico de conversações
 */
export async function saveConversationMessage(params: {
  user_id: string
  session_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_name?: string
  tool_result?: object
}): Promise<void> {
  await supabaseAdmin.from('conversation_history').insert(params)
}

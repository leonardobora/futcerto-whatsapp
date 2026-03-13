import { createClient } from '@supabase/supabase-js'
import { config } from '../config'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export const blockTimeslotTool = {
  type: 'function' as const,
  function: {
    name: 'block_timeslot',
    description: 'Bloqueia um horário na quadra para manutenção ou outro motivo. Não cancela reservas já confirmadas.',
    parameters: {
      type: 'object',
      properties: {
        court_id: {
          type: 'string',
          description: 'ID da quadra',
        },
        gestor_phone: {
          type: 'string',
          description: 'Telefone do gestor (para verificação de permissão)',
        },
        date: {
          type: 'string',
          description: 'Data do bloqueio (YYYY-MM-DD)',
        },
        start_time: {
          type: 'string',
          description: 'Hora de início (HH:MM)',
        },
        end_time: {
          type: 'string',
          description: 'Hora de término (HH:MM)',
        },
        reason: {
          type: 'string',
          description: 'Motivo do bloqueio (opcional)',
        },
      },
      required: ['court_id', 'gestor_phone', 'date', 'start_time', 'end_time'],
    },
  },
}

export async function blockTimeslot(args: {
  court_id: string
  gestor_phone: string
  date: string
  start_time: string
  end_time: string
  reason?: string
}): Promise<{ success: boolean; message: string }> {
  const { court_id, gestor_phone, date, start_time, end_time, reason } = args

  // Verifica se o gestor é dono da quadra
  const { data: court } = await supabase
    .from('courts')
    .select('id, name, owner:users!courts_owner_id_fkey(phone)')
    .eq('id', court_id)
    .single()

  if (!court || court.owner.phone !== gestor_phone) {
    return { success: false, message: 'Você não tem permissão para bloquear horários nesta quadra.' }
  }

  // Verifica se já existe bloqueio no horário
  const { data: existingBlock } = await supabase
    .from('time_blocks')
    .select('id')
    .eq('court_id', court_id)
    .eq('date', date)
    .eq('start_time', start_time)
    .single()

  if (existingBlock) {
    return { success: false, message: `Já existe um bloqueio para ${date} às ${start_time}.` }
  }

  // Cria o bloqueio
  const { error } = await supabase
    .from('time_blocks')
    .insert({
      court_id,
      date,
      start_time,
      end_time,
      reason: reason || 'Bloqueio pelo gestor',
      created_by: court.id,
    })

  if (error) {
    return { success: false, message: 'Erro ao criar bloqueio. Tente novamente.' }
  }

  return {
    success: true,
    message: `Horário bloqueado: ${date} das ${start_time} às ${end_time}. Motivo: ${reason || 'Não informado'}.`,
  }
}

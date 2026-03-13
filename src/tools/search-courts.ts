import { createClient } from '@supabase/supabase-js'
import { config } from '../config'
import { calculateDistance } from '../services/geolocation'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

export const searchCourtsTool = {
  type: 'function' as const,
  function: {
    name: 'search_courts',
    description: 'Busca quadras disponíveis por modalidade, cidade ou coordenadas geográficas',
    parameters: {
      type: 'object',
      properties: {
        sport: {
          type: 'string',
          enum: ['futebol', 'society', 'futsal', 'beach_soccer', 'outros'],
          description: 'Modalidade esportiva',
        },
        city: {
          type: 'string',
          description: 'Cidade (opcional)',
        },
        lat: {
          type: 'number',
          description: 'Latitude do usuário (opcional, para ordenar por distância)',
        },
        lng: {
          type: 'number',
          description: 'Longitude do usuário (opcional)',
        },
        date: {
          type: 'string',
          description: 'Data desejada para verificar disponibilidade (YYYY-MM-DD)',
        },
        start_time: {
          type: 'string',
          description: 'Horário de início desejado (HH:MM)',
        },
        end_time: {
          type: 'string',
          description: 'Horário de término desejado (HH:MM)',
        },
        max_price: {
          type: 'number',
          description: 'Preço máximo por hora (opcional)',
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados (padrão: 5)',
        },
      },
      required: ['sport'],
    },
  },
}

export async function searchCourts(args: {
  sport: string
  city?: string
  lat?: number
  lng?: number
  date?: string
  start_time?: string
  end_time?: string
  max_price?: number
  limit?: number
}): Promise<object[]> {
  const { sport, city, lat, lng, date, start_time, end_time, max_price, limit = 5 } = args

  let query = supabase
    .from('courts')
    .select('id, name, sport, address, city, lat, lng, price_per_hour, amenities')
    .eq('active', true)

  if (sport !== 'outros') {
    query = query.eq('sport', sport)
  }

  if (city) {
    query = query.ilike('city', `%${city}%`)
  }

  if (max_price) {
    query = query.lte('price_per_hour', max_price)
  }

  const { data: courts } = await query.limit(20) // Busca mais para filtrar e ordenar

  if (!courts) return []

  // Filtra por disponibilidade se data/hora fornecidos
  let availableCourts = courts
  if (date && start_time && end_time) {
    const courtIds = courts.map(c => c.id)
    const { data: unavailable } = await supabase
      .from('bookings')
      .select('court_id')
      .in('court_id', courtIds)
      .eq('date', date)
      .in('status', ['pending', 'confirmed'])
      .or(`start_time.lt.${end_time},end_time.gt.${start_time}`)

    const unavailableIds = new Set((unavailable || []).map(b => b.court_id))
    availableCourts = courts.filter(c => !unavailableIds.has(c.id))
  }

  // Ordena por distância se coordenadas fornecidas
  if (lat && lng) {
    availableCourts.sort((a, b) => {
      const distA = a.lat && a.lng ? calculateDistance(lat, lng, a.lat, a.lng) : 9999
      const distB = b.lat && b.lng ? calculateDistance(lat, lng, b.lat, b.lng) : 9999
      return distA - distB
    })
  }

  return availableCourts.slice(0, limit)
}

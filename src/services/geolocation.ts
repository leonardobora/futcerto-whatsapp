/**
 * Serviço de geolocalização usando Mapbox Geocoding API
 */

import axios from 'axios'
import { config } from '../config'

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * Retorna a distância em quilômetros
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Raio da Terra em km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Geocodifica um endereço para coordenadas lat/lng usando Mapbox
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!config.mapbox.apiKey) {
    console.warn('Mapbox API key não configurada')
    return null
  }

  try {
    const encoded = encodeURIComponent(`${address}, Brasil`)
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${config.mapbox.apiKey}&country=BR&limit=1`
    const { data } = await axios.get(url)

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center
      return { lat, lng }
    }

    return null
  } catch (error) {
    console.error('Erro na geocodificação:', error)
    return null
  }
}

/**
 * Obtém o endereço a partir de coordenadas (geocodificação reversa)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!config.mapbox.apiKey) return null

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${config.mapbox.apiKey}&country=BR&limit=1`
    const { data } = await axios.get(url)

    if (data.features && data.features.length > 0) {
      return data.features[0].place_name
    }
    return null
  } catch {
    return null
  }
}

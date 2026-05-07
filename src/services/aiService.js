/**
 * aiService.js - Servicio de Inteligencia Artificial
 * Implementa estrategia Offline-First y Self-hosted (Llama 3) para datos sensibles.
 * @module services/aiService
 */

import { logger } from '@/utils/logger'
import { IndexedDBStorage } from '@/utils/indexedDBStorage'

const AI_CACHE_DB = new IndexedDBStorage('aiResponsesDB', 'responses')

/**
 * Configuración del servicio
 */
const config = {
  // Endpoint para modelo self-hosted (Llama 3)
  localEndpoint: import.meta.env.VITE_AI_LOCAL_ENDPOINT || 'http://localhost:11434/api/generate',
  // Endpoint para fallback (OpenAI, etc.) - Solo datos NO sensibles
  cloudEndpoint: import.meta.env.VITE_AI_CLOUD_ENDPOINT || '',
  model: 'llama3',
  cacheTTL: 1000 * 60 * 60 * 24 // 24 horas
}

/**
 * Genera una respuesta de IA basada en el contexto agrícola
 * @param {string} prompt - Prompt para la IA
 * @param {Object} context - Contexto agrícola (siembra, actividades, zonas)
 * @param {boolean} [sensitive=true] - Si los datos son sensibles (usa local)
 * @returns {Promise<string>} Respuesta de la IA
 */
export async function generateAIResponse(prompt, context = {}, sensitive = true) {
  const cacheKey = `ai_${btoa(prompt).substring(0, 50)}`

  // 1. Intentar cache offline primero
  try {
    const cached = await AI_CACHE_DB.getItem(cacheKey)
    if (cached && Date.now() - cached.timestamp < config.cacheTTL) {
      logger.info('[AIService] Respuesta desde cache offline')
      return cached.response
    }
  } catch (e) {
    logger.warn('[AIService] Error leyendo cache:', e)
  }

  // 2. Determinar endpoint y si hay BYOK
  let openRouterKey = null
  try {
    const { useHaciendaStore } = await import('@/stores/haciendaStore')
    const haciendaStore = useHaciendaStore()
    openRouterKey = haciendaStore.mi_hacienda?.openrouter_key
  } catch (e) {
    logger.warn('[AIService] No se pudo obtener haciendaStore para BYOK')
  }

  let endpoint = config.localEndpoint
  let headers = { 'Content-Type': 'application/json' }
  let requestBody = {
    model: config.model,
    prompt: `${buildSystemPrompt(context)}\n\nUser: ${prompt}`,
    stream: false
  }

  if (openRouterKey) {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions'
    headers['Authorization'] = `Bearer ${openRouterKey}`
    headers['HTTP-Referer'] = window.location.origin
    headers['X-Title'] = 'Sistema Agri'

    requestBody = {
      model: 'meta-llama/llama-3-8b-instruct:free',
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        { role: 'user', content: prompt }
      ]
    }
  } else {
    endpoint = (sensitive || !config.cloudEndpoint)
      ? config.localEndpoint
      : config.cloudEndpoint

    if (!endpoint) {
      throw new Error('No hay endpoint de IA configurado')
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) throw new Error(`Error IA: ${response.statusText}`)

    const data = await response.json()
    const aiText = data.response || data.choices?.[0]?.message?.content || ''

    // 3. GUARDAR en cache
    await AI_CACHE_DB.setItem(cacheKey, {
      response: aiText,
      timestamp: Date.now()
    })

    return aiText
  } catch (error) {
    logger.error('[AIService] Error generando respuesta:', error)
    throw error
  }
}

/**
 * Construye el system prompt con contexto agrícola
 */
function buildSystemPrompt(context) {
  return `Eres un asistente experto en agronomía para el "Sistema Agri". 
Analiza la siguiente información y proporciona recomendaciones técnicas.
Contexto: ${JSON.stringify(context)}`
}

/**
 * Autocompleta una bitácora basada en entradas informales
 */
export async function autocompleteBitacora(informalInput, metricasConfig) {
  const prompt = `Convierte esta entrada informal en datos estructurados para bitácora: "${informalInput}". 
  Usa este formato de métricas: ${JSON.stringify(metricasConfig)}`

  return generateAIResponse(prompt, {}, false) // No sensible, puede usar nube
}

/**
 * Sugiere calendario de actividades
 */
export async function suggestActivityCalendar(siembraContext, weatherForecast) {
  const prompt = `Sugiere un calendario óptimo de actividades para esta siembra: ${JSON.stringify(siembraContext)} 
  considerando el clima: ${weatherForecast}`

  return generateAIResponse(prompt, siembraContext, true) // Sensible, usa local
}

/**
 * Prueba la conexión con OpenRouter
 */
export async function testConnection(apiKey) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })
    return response.ok
  } catch (error) {
    return false
  }
}

export const aiService = {
  generateAIResponse,
  autocompleteBitacora,
  suggestActivityCalendar,
  testConnection
}

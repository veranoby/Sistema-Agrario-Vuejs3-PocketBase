import { logger } from '@/utils/logger'
import { IndexedDBStorage } from '@/utils/indexedDBStorage'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAiUsageStore } from '@/stores/aiUsageStore'

const AI_CACHE_DB = new IndexedDBStorage('aiResponsesDB', 'responses')

const config = {
  localEndpoint: import.meta.env.VITE_AI_LOCAL_ENDPOINT || 'http://localhost:11434/api/generate',
  cloudEndpoint: import.meta.env.VITE_AI_CLOUD_ENDPOINT || '',
  model: 'llama3',
  cacheTTL: 1000 * 60 * 60 * 24
}

export async function generateAIResponse(prompt, context = {}, sensitive = true) {
  const cacheKey = `ai_${btoa(prompt).substring(0, 50)}`

  try {
    const cached = await AI_CACHE_DB.getItem(cacheKey)
    if (cached && Date.now() - cached.timestamp < config.cacheTTL) {
      logger.info('[AIService] Respuesta desde cache offline')
      return cached.response
    }
  } catch (e) {
    logger.warn('[AIService] Error leyendo cache:', e)
  }

  let openRouterKey = null
  let isUsingGlobalKey = false

  try {
    const { useHaciendaStore } = await import('@/stores/haciendaStore')
    const haciendaStore = useHaciendaStore()
    openRouterKey = haciendaStore.mi_hacienda?.openrouter_key

    if (!openRouterKey) {
      const settingsStore = useSettingsStore()
      await settingsStore.fetchConfig() // Asegurar carga
      openRouterKey = settingsStore.globalOpenRouterKey
      isUsingGlobalKey = true
    }
  } catch (e) {
    logger.warn('[AIService] No se pudo obtener BYOK', e)
  }

  // Rate Limiting para llave global
  if (isUsingGlobalKey) {
    const settingsStore = useSettingsStore()
    const aiUsageStore = useAiUsageStore()
    aiUsageStore.loadFromLocal()

    const limit = settingsStore.aiRateLimit || 5
    const windowMs = settingsStore.aiRateWindow || 3600000

    if (!aiUsageStore.canUseAi(limit, windowMs)) {
      throw new Error(`Has alcanzado el límite de uso gratuito de IA (${limit} peticiones). Por favor, ingresa tu propia API Key en la configuración de la hacienda.`)
    }
    aiUsageStore.incrementUsage(limit, windowMs)
  }

  // Si aún no hay key (ni BYOK ni global), simular
  if (!openRouterKey && !config.cloudEndpoint) {
      const simulatedResponse = simulateAI(prompt, context)
      await AI_CACHE_DB.setItem(cacheKey, { response: simulatedResponse, timestamp: Date.now() })
      return simulatedResponse
  }

  try {
    const headers = { 'Content-Type': 'application/json' }
    if (openRouterKey) {
      headers['Authorization'] = `Bearer ${openRouterKey}`
    }

    const res = await fetch(config.cloudEndpoint || "https://openrouter.ai/api/v1/chat/completions", {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful agricultural assistant." },
          { role: "user", content: `Context: ${JSON.stringify(context)}\n\nPrompt: ${prompt}` }
        ]
      })
    })

    if (!res.ok) throw new Error('API request failed')

    const data = await res.json()
    const responseText = data.choices?.[0]?.message?.content || "No response received"

    await AI_CACHE_DB.setItem(cacheKey, {
      response: responseText,
      timestamp: Date.now()
    })

    return responseText
  } catch (error) {
    logger.error('[AIService] Fallo en API Cloud, usando simulación local', error)
    const fallback = simulateAI(prompt, context)
    return fallback
  }
}

function simulateAI(prompt, context) {
  logger.info('[AIService] Generando respuesta simulada (Offline)')
  return `Basado en el contexto: He analizado tu consulta sobre "${prompt.substring(0, 30)}...".
  Te recomiendo registrar esta actividad en la bitácora y programar un seguimiento para la próxima semana.
  (Esta es una respuesta simulada por seguridad de datos offline).`
}

/**
 * Autocompleta datos de la bitácora basado en un input informal
 */
export async function autocompleteBitacora(informalInput, metricasConfig) {
  const prompt = `Extrae información estructurada del siguiente texto: "${informalInput}". Las métricas esperadas son: ${JSON.stringify(metricasConfig)}. Formato de salida: JSON válido con llaves correspondientes a las métricas.`;
  const response = await generateAIResponse(prompt, { tipo: 'autocomplete' }, true);
  try {
      // Intentar extraer JSON de la respuesta (puede venir con texto adicional)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
      }
      return {};
  } catch (e) {
      logger.error('[AIService] Error parseando respuesta autocompletado', e);
      return {};
  }
}

/**
 * Sugiere un calendario de actividades basado en el cultivo
 */
export async function suggestActivityCalendar(crop, conditions) {
  const prompt = `Genera un calendario sugerido de actividades agrícolas para el cultivo: "${crop}" bajo las condiciones: ${JSON.stringify(conditions)}. Devuelve un arreglo en formato JSON con 'nombre', 'descripcion', y 'dias_desde_inicio'.`;
  const response = await generateAIResponse(prompt, { tipo: 'calendar_suggestion' }, true);
  try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
      }
      return [];
  } catch (e) {
      logger.error('[AIService] Error parseando respuesta de calendario', e);
      return [];
  }
}

// Export object for backwards compatibility with components that import aiService
export const aiService = {
  generateAIResponse,
  autocompleteBitacora,
  suggestActivityCalendar
}

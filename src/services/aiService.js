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

  // ── Llamada al proxy backend seguro ──
  try {
    const { pb } = await import('@/utils/pocketbase')
    const { useHaciendaStore } = await import('@/stores/haciendaStore')
    const haciendaStore = useHaciendaStore()
    const haciendaId = haciendaStore.mi_hacienda?.id

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pb.authStore.token}`
      },
      body: JSON.stringify({ prompt, context, haciendaId })
    })

    if (res.status === 429) {
      const err = await res.json()
      throw new Error(err.error || 'Límite de uso de IA alcanzado')
    }

    if (!res.ok) throw new Error('Error en servicio de IA')

    const data = await res.json()
    const responseText = data.response || 'Sin respuesta'

    await AI_CACHE_DB.setItem(cacheKey, { response: responseText, timestamp: Date.now() })
    return responseText

  } catch (error) {
    logger.error('[AIService] Error en proxy backend, usando simulación', error)
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

/**
 * Prueba la conexión con el proveedor de IA utilizando la configuración especificada.
 */
export async function testConnection(auth_token, provider, base_url, model) {
  try {
    const { pb } = await import('@/utils/pocketbase')
    const res = await fetch('/api/ai/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pb.authStore.token}`
      },
      body: JSON.stringify({ auth_token, provider, base_url, model })
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Error en la prueba de conexión')
    }

    return { success: true }
  } catch (error) {
    logger.error('[AIService] Error en testConnection', error)
    throw error
  }
}

// Export object for backwards compatibility with components that import aiService
export const aiService = {
  generateAIResponse,
  autocompleteBitacora,
  suggestActivityCalendar,
  testConnection
}

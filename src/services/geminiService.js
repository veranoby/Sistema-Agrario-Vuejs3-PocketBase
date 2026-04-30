import { cache } from '@/utils/cacheManager'
import { handleError } from '@/utils/errorHandler'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const MODEL_NAME = 'gemini-1.5-flash'
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`

export const geminiService = {
  /**
   * Obtiene una sugerencia de la IA basada en el contexto de la siembra
   * @param {Object} context - Contexto de la siembra (siembra, actividades, zonas)
   * @returns {Promise<string|null>} Sugerencia de la IA o null si falla
   */
  async getAiSuggestion(context) {
    try {
    // Generar cache key basado en hash del contexto
    const cacheKey = `ai_${this.hashContext(context)}`
    
    // Verificar cache
    const cached = cache.get(cacheKey)
    if (cached) {
      console.log("[GeminiService] Retornando respuesta cacheada")
      return cached
    }
      if (!GEMINI_API_KEY) {
        console.warn('[GeminiService] VITE_GEMINI_API_KEY no configurada.')
        return 'Configuración de IA no disponible. Por favor, configure su API Key de Gemini.'
      }

      const prompt = this.buildPrompt(context)

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Error al obtener sugerencia de la IA')
      }

      const result = await response.json()
      
      if (result.candidates && result.candidates.length > 0) {
        const response = result.candidates[0].content.parts[0].text
        cache.set(cacheKey, response, 300000) // 5 min TTL
        return response
      }
      
      return 'No se pudo generar una sugerencia en este momento.'
    } catch (error) {
      console.error('[GeminiService] Error:', error)
      handleError(error, 'Error obteniendo sugerencia de IA')
      return null
    }
  },

  /**
   * Construye el prompt para Gemini basado en el contexto
   * @param {Object} context - Contexto de la siembra
   * @returns {string} Prompt estructurado
   */
  buildPrompt(context) {
    const { siembra, actividades, zonas } = context
    
    let prompt = `Eres un asistente experto en agronomía para el "Sistema Agri", una plataforma de gestión agrícola de alta precisión.
Analiza la siguiente información de una siembra específica y proporciona recomendaciones técnicas, alertas de posibles problemas y sugerencias de optimización basadas en las Buenas Prácticas Agrícolas (BPA).

INFORMACIÓN GENERAL DE LA SIEMBRA:
- Nombre: ${siembra.nombre || 'N/A'}
- Tipo de Cultivo: ${siembra.tipo || 'N/A'}
- Estado Actual: ${siembra.estado || 'N/A'}
- Área Total Objetivo: ${siembra.area_total || 0} ha
- Fecha de Inicio: ${siembra.fecha_inicio || 'N/A'}
- Información Adicional: ${siembra.info || 'Ninguna'}

ESTADO DE LAS ZONAS REGISTRADAS:
${zonas && zonas.length > 0
  ? zonas.map(z => `- ${z.nombre}: Área ${z.area?.area || 0} ${z.area?.unidad || 'ha'}, Estado BPA: ${z.bpa_estado || 0}%`).join('\n')
  : 'No hay zonas registradas aún.'}

ACTIVIDADES RECIENTES Y MÉTRICAS DE CAMPO:
${actividades && actividades.length > 0
  ? actividades.map(a => {
      const metricasStr = a.metricas ? JSON.stringify(a.metricas) : 'Sin métricas'
      return `- ${a.nombre} (${a.expand?.tipo_actividades?.nombre || 'Tipo N/A'}): Estado BPA ${a.bpa_estado || 0}%, Datos: ${metricasStr}`
    }).join('\n')
  : 'No se han registrado actividades recientes.'}

INSTRUCCIONES DE RESPUESTA:
Proporciona una respuesta profesional, concisa y estructurada en español (Markdown) que incluya:
1. **Análisis de Situación**: Breve resumen del estado de la siembra basado en los datos proporcionados.
2. **Recomendaciones de Manejo**: Acciones específicas para mejorar el cultivo o corregir desviaciones.
3. **Alertas de Cumplimiento**: Si hay niveles bajos de BPA o áreas que requieren atención inmediata.
4. **Optimización**: Sugerencias para maximizar el rendimiento basadas en las métricas actuales.

IMPORTANTE:
- Tus sugerencias deben basarse en estándares agrícolas generales y promedios históricos.
- Mantén un tono profesional, técnico pero accesible para un administrador de hacienda.
- Al final de tu respuesta, DEBES incluir obligatoriamente el siguiente aviso legal: "**Sugerencia basada en promedios; valide con un técnico agrícola calificado antes de tomar decisiones críticas.**"`

    return prompt
  },

  /**
   * Genera un hash simple del contexto para cache
   * @param {Object} context - Contexto a hashear
   * @returns {string} Hash del contexto
   */
  hashContext(context) {
    const str = JSON.stringify(context)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(16)
  }
}

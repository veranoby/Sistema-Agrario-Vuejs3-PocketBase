import { logger } from '@/utils/logger'

/**
 * Tipos de alertas disponibles en el sistema
 */
export const alertTypes = {
  ACTIVIDAD_CRITICA: 'actividad_critica',
  BPA_VENCIDO: 'bpa_vencido',
  RECORDATORIO: 'recordatorio',
  ACTIVIDAD_ASIGNADA: 'actividad_asignada',
  ZONA_REQUIERE_ATENCION: 'zona_atencion'
}

/**
 * Configuración de preferencias de alertas por hacienda
 */
export const alertFrequencies = {
  IMMEDIATE: 'immediate',
  HOURLY: 'hourly',
  DAILY: 'daily'
}

/**
 * Envía una alerta por email usando el backend endpoint que integra con Resend
 * @param {Object} params - Parámetros de la alerta
 * @param {string} params.type - Tipo de alerta (ver alertTypes)
 * @param {string[]} params.recipients - Lista de emails destinatarios
 * @param {Object} params.data - Datos específicos de la alerta
 * @param {string} params.hacienda - ID de la hacienda
 * @returns {Promise<Object>} Resultado del envío
 */
export async function sendAlert(params) {
  const { type, recipients, data, hacienda } = params

  try {
    // Llamar a backend endpoint que usa Resend
    const response = await fetch('/api/alerts/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ type, recipients, data, hacienda })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    logger.info('[ALERT] Enviada exitosamente', { type, to: recipients.length })
    return result
  } catch (error) {
    logger.error('[ALERT] Error enviando alerta', error)
    throw error
  }
}

/**
 * Configura las preferencias de alertas para una hacienda
 * @param {string} haciendaId - ID de la hacienda
 * @param {Object} preferences - Preferencias de configuración
 * @param {string[]} preferences.enabledTypes - Tipos de alerta habilitados
 * @param {string[]} preferences.recipients - Lista de emails destinatarios
 * @param {string} preferences.frequency - Frecuencia de envío
 * @returns {Promise<Object>} Resultado de la configuración
 */
export async function configureAlertPreferences(haciendaId, preferences) {
  const { enabledTypes, recipients, frequency } = preferences

  try {
    const response = await fetch(`/api/haciendas/${haciendaId}/alerts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ enabledTypes, recipients, frequency })
    })

    return await response.json()
  } catch (error) {
    logger.error('[ALERT] Error configurando preferencias', error)
    throw error
  }
}

/**
 * Obtiene las preferencias de alertas actuales para una hacienda
 * @param {string} haciendaId - ID de la hacienda
 * @returns {Promise<Object>} Preferencias actuales
 */
export async function getAlertPreferences(haciendaId) {
  try {
    const response = await fetch(`/api/haciendas/${haciendaId}/alerts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    logger.error('[ALERT] Error obteniendo preferencias', error)
    throw error
  }
}

/**
 * Valida una lista de emails
 * @param {string[]} emails - Lista de emails a validar
 * @returns {Object} { valid: string[], invalid: string[] }
 */
export function validateEmails(emails) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const valid = []
  const invalid = []

  emails.forEach(email => {
    const trimmedEmail = email.trim()
    if (emailRegex.test(trimmedEmail)) {
      valid.push(trimmedEmail)
    } else {
      invalid.push(trimmedEmail)
    }
  })

  return { valid, invalid }
}

/**
 * Formatea una lista de emails para mostrar
 * @param {string[]} emails - Lista de emails
 * @returns {string} Emails formateados
 */
export function formatEmailList(emails) {
  if (!emails || emails.length === 0) return ''
  if (emails.length === 1) return emails[0]
  if (emails.length === 2) return emails.join(' y ')
  return `${emails.slice(0, 2).join(', ')} y ${emails.length - 2} más`
}

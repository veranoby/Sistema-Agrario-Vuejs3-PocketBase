import { emailService } from '@/services/emailService'
import { logger } from '@/utils/logger'
import { pb } from '@/utils/pocketbase'

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
 * Envía una alerta por email usando emailService
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
    const html = buildAlertTemplate(type, data)
    const subject = getAlertSubject(type)

    const result = await emailService.sendEmail({
      to: recipients,
      subject,
      html,
      metadata: { type, hacienda, isAlert: true }
    })

    logger.info('[ALERT] Enviada exitosamente', { type, to: recipients.length })
    return result
  } catch (error) {
    logger.error('[ALERT] Error enviando alerta', error)
    throw error
  }
}

function getAlertSubject(type) {
  const subjects = {
    actividad_critica: '⚠ Actividad Crítica Requiere Atención',
    bpa_vencido: '🔴 Certificación BPA Vencida',
    recordatorio: '📋 Recordatorio de Actividad',
    actividad_asignada: '✅ Nueva Actividad Asignada',
    zona_atencion: '🗺 Zona Requiere Atención'
  }
  return subjects[type] || 'Notificación del Sistema'
}

function buildAlertTemplate(type, data) {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3>${getAlertSubject(type)}</h3>
      <p><strong>Tipo:</strong> ${type}</p>
      <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
      <pre>${JSON.stringify(data, null, 2)}</pre>
      <hr style="border: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666;">
        Este email fue generado automáticamente por ConAgri.
      </p>
    </div>
  `
}

export async function configureAlertPreferences(haciendaId, preferences) {
  try {
    const record = await pb.collection('Haciendas').update(haciendaId, {
      alertConfig: preferences
    })
    return record.alertConfig || {}
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
    const record = await pb.collection('Haciendas').getOne(haciendaId)
    return record.alertConfig || { enabledTypes: [], recipients: [], frequency: 'immediate' }
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

export const emailAlertService = {
  sendAlert,
  configureAlertPreferences,
  getAlertPreferences,
  validateEmails,
  formatEmailList,
  alertTypes,
  alertFrequencies
}

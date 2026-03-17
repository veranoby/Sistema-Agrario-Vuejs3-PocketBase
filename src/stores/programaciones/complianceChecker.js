/**
 * complianceChecker.js
 * BPA (Buenas Prácticas Agrícolas) compliance checking for programaciones
 * @module programaciones/complianceChecker
 */

import { logger } from '@/utils/logger'
import { differenceInDays } from 'date-fns'

/**
 * Compliance states enumeration
 */
export const COMPLIANCE_STATES = {
  REGISTRADO: 'REGISTRADO',     // Registered in bitacora
  PENDIENTE: 'PENDIENTE',       // Due today
  VENCIDO: 'VENCIDO',           // Overdue by 1-2 days
  ACUMULADO: 'ACUMULADO',       // Overdue by 3+ days (compliance risk)
  PROGRAMADO: 'PROGRAMADO'      // Scheduled for future
}

/**
 * Compliance color mapping for UI
 */
export const COMPLIANCE_COLORS = {
  [COMPLIANCE_STATES.REGISTRADO]: 'success',
  [COMPLIANCE_STATES.PENDIENTE]: 'warning',
  [COMPLIANCE_STATES.ACUMULADO]: 'error',
  [COMPLIANCE_STATES.PROGRAMADO]: 'info',
  [COMPLIANCE_STATES.VENCIDO]: 'orange'
}

/**
 * Compliance icon mapping for UI
 */
export const COMPLIANCE_ICONS = {
  [COMPLIANCE_STATES.REGISTRADO]: 'mdi-check-circle',
  [COMPLIANCE_STATES.PENDIENTE]: 'mdi-clock-alert-outline',
  [COMPLIANCE_STATES.ACUMULADO]: 'mdi-alert-circle',
  [COMPLIANCE_STATES.PROGRAMADO]: 'mdi-calendar-clock',
  [COMPLIANCE_STATES.VENCIDO]: 'mdi-alert-outline'
}

/**
 * Gets compliance state for a programacion
 * @param {Object} programacion - Programacion object
 * @param {Function} hasBitacoraEntryForSiembra - Function to check bitacora entries
 * @param {string|null} siembraId - Siembra ID for context isolation
 * @returns {string} Compliance state from COMPLIANCE_STATES
 */
export function getComplianceState(programacion, hasBitacoraEntryForSiembra, siembraId = null) {
  try {
    if (!programacion) return COMPLIANCE_STATES.PROGRAMADO

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Use proxima_ejecucion instead of fecha_programada
    const fechaProgramada = programacion.proxima_ejecucion
      ? new Date(programacion.proxima_ejecucion)
      : new Date()
    fechaProgramada.setHours(0, 0, 0, 0)

    // Check if there's a bitacora entry for this programacion with siembra context
    const hasBitacoraEntry = hasBitacoraEntryForSiembra(programacion.id, siembraId)

    if (hasBitacoraEntry) {
      return COMPLIANCE_STATES.REGISTRADO
    }

    if (fechaProgramada > today) {
      return COMPLIANCE_STATES.PROGRAMADO
    }

    if (fechaProgramada.getTime() === today.getTime()) {
      return COMPLIANCE_STATES.PENDIENTE
    }

    const daysDiff = Math.floor((today - fechaProgramada) / (1000 * 60 * 60 * 24))
    if (daysDiff > 2) {
      return COMPLIANCE_STATES.ACUMULADO
    }

    return COMPLIANCE_STATES.VENCIDO
  } catch (error) {
    logger.error('[complianceChecker] Error getting compliance state:', error)
    return COMPLIANCE_STATES.PROGRAMADO
  }
}

/**
 * Gets compliance color for UI display
 * @param {Object} programacion - Programacion object
 * @param {Function} hasBitacoraEntryForSiembra - Function to check bitacora entries
 * @param {string|null} siembraId - Siembra ID for context isolation
 * @returns {string} Vuetify color name
 */
export function getComplianceStateColor(programacion, hasBitacoraEntryForSiembra, siembraId = null) {
  const state = getComplianceState(programacion, hasBitacoraEntryForSiembra, siembraId)
  return COMPLIANCE_COLORS[state] || 'grey'
}

/**
 * Gets compliance icon for UI display
 * @param {Object} programacion - Programacion object
 * @param {Function} hasBitacoraEntryForSiembra - Function to check bitacora entries
 * @param {string|null} siembraId - Siembra ID for context isolation
 * @returns {string} MDI icon name
 */
export function getComplianceStateIcon(programacion, hasBitacoraEntryForSiembra, siembraId = null) {
  const state = getComplianceState(programacion, hasBitacoraEntryForSiembra, siembraId)
  return COMPLIANCE_ICONS[state] || 'mdi-help-circle'
}

/**
 * Gets compliance tooltip text
 * @param {Object} programacion - Programacion object
 * @param {Function} hasBitacoraEntryForSiembra - Function to check bitacora entries
 * @param {string|null} siembraId - Siembra ID for context isolation
 * @returns {string} Tooltip text
 */
export function getComplianceStateTooltip(programacion, hasBitacoraEntryForSiembra, siembraId = null) {
  try {
    const state = getComplianceState(programacion, hasBitacoraEntryForSiembra, siembraId)
    const today = new Date()

    const fechaProgramada = programacion.proxima_ejecucion
      ? new Date(programacion.proxima_ejecucion)
      : new Date()

    const daysDiff = fechaProgramada && !isNaN(fechaProgramada)
      ? Math.floor((today - fechaProgramada) / (1000 * 60 * 60 * 24))
      : 0

    const siembraContext = siembraId ? ` (Siembra: ${siembraId})` : ''
    const tooltips = {
      [COMPLIANCE_STATES.REGISTRADO]: `Cumplimiento registrado en bitácora${siembraContext}`,
      [COMPLIANCE_STATES.PENDIENTE]: `Requiere documentación hoy${siembraContext}`,
      [COMPLIANCE_STATES.ACUMULADO]: `${Math.abs(daysDiff)} días sin documentar - riesgo de cumplimiento${siembraContext}`,
      [COMPLIANCE_STATES.PROGRAMADO]: `Programado para fecha futura${siembraContext}`,
      [COMPLIANCE_STATES.VENCIDO]: `Vencido hace ${Math.abs(daysDiff)} días${siembraContext}`
    }
    return tooltips[state] || state
  } catch (error) {
    logger.error('[complianceChecker] Error getting compliance tooltip:', error)
    return 'Estado desconocido'
  }
}

/**
 * Checks if a programacion has compliance issues
 * @param {Object} programacion - Programacion object
 * @param {Function} hasBitacoraEntryForSiembra - Function to check bitacora entries
 * @param {string|null} siembraId - Siembra ID for context isolation
 * @returns {boolean} True if has compliance issues
 */
export function hasComplianceIssues(programacion, hasBitacoraEntryForSiembra, siembraId = null) {
  const state = getComplianceState(programacion, hasBitacoraEntryForSiembra, siembraId)
  return [COMPLIANCE_STATES.VENCIDO, COMPLIANCE_STATES.ACUMULADO].includes(state)
}

/**
 * Gets compliance risk level
 * @param {Object} programacion - Programacion object
 * @param {Function} hasBitacoraEntryForSiembra - Function to check bitacora entries
 * @param {string|null} siembraId - Siembra ID for context isolation
 * @returns {string} Risk level: 'none', 'low', 'medium', 'high'
 */
export function getComplianceRiskLevel(programacion, hasBitacoraEntryForSiembra, siembraId = null) {
  const state = getComplianceState(programacion, hasBitacoraEntryForSiembra, siembraId)

  switch (state) {
    case COMPLIANCE_STATES.REGISTRADO:
      return 'none'
    case COMPLIANCE_STATES.PROGRAMADO:
      return 'none'
    case COMPLIANCE_STATES.PENDIENTE:
      return 'low'
    case COMPLIANCE_STATES.VENCIDO:
      return 'medium'
    case COMPLIANCE_STATES.ACUMULADO:
      return 'high'
    default:
      return 'none'
  }
}

/**
 * Generates a compliance report for multiple programaciones
 * @param {Array<Object>} programaciones - Array of programacion objects
 * @param {Function} hasBitacoraEntryForSiembra - Function to check bitacora entries
 * @param {string|null} siembraId - Siembra ID for context isolation
 * @returns {Object} Compliance report with statistics
 */
export function generateComplianceReport(programaciones, hasBitacoraEntryForSiembra, siembraId = null) {
  try {
    const report = {
      total: programaciones.length,
      byState: {},
      riskLevels: {
        none: 0,
        low: 0,
        medium: 0,
        high: 0
      },
      issues: []
    }

    // Initialize state counters
    Object.values(COMPLIANCE_STATES).forEach(state => {
      report.byState[state] = 0
    })

    programaciones.forEach(programacion => {
      const state = getComplianceState(programacion, hasBitacoraEntryForSiembra, siembraId)
      report.byState[state]++

      const riskLevel = getComplianceRiskLevel(programacion, hasBitacoraEntryForSiembra, siembraId)
      report.riskLevels[riskLevel]++

      if (hasComplianceIssues(programacion, hasBitacoraEntryForSiembra, siembraId)) {
        report.issues.push({
          programacionId: programacion.id,
          state,
          riskLevel,
          fechaProgramada: programacion.proxima_ejecucion
        })
      }
    })

    return report
  } catch (error) {
    logger.error('[complianceChecker] Error generating compliance report:', error)
    return {
      total: 0,
      byState: {},
      riskLevels: { none: 0, low: 0, medium: 0, high: 0 },
      issues: []
    }
  }
}

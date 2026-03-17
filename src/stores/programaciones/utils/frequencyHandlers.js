/**
 * frequencyHandlers.js
 * Frequency pattern handlers for programaciones
 * @module programaciones/utils/frequencyHandlers
 */

import {
  addDays,
  addWeeks,
  addMonths,
  addYears
} from 'date-fns'
import { logger } from '@/utils/logger'

/**
 * Frequency types enumeration
 */
export const FREQUENCY_TYPES = {
  DIARIA: 'diaria',
  SEMANAL: 'semanal',
  QUINCENAL: 'quincenal',
  MENSUAL: 'mensual',
  PERSONALIZADA: 'personalizada',
  FECHA_ESPECIFICA: 'fecha_especifica'
}

/**
 * Frequency period types for personalized frequencies
 */
export const PERIOD_TYPES = {
  DIAS: 'dias',
  SEMANAS: 'semanas',
  MESES: 'meses',
  AÑOS: 'años'
}

/**
 * Default frequency configurations
 */
export const DEFAULT_FREQUENCY_CONFIGS = {
  [FREQUENCY_TYPES.DIARIA]: {
    interval: 1,
    unit: 'days'
  },
  [FREQUENCY_TYPES.SEMANAL]: {
    interval: 1,
    unit: 'weeks'
  },
  [FREQUENCY_TYPES.QUINCENAL]: {
    interval: 15,
    unit: 'days'
  },
  [FREQUENCY_TYPES.MENSUAL]: {
    interval: 1,
    unit: 'months'
  }
}

/**
 * Calculates next execution date based on frequency type
 * @param {Date} baseDate - Starting date
 * @param {string} frequency - Frequency type from FREQUENCY_TYPES
 * @param {Object} customConfig - Custom frequency configuration for 'personalizada' type
 * @returns {Date} Next execution date
 */
export function calculateNextExecutionByFrequency(baseDate, frequency, customConfig = {}) {
  try {
    switch (frequency) {
      case FREQUENCY_TYPES.DIARIA:
        return addDays(baseDate, 1)
      case FREQUENCY_TYPES.SEMANAL:
        return addWeeks(baseDate, 1)
      case FREQUENCY_TYPES.QUINCENAL:
        return addDays(baseDate, 15)
      case FREQUENCY_TYPES.MENSUAL:
        return addMonths(baseDate, 1)
      case FREQUENCY_TYPES.PERSONALIZADA:
        return calculateCustomFrequency(baseDate, customConfig)
      case FREQUENCY_TYPES.FECHA_ESPECIFICA:
        // For fecha_especifica, return the configured date
        return customConfig?.fecha ? new Date(customConfig.fecha) : baseDate
      default:
        logger.warn(`[frequencyHandlers] Unknown frequency type: ${frequency}`)
        return addDays(baseDate, 1)
    }
  } catch (error) {
    logger.error('[frequencyHandlers] Error calculating next execution:', error)
    return addDays(baseDate, 1)
  }
}

/**
 * Calculates custom frequency based on period type and amount
 * @param {Date} baseDate - Starting date
 * @param {Object} config - Configuration { tipo, cantidad }
 * @returns {Date} Calculated date
 */
export function calculateCustomFrequency(baseDate, config) {
  try {
    const { tipo, cantidad = 1 } = config

    const addFunctions = {
      [PERIOD_TYPES.DIAS]: addDays,
      [PERIOD_TYPES.SEMANAS]: addWeeks,
      [PERIOD_TYPES.MESES]: addMonths,
      [PERIOD_TYPES.AÑOS]: addYears
    }

    const addFn = addFunctions[tipo]
    if (!addFn) {
      logger.warn(`[frequencyHandlers] Unknown period type: ${tipo}`)
      return addDays(baseDate, 1)
    }

    return addFn(baseDate, cantidad)
  } catch (error) {
    logger.error('[frequencyHandlers] Error calculating custom frequency:', error)
    return addDays(baseDate, 1)
  }
}

/**
 * Validates frequency configuration
 * @param {string} frequency - Frequency type
 * @param {Object} customConfig - Custom configuration (required for 'personalizada')
 * @returns {Object} Validation result { valid, error }
 */
export function validateFrequencyConfig(frequency, customConfig) {
  if (!Object.values(FREQUENCY_TYPES).includes(frequency)) {
    return {
      valid: false,
      error: `Tipo de frecuencia inválido: ${frequency}`
    }
  }

  if (frequency === FREQUENCY_TYPES.PERSONALIZADA) {
    if (!customConfig || !customConfig.tipo) {
      return {
        valid: false,
        error: 'Configuración personalizada requiere tipo de período'
      }
    }

    if (!Object.values(PERIOD_TYPES).includes(customConfig.tipo)) {
      return {
        valid: false,
        error: `Tipo de período inválido: ${customConfig.tipo}`
      }
    }

    if (typeof customConfig.cantidad !== 'number' || customConfig.cantidad <= 0) {
      return {
        valid: false,
        error: 'Cantidad debe ser un número positivo'
      }
    }
  }

  if (frequency === FREQUENCY_TYPES.FECHA_ESPECIFICA) {
    if (!customConfig || !customConfig.fecha) {
      return {
        valid: false,
        error: 'Fecha específica requiere una fecha configurada'
      }
    }

    const fecha = new Date(customConfig.fecha)
    if (isNaN(fecha.getTime())) {
      return {
        valid: false,
        error: 'Fecha específica inválida'
      }
    }
  }

  return { valid: true }
}

/**
 * Gets frequency display name
 * @param {string} frequency - Frequency type
 * @param {Object} customConfig - Custom configuration for personalized frequencies
 * @returns {string} Human-readable frequency name
 */
export function getFrequencyDisplayName(frequency, customConfig = {}) {
  switch (frequency) {
    case FREQUENCY_TYPES.DIARIA:
      return 'Diaria'
    case FREQUENCY_TYPES.SEMANAL:
      return 'Semanal'
    case FREQUENCY_TYPES.QUINCENAL:
      return 'Quincenal'
    case FREQUENCY_TYPES.MENSUAL:
      return 'Mensual'
    case FREQUENCY_TYPES.PERSONALIZADA:
      if (customConfig.tipo && customConfig.cantidad) {
        const periodName = customConfig.tipo.charAt(0).toUpperCase() + customConfig.tipo.slice(1)
        return `Cada ${customConfig.cantidad} ${periodName}`
      }
      return 'Personalizada'
    case FREQUENCY_TYPES.FECHA_ESPECIFICA:
      return 'Fecha específica'
    default:
      return 'Desconocida'
  }
}

/**
 * Calculates initial execution date when creating a programacion
 * @param {string} frequency - Frequency type
 * @param {Object} customConfig - Custom configuration
 * @returns {Date} Initial execution date
 */
export function calculateInitialExecutionDate(frequency, customConfig = {}) {
  const now = new Date()

  if (frequency === FREQUENCY_TYPES.FECHA_ESPECIFICA && customConfig.fecha) {
    return new Date(customConfig.fecha)
  }

  return calculateNextExecutionByFrequency(now, frequency, customConfig)
}

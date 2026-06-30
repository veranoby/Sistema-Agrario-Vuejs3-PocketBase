/**
 * recurrenceCalculator.js
 * Handles recurrence calculations for programaciones
 * @module programaciones/recurrenceCalculator
 */

import { logger } from '@/utils/logger'
import { format } from 'date-fns'
import {
  calcularProximaEjecucion,
  calcularSiguienteFecha,
  calcularEjecucionesPendientes,
  normalizeDate,
  formatToDisplayDate,
  aplicarExclusiones
} from './utils/dateCalculators'
import {
  FREQUENCY_TYPES,
  calculateNextExecutionByFrequency
} from './utils/frequencyHandlers'

/**
 * Calculates all pending execution dates for a programacion
 * @param {Object} programacion - Programacion object
 * @param {Function} isFechaProcessedInBitacora - Function to check if date is processed
 * @param {string|null} siembraId - Siembra ID for context isolation
 * @returns {Array<string>} Array of pending dates in 'yyyy-MM-dd' format
 */
export function getFechasPendientes(programacion, isFechaProcessedInBitacora, siembraId = null) {
  try {
    if (!programacion) {
      logger.warn('[recurrenceCalculator] No programacion provided to getFechasPendientes')
      return []
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const fechas = []

    // Handle fecha_especifica (one-time execution)
    if (programacion.frecuencia === FREQUENCY_TYPES.FECHA_ESPECIFICA) {
      if (programacion.frecuencia_personalizada?.fecha) {
        let fechaEspecifica = new Date(programacion.frecuencia_personalizada.fecha)
        fechaEspecifica = aplicarExclusiones(fechaEspecifica, programacion.exclusiones)
        fechaEspecifica.setHours(0, 0, 0, 0)

        // Only include if it's in the past or today
        if (fechaEspecifica <= today) {
          // Check if this date hasn't been processed in bitacora
          if (!isFechaProcessedInBitacora(programacion.id, fechaEspecifica, siembraId)) {
            fechas.push(formatToDisplayDate(fechaEspecifica))
          }
        }
      }
      return fechas
    }

    // Calculate pending dates for recurring programaciones from ultima_ejecucion
    const ultimaEjecucion = programacion.ultima_ejecucion
      ? new Date(programacion.ultima_ejecucion)
      : new Date(programacion.created || programacion.proxima_ejecucion)
    ultimaEjecucion.setHours(0, 0, 0, 0)

    let currentDate = new Date(ultimaEjecucion)

    // Generate dates from ultima_ejecucion until today
    while (currentDate < today) {
      // Calculate next execution date based on frequency
      const nextDate = calcularSiguienteFecha(currentDate, programacion)

      if (nextDate <= today) {
        // Only include dates that haven't been processed in bitacora
        if (!isFechaProcessedInBitacora(programacion.id, nextDate, siembraId)) {
          fechas.push(formatToDisplayDate(nextDate))
        }
      }

      currentDate = nextDate

      // Safety limit: don't generate more than 100 dates
      if (fechas.length >= 100) {
        logger.warn('[recurrenceCalculator] Hit safety limit generating pending dates')
        break
      }
    }

    return fechas.sort()
  } catch (error) {
    logger.error('[recurrenceCalculator] Error in getFechasPendientes:', error)
    return []
  }
}

/**
 * Validates and calculates pending dates with error handling
 * @param {Object} programacion - Programacion object
 * @param {Function} isFechaProcessedInBitacora - Function to check if date is processed
 * @param {string|null} siembraId - Siembra ID for context isolation
 * @returns {Array<string>} Array of validated pending dates
 */
export function getFechasPendientesWithValidation(programacion, isFechaProcessedInBitacora, siembraId = null) {
  try {
    // Graceful handling when programacion is null/undefined
    if (!programacion) {
      logger.warn('[recurrenceCalculator] No programacion provided to getFechasPendientesWithValidation')
      return []
    }

    // Use the core method with siembra context
    const fechas = getFechasPendientes(programacion, isFechaProcessedInBitacora, siembraId)

    // Additional validation for edge cases
    if (!Array.isArray(fechas)) {
      logger.error('[recurrenceCalculator] getFechasPendientes returned non-array result')
      return []
    }

    // Filter out invalid dates
    const validFechas = fechas.filter(fecha => {
      try {
        const dateObj = new Date(fecha)
        return !isNaN(dateObj.getTime())
      } catch (error) {
        logger.warn(`[recurrenceCalculator] Invalid date found: ${fecha}`)
        return false
      }
    })

    logger.debug(`[recurrenceCalculator] Generated ${validFechas.length} valid pending dates for programacion ${programacion.id}${siembraId ? ` (siembra: ${siembraId})` : ''}`)
    return validFechas

  } catch (error) {
    logger.error('[recurrenceCalculator] Error in getFechasPendientesWithValidation:', error)
    return []
  }
}

/**
 * Calculates next execution date for a programacion
 * @param {Object} programacion - Programacion object
 * @returns {Date} Next execution date
 */
export function calculateNextExecution(programacion) {
  return calcularProximaEjecucion(programacion)
}

/**
 * Calculates the number of pending executions
 * @param {Object} programacion - Programacion object
 * @returns {number} Number of pending executions
 */
export function calculatePendingExecutions(programacion) {
  return calcularEjecucionesPendientes(programacion)
}

/**
 * Generates a series of future execution dates
 * @param {Object} programacion - Programacion object
 * @param {number} count - Number of future dates to generate
 * @returns {Array<string>} Array of future dates in 'yyyy-MM-dd' format
 */
export function generateFutureExecutionDates(programacion, count = 5) {
  try {
    if (!programacion) {
      logger.warn('[recurrenceCalculator] No programacion provided for future dates')
      return []
    }

    const dates = []
    const baseDate = programacion.proxima_ejecucion
      ? new Date(programacion.proxima_ejecucion)
      : new Date()

    let currentDate = baseDate

    for (let i = 0; i < count; i++) {
      const nextDate = calculateNextExecutionByFrequency(
        currentDate,
        programacion.frecuencia,
        programacion.frecuencia_personalizada,
        programacion.exclusiones
      )
      dates.push(formatToDisplayDate(nextDate))
      currentDate = nextDate
    }

    return dates
  } catch (error) {
    logger.error('[recurrenceCalculator] Error generating future dates:', error)
    return []
  }
}

/**
 * Checks if a programacion has pending executions
 * @param {Object} programacion - Programacion object
 * @returns {boolean} True if has pending executions
 */
export function hasPendingExecutions(programacion) {
  const pendingCount = calculatePendingExecutions(programacion)
  return pendingCount > 0
}

/**
 * Gets the most urgent pending execution date
 * @param {Object} programacion - Programacion object
 * @returns {Date|null} Most urgent pending date or null
 */
export function getMostUrgentPendingDate(programacion) {
  try {
    if (!programacion || !programacion.proxima_ejecucion) {
      return null
    }

    const proximaEjecucion = new Date(programacion.proxima_ejecucion)
    const today = normalizeDate(new Date())

    if (proximaEjecucion <= today) {
      return proximaEjecucion
    }

    return null
  } catch (error) {
    logger.error('[recurrenceCalculator] Error getting most urgent date:', error)
    return null
  }
}

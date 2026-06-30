/**
 * dateCalculators.js
 * Utility functions for date calculations in programaciones
 * @module programaciones/utils/dateCalculators
 */

import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  differenceInDays,
  differenceInMonths,
  format
} from 'date-fns'
import { logger } from '@/utils/logger'

/**
 * Aplica exclusiones (ej. fines de semana) a una fecha dada
 * @param {Date} fecha - Fecha a validar
 * @param {Array<string>} exclusiones - Arreglo de exclusiones
 * @returns {Date} Fecha ajustada
 */
export function aplicarExclusiones(fecha, exclusiones) {
  if (!exclusiones || !Array.isArray(exclusiones)) return fecha
  
  let currentFecha = new Date(fecha)
  
  if (exclusiones.includes('fines_de_semana')) {
    let day = currentFecha.getDay()
    // 0 is Sunday, 6 is Saturday
    while (day === 0 || day === 6) {
      currentFecha = addDays(currentFecha, 1)
      day = currentFecha.getDay()
    }
  }
  
  return currentFecha
}

/**
 * Calculates the next execution date based on programacion frequency
 * @param {Object} programacion - Programacion object
 * @returns {Date} Next execution date
 */
export function calcularProximaEjecucion(programacion) {
  try {
    if (programacion.frecuencia === 'fecha_especifica') {
      return new Date(programacion.frecuencia_personalizada?.fecha)
    }

    if (!programacion.ultima_ejecucion) return new Date(programacion.created)

    const baseDate = new Date(programacion.ultima_ejecucion)
    const config = programacion.frecuencia_personalizada || {}

    let nextDate
    switch (programacion.frecuencia) {
      case 'diaria':
        nextDate = addDays(baseDate, 1)
        break
      case 'semanal':
        nextDate = addWeeks(baseDate, 1)
        break
      case 'quincenal':
        nextDate = addDays(baseDate, 15)
        break
      case 'mensual':
        nextDate = addMonths(baseDate, 1)
        break
      case 'personalizada':
        nextDate = calcularFrecuenciaPersonalizada(baseDate, config)
        break
      default:
        nextDate = addDays(baseDate, 1)
        break
    }
    return aplicarExclusiones(nextDate, programacion.exclusiones)
  } catch (error) {
    logger.error('[dateCalculators] Error calculating proxima ejecucion:', error)
    return new Date()
  }
}

/**
 * Calculates custom frequency based on configuration
 * @param {Date} baseDate - Base date for calculation
 * @param {Object} config - Frequency configuration { tipo, cantidad }
 * @returns {Date} Calculated date
 */
export function calcularFrecuenciaPersonalizada(baseDate, config) {
  try {
    const addFunctions = {
      dias: addDays,
      semanas: addWeeks,
      meses: addMonths,
      años: addYears
    }

    return addFunctions[config.tipo]?.(baseDate, config.cantidad) || addDays(baseDate, 1)
  } catch (error) {
    logger.error('[dateCalculators] Error calculating custom frequency:', error)
    return addDays(baseDate, 1)
  }
}

/**
 * Calculates the next date in a sequence based on frequency
 * @param {Date} baseDate - Starting date
 * @param {Object} programacion - Programacion object with frequency info
 * @returns {Date} Next date in sequence
 */
export function calcularSiguienteFecha(baseDate, programacion) {
  try {
    const config = programacion.frecuencia_personalizada || {}

    let nextDate
    switch (programacion.frecuencia) {
      case 'diaria':
        nextDate = addDays(baseDate, 1)
        break
      case 'semanal':
        nextDate = addWeeks(baseDate, 1)
        break
      case 'quincenal':
        nextDate = addDays(baseDate, 15)
        break
      case 'mensual':
        nextDate = addMonths(baseDate, 1)
        break
      case 'personalizada':
        const addFunctions = {
          dias: addDays,
          semanas: addWeeks,
          meses: addMonths,
          años: addYears
        }
        nextDate = addFunctions[config.tipo]?.(baseDate, config.cantidad) || addDays(baseDate, 1)
        break
      default:
        nextDate = addDays(baseDate, 1)
        break
    }
    return aplicarExclusiones(nextDate, programacion.exclusiones)
  } catch (error) {
    logger.error('[dateCalculators] Error calculating siguiente fecha:', error)
    return addDays(baseDate, 1)
  }
}

/**
 * Calculates pending executions count
 * @param {Object} programacion - Programacion object
 * @returns {number} Number of pending executions
 */
export function calcularEjecucionesPendientes(programacion) {
  try {
    if (!programacion.ultima_ejecucion) return 1

    const hoy = new Date()
    const ultimaEjecucion = new Date(programacion.ultima_ejecucion)

    if (programacion.frecuencia === 'fecha_especifica') {
      const fechaEspecifica = new Date(programacion.frecuencia_personalizada?.fecha)
      return fechaEspecifica < hoy ? 1 : 0
    }

    const diasDesdeUltima = differenceInDays(hoy, ultimaEjecucion)

    switch (programacion.frecuencia) {
      case 'diaria':
        return diasDesdeUltima
      case 'semanal':
        return Math.floor(diasDesdeUltima / 7)
      case 'quincenal':
        return Math.floor(diasDesdeUltima / 15)
      case 'mensual':
        return differenceInMonths(hoy, ultimaEjecucion)
      case 'personalizada': {
        const config = programacion.frecuencia_personalizada
        if (config.tipo === 'dias') return Math.floor(diasDesdeUltima / config.cantidad)
        if (config.tipo === 'semanas') return Math.floor(diasDesdeUltima / (7 * config.cantidad))
        if (config.tipo === 'meses') {
          return differenceInMonths(hoy, ultimaEjecucion) / config.cantidad
        }
        return 0
      }
      default:
        return 0
    }
  } catch (error) {
    logger.error('[dateCalculators] Error calculating ejecuciones pendientes:', error)
    return 0
  }
}

/**
 * Gets visual state for a programacion based on date
 * @param {Object} programacion - Programacion object
 * @returns {string} Visual state: 'vencida', 'proxima', or 'al-dia'
 */
export function obtenerEstadoVisual(programacion) {
  try {
    const hoy = new Date()
    const fechaTarget =
      programacion.frecuencia === 'fecha_especifica'
        ? new Date(programacion.frecuencia_personalizada?.fecha)
        : new Date(programacion.proxima_ejecucion)

    if (isBefore(fechaTarget, hoy)) return 'vencida'

    const diff = differenceInDays(fechaTarget, hoy)
    if (diff <= 3) return 'proxima'
    return 'al-dia'
  } catch (error) {
    logger.error('[dateCalculators] Error getting estado visual:', error)
    return 'al-dia'
  }
}

/**
 * Normalizes date to start of day (00:00:00)
 * @param {Date} date - Date to normalize
 * @returns {Date} Normalized date
 */
export function normalizeDate(date) {
  try {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  } catch (error) {
    logger.error('[dateCalculators] Error normalizing date:', error)
    return new Date()
  }
}

/**
 * Formats date to ISO string with UTC timezone
 * @param {Date|string} date - Date to format
 * @returns {string} ISO formatted date string
 */
export function formatToISOString(date) {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toISOString()
  } catch (error) {
    logger.error('[dateCalculators] Error formatting to ISO string:', error)
    return new Date().toISOString()
  }
}

/**
 * Formats date to display format (yyyy-MM-dd)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatToDisplayDate(date) {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'yyyy-MM-dd')
  } catch (error) {
    logger.error('[dateCalculators] Error formatting to display date:', error)
    return format(new Date(), 'yyyy-MM-dd')
  }
}

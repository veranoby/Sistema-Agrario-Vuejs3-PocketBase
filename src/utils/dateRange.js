/**
 * Helpers para cálculo de rangos de fechas
 * @module utils/dateRange
 */

/**
 * Obtener fecha de inicio según rango
 * @param {string} range - 'day' | 'week' | 'month' | 'custom'
 * @param {Date} [referenceDate] - Fecha de referencia (default: now)
 * @returns {Date} Fecha de inicio del rango
 */
export function getDateRangeStart(range, referenceDate = new Date()) {
  const now = new Date(referenceDate)

  switch (range) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'week':
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - 7)
      return weekStart
    case 'month':
      const monthStart = new Date(now)
      monthStart.setMonth(monthStart.getMonth() - 1)
      return monthStart
    case 'custom':
      return now
    default:
      const defaultStart = new Date(now)
      defaultStart.setMonth(defaultStart.getMonth() - 1)
      return defaultStart
  }
}

/**
 * Obtener fecha de hoy a las 00:00:00
 * @param {Date} [referenceDate] - Fecha de referencia (default: now)
 * @returns {Date}
 */
export function getTodayStart(referenceDate = new Date()) {
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
}

/**
 * Formatear fecha a ISO string para queries
 * @param {Date} date
 * @returns {string}
 */
export function toISOString(date) {
  return date.toISOString()
}

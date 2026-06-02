/**
 * agriMetrics.js
 * Funciones puras para cálculo de métricas agrícolas
 * Fuente única de verdad para cálculos BPA y productividad
 */

import { COMPLIANCE_THRESHOLDS, COMPLIANCE_LEVELS } from '@/constants/bpa'

/**
 * Calcula el porcentaje de cumplimiento BPA basado en respuestas
 * @param {Array} datosBpa - Array de objetos con { pregunta, respuesta }
 * @returns {number} Porcentaje de cumplimiento (0-100)
 */
export function calculateBpaStatus(datosBpa) {
  if (!datosBpa?.length) return 0

  const puntosObtenidos = datosBpa.reduce((acc, pregunta) => {
    let val = pregunta.respuesta
    if (typeof val === 'string') {
      val = val.toLowerCase().trim()
      // Eliminar tildes para facilitar la comparación
      val = val.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    }

    if (val === true) return acc + 100
    if (!val || val === false) return acc

    // Si empieza con "no " o "incomplet", es negativo
    if (val === 'no' || val.startsWith('no ') || val.startsWith('incomplet')) {
      return acc
    }

    const palabrasParciales = [
      'proceso', 'tramite', 'parcial', 'ocasionalmente', 'ordenacion'
    ]

    const esParcial = palabrasParciales.some(p => val.includes(p))
    if (esParcial) return acc + 50

    // Si no es negativo ni parcial, y tiene texto, asumimos positivo por descarte de los negativos estrictos, 
    // pero para mayor seguridad validamos algunas palabras clave positivas que cubren los JSONs
    const palabrasPositivas = [
      'cumplid', 'conforme', 'si', 'aprobado', 'estrictamente',
      'ejecutado', 'verificad', 'disponible', 'complet', 'operacional',
      'senalizada', 'regularmente', 'libre', 'cumplen', 'implementad',
      'instalad', 'mapeada', 'sistematicamente', 'cumple', 'aplica', 'realizad', 'registrado', 'soporte', 'autorizad'
    ]

    const esPositivo = palabrasPositivas.some(p => val.includes(p))
    if (esPositivo) return acc + 100

    return acc
  }, 0)

  return Math.round((puntosObtenidos / (datosBpa.length * 100)) * 100)
}

/**
 * Calcula puntaje BPA de un conjunto de datos (Genérico)
 * @param {Object} datosBpa - Objeto con respuestas BPA
 * @returns {number} Puntaje 0-100
 */
export function calculateBPAScore(datosBpa) {
  if (!datosBpa || typeof datosBpa !== 'object') return 0

  const values = Object.values(datosBpa)
  if (values.length === 0) return 0

  let totalPoints = 0
  let maxPoints = 0

  values.forEach((value) => {
    if (typeof value === 'number') {
      totalPoints += value
      maxPoints += 100
    } else if (typeof value === 'boolean') {
      totalPoints += value ? 100 : 0
      maxPoints += 100
    } else if (value !== null && value !== undefined && value !== '') {
      totalPoints += 100
      maxPoints += 100
    } else {
      maxPoints += 100
    }
  })

  return maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0
}

/**
 * Obtiene nivel de cumplimiento según puntaje
 * @param {number} score - Puntaje 0-100
 * @returns {string} Nivel de cumplimiento
 */
export function getComplianceLevel(score) {
  if (score >= COMPLIANCE_THRESHOLDS.EXCELLENT) return COMPLIANCE_LEVELS.EXCELLENT
  if (score >= COMPLIANCE_THRESHOLDS.GOOD) return COMPLIANCE_LEVELS.GOOD
  if (score >= COMPLIANCE_THRESHOLDS.ACCEPTABLE) return COMPLIANCE_LEVELS.ACCEPTABLE
  return COMPLIANCE_LEVELS.CRITICAL
}

/**
 * Obtiene estado BPA según puntaje
 * @param {number} score - Puntaje 0-100
 * @returns {string} Estado legible
 */
export function getBPAStatus(score) {
  if (score >= 90) return 'excelente'
  if (score >= 75) return 'bueno'
  if (score >= 60) return 'regular'
  return 'deficiente'
}

/**
 * Calcula cumplimiento por entrada individual
 * @param {Object} datosBpa - Datos BPA de una entrada
 * @returns {number} Porcentaje de cumplimiento
 */
export function calculateEntryCompliance(datosBpa) {
  return calculateBPAScore(datosBpa)
}

/**
 * Calcula distribución de puntajes
 * @param {Array} items - Array de objetos con bpaScore
 * @returns {Object} Distribución por nivel
 */
export function calculateScoreDistribution(items) {
  const distribution = { excelente: 0, bueno: 0, regular: 0, deficiente: 0 }

  items.forEach((item) => {
    const status = getBPAStatus(item.bpaScore || 0)
    distribution[status]++
  })

  return distribution
}

/**
 * Validadores especializados por tipo de actividad para bitácoras
 * @module validators/bitacoraValidators
 */

import { logger } from '@/utils/logger'
import { ACTIVITY_TYPE_REQUIREMENTS, ESTADOS_EJECUCION } from '@/constants/activityTypes'

/**
 * Resultado de validación estándar
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Indica si la validación pasó
 * @property {string[]} [errors] - Lista de errores encontrados
 * @property {string[]} [warnings] - Lista de advertencias
 * @property {Object} [missingFields] - Campos faltantes
 */

/**
 * Valida una entrada de bitácora según su tipo de actividad
 * @param {Object} datos - Datos de la entrada de bitácora
 * @param {string} tipoActividad - Tipo de actividad (siembra, cosecha, etc.)
 * @param {Object} tipoActividadData - Datos del tipo de actividad desde PocketBase
 * @returns {ValidationResult} Resultado de la validación
 */
export function validateBitacoraEntry(datos, tipoActividad, tipoActividadData = null) {
  const errors = []
  const warnings = []
  const missingFields = []

  // Normalizar tipo de actividad
  const tipoNormalizado = normalizeTipoActividad(tipoActividad)

  // Verificar si existe configuración para este tipo
  const requirements = ACTIVITY_TYPE_REQUIREMENTS[tipoNormalizado]

  if (!requirements) {
    logger.warn(`[bitacoraValidators] No hay requisitos específicos para tipo: ${tipoNormalizado}`)
    // Si no hay requisitos específicos, pasar validación básica
    return {
      valid: true,
      warnings: ['No hay validaciones específicas para este tipo de actividad']
    }
  }

  // 1. Validar campos requeridos
  if (requirements.camposRequeridos) {
    for (const campo of requirements.camposRequeridos) {
      const valor = getNestedValue(datos, campo)
      if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) {
        errors.push(`Campo requerido faltante: ${campo}`)
        missingFields.push(campo)
      }
    }
  }

  // 2. Validar campos numéricos
  if (requirements.camposNumericos) {
    for (const campo of requirements.camposNumericos) {
      const valor = getNestedValue(datos, campo)
      if (valor !== undefined && valor !== null && typeof valor !== 'number') {
        errors.push(`Campo ${campo} debe ser numérico`)
      }
    }
  }

  // 3. Validaciones específicas por tipo
  if (requirements.validacionesEspecificas) {
    for (const validacion of requirements.validacionesEspecificas) {
      const valor = getNestedValue(datos, validacion.campo)
      if (!validacion.regla(valor)) {
        errors.push(validacion.mensaje)
      }
    }
  }

  // 4. Validar contra formato_reporte si está disponible
  if (tipoActividadData?.formato_reporte?.columnas) {
    const formatoValidation = validateAgainstFormatoReporte(
      datos.metricas || {},
      tipoActividadData.formato_reporte.columnas
    )
    errors.push(...formatoValidation.errors)
    warnings.push(...formatoValidation.warnings)
  }

  // 5. Validar estructura mínima de bitácora
  const bitacoraValidation = validateBitacoraStructure(datos)
  errors.push(...bitacoraValidation.errors)
  warnings.push(...bitacoraValidation.warnings)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missingFields: missingFields.length > 0 ? missingFields : undefined
  }
}

/**
 * Valida los campos básicos de estructura de bitácora
 * @param {Object} datos - Datos de la entrada
 * @returns {ValidationResult} Resultado de validación
 */
function validateBitacoraStructure(datos) {
  const errors = []
  const warnings = []

  // Campos obligatorios para cualquier entrada de bitácora
  const requiredFields = ['actividad_realizada', 'fecha_ejecucion']
  for (const field of requiredFields) {
    if (!datos[field]) {
      errors.push(`Campo obligatorio de bitácora faltante: ${field}`)
    }
  }

  // Validar fecha de ejecución
  if (datos.fecha_ejecucion) {
    const fecha = new Date(datos.fecha_ejecucion)
    if (isNaN(fecha.getTime())) {
      errors.push('fecha_ejecucion debe ser una fecha válida')
    }
  }

  // Validar estado_ejecucion si está presente
  if (datos.estado_ejecucion) {
    const estadosValidos = Object.values(ESTADOS_EJECUCION)
    if (!estadosValidos.includes(datos.estado_ejecucion)) {
      warnings.push(`estado_ejecucion '${datos.estado_ejecucion}' no está en la lista de estados válidos`)
    }
  }

  return { errors, warnings }
}

/**
 * Valida métricas contra el formato_reporte del tipo de actividad
 * @param {Object} metricas - Objeto de métricas a validar
 * @param {Array} columnas - Columnas definidas en formato_reporte
 * @returns {ValidationResult} Resultado de validación
 */
function validateAgainstFormatoReporte(metricas, columnas) {
  const errors = []
  const warnings = []

  for (const columna of columnas) {
    const metricaKey = columna.metrica || columna.nombre
    const valor = metricas[metricaKey]

    // Validar campos requeridos según formato_reporte
    if (columna.requerido && (valor === undefined || valor === null)) {
      errors.push(`Métrica requerida faltante según formato: ${columna.nombre}`)
    }

    // Validar tipo de dato
    if (valor !== undefined && valor !== null && columna.tipo) {
      const tipoValidacion = validateDataType(valor, columna.tipo)
      if (!tipoValidacion.valid) {
        errors.push(`Métrica ${columna.nombre}: ${tipoValidacion.message}`)
      }
    }
  }

  return { errors, warnings }
}

/**
 * Valida que un valor coincida con el tipo de dato esperado
 * @param {*} valor - Valor a validar
 * @param {string} tipoEsperado - Tipo esperado
 * @returns {Object} Resultado de validación
 */
function validateDataType(valor, tipoEsperado) {
  const tipo = tipoEsperado.toLowerCase()

  if (tipo === 'number' && typeof valor !== 'number') {
    return { valid: false, message: 'se espera un valor numérico' }
  }

  if (tipo === 'boolean' && typeof valor !== 'boolean') {
    return { valid: false, message: 'se espera un valor booleano' }
  }

  if (tipo === 'date' && !isValidDate(valor)) {
    return { valid: false, message: 'se espera una fecha válida' }
  }

  return { valid: true }
}

/**
 * Normaliza el nombre del tipo de actividad
 * @param {string} tipo - Tipo de actividad
 * @returns {string} Tipo normalizado
 */
function normalizeTipoActividad(tipo) {
  if (!tipo) return 'desconocido'

  // Si es un ID de PocketBase, intentar mapear a nombre
  // Esto podría extenderse con un mapeo de IDs a nombres

  // Normalizar a minúsculas y remover acentos
  return tipo
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
}

/**
 * Obtiene un valor anidado de un objeto usando notación de puntos
 * @param {Object} obj - Objeto
 * @param {string} path - Path (ej: 'metricas.variedad')
 * @returns {*} Valor encontrado o undefined
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined

  const keys = path.split('.')
  let current = obj

  for (const key of keys) {
    if (current === undefined || current === null) return undefined
    current = current[key]
  }

  return current
}

/**
 * Verifica si un valor es una fecha válida
 * @param {*} valor - Valor a verificar
 * @returns {boolean} True si es una fecha válida
 */
function isValidDate(valor) {
  if (typeof valor === 'string' || typeof valor === 'number') {
    const date = new Date(valor)
    return !isNaN(date.getTime())
  }
  if (valor instanceof Date) {
    return !isNaN(valor.getTime())
  }
  return false
}

/**
 * Valida múltiples entradas de bitácora en batch
 * @param {Array} entries - Array de entradas a validar
 * @param {Object} actividadesStore - Store de actividades para obtener tipos
 * @returns {Object} Resultados de validación por entrada
 */
export async function validateBitacoraBatch(entries, actividadesStore) {
  const results = []

  for (const entry of entries) {
    let tipoActividad = null
    let tipoActividadData = null

    // Obtener tipo de actividad
    if (entry.actividad_realizada) {
      const actividad = await actividadesStore.fetchActividadById(entry.actividad_realizada)
      if (actividad?.tipo_actividades) {
        tipoActividadData = await actividadesStore.tiposActividades.find(
          t => t.id === actividad.tipo_actividades
        )
        tipoActividad = tipoActividadData?.nombre || 'desconocido'
      }
    }

    const validation = validateBitacoraEntry(entry, tipoActividad, tipoActividadData)
    results.push({
      entry,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    })
  }

  return {
    total: entries.length,
    valid: results.filter(r => r.valid).length,
    invalid: results.filter(r => !r.valid).length,
    results
  }
}

/**
 * Exporta la definición de requisitos por tipo
 * Útil para UI que necesita mostrar campos requeridos dinámicamente
 */
export { ACTIVITY_TYPE_REQUIREMENTS }

/**
 * Obtiene los requisitos para un tipo específico
 * @param {string} tipo - Tipo de actividad
 * @returns {Object|null} Requisitos del tipo o null
 */
export function getRequirementsForType(tipo) {
  const tipoNormalizado = normalizeTipoActividad(tipo)
  return ACTIVITY_TYPE_REQUIREMENTS[tipoNormalizado] || null
}

/**
 * Sistema de Handlers para procesamiento de bitácoras por tipo de actividad
 * Implementa Strategy Pattern para manejar diferentes tipos de actividad
 * @module utils/bitacora/bitacoraHandlers
 */

import { logger } from '@/utils/logger'
import { validateBitacoraEntry, getRequirementsForType } from '@/utils/validators/bitacoraValidators'
import { transformMetricasByTipo, generateObservacionesFromMetricas } from '@/utils/bitacoraMetricTransformer'

/**
 * Handler base para todos los tipos de actividad
 * Define la interfaz común que todos los handlers deben implementar
 */
class BaseBitacoraHandler {
  constructor(tipoActividad) {
    this.tipo = tipoActividad
  }

  /**
   * Valida datos de entrada para este tipo
   * @param {Object} datos - Datos a validar
   * @param {Object} context - Contexto adicional (tipoActividadData, etc.)
   * @returns {Object} Resultado de validación
   */
  validate(datos, context = {}) {
    throw new Error('validate() debe ser implementado por la subclase')
  }

  /**
   * Transforma métricas al formato esperado
   * @param {Object} metricas - Métricas crudas
   * @param {Object} formatoReporte - Formato de reporte
   * @returns {Object} Métricas transformadas
   */
  transform(metricas, formatoReporte = null) {
    throw new Error('transform() debe ser implementado por la subclase')
  }

  /**
   * Procesamiento posterior a la creación de la entrada
   * @param {Object} entrada - Entrada creada
   * @param {Object} context - Contexto adicional
   * @returns {Promise<Object>} Datos procesados adicionales
   */
  async postProcess(entrada, context = {}) {
    // Por defecto, no hacer nada
    return entrada
  }

  /**
   * Prepara los datos para el formulario de entrada
   * @param {Object} programacion - Programación origen
   * @param {Object} actividad - Actividad a ejecutar
   * @returns {Promise<Object>} Datos prellenados para el formulario
   */
  async prepareFormData(programacion, actividad) {
    throw new Error('prepareFormData() debe ser implementado por la subclase')
  }

  /**
   * Genera observaciones automáticas basadas en métricas
   * @param {Object} metricas - Métricas de la actividad
   * @param {Object} formatoReporte - Formato de reporte
   * @returns {string} Observaciones generadas
   */
  generateAutoObservaciones(metricas, formatoReporte) {
    return generateObservacionesFromMetricas(metricas, formatoReporte)
  }
}

/**
 * Handler para actividades de Siembra
 */
class SiembraHandler extends BaseBitacoraHandler {
  constructor() {
    super('siembra')
  }

  validate(datos, context = {}) {
    const errors = []
    const warnings = []

    // Validar variedad
    if (!datos.variedad || datos.variedad.trim() === '') {
      errors.push('La variedad de semilla es requerida')
    }

    // Validar densidad
    const densidad = datos.densidad || datos.densidad_plantas
    if (!densidad || densidad <= 0) {
      errors.push('La densidad de siembra debe ser mayor a 0')
    }

    // Validar fecha
    if (!datos.fecha_siembra || isNaN(new Date(datos.fecha_siembra).getTime())) {
      errors.push('La fecha de siembra es requerida y debe ser válida')
    }

    // Advertencias de mejores prácticas
    if (densidad && densidad > 100000) {
      warnings.push('La densidad parece muy alta. Verificar unidades.')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  transform(metricas, formatoReporte = null) {
    return transformMetricasByTipo(metricas, 'siembra', formatoReporte)
  }

  async prepareFormData(programacion, actividad) {
    const metricas = actividad.metricas || {}
    const formatoReporte = actividad.expand?.tipo_actividades?.formato_reporte

    return {
      actividad_realizada_id: actividad.id,
      programacion_origen: programacion.id,
      siembra_asociada_id: programacion.siembras?.[0] || null,
      metricasToPreload: this.transform(metricas, formatoReporte).flat,
      observacionesPreload: this.generateAutoObservaciones(metricas, formatoReporte),
      fechaEjecucion: new Date().toISOString().split('T')[0]
    }
  }
}

/**
 * Handler para actividades de Cosecha
 */
class CosechaHandler extends BaseBitacoraHandler {
  constructor() {
    super('cosecha')
  }

  validate(datos, context = {}) {
    const errors = []
    const warnings = []

    // Validar rendimiento
    if (!datos.rendimiento_kg || datos.rendimiento_kg <= 0) {
      errors.push('El rendimiento en kg es requerido y debe ser mayor a 0')
    }

    // Validar calidad
    if (!datos.calidad || datos.calidad.trim() === '') {
      errors.push('La calidad de la cosecha es requerida')
    }

    // Validaciones de consistencia
    if (datos.rendimiento_kg && datos.rendimiento_por_hectarea) {
      // Si hay superficie, verificar consistencia
      const superficie = context.superficie
      if (superficie && superficie > 0) {
        const rendimientoCalculado = datos.rendimiento_kg / superficie
        const diff = Math.abs(rendimientoCalculado - datos.rendimiento_por_hectarea)
        if (diff / rendimientoCalculado > 0.2) {
          warnings.push('Posible inconsistencia entre rendimiento total y por hectárea')
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  transform(metricas, formatoReporte = null) {
    return transformMetricasByTipo(metricas, 'cosecha', formatoReporte)
  }

  async prepareFormData(programacion, actividad) {
    const metricas = actividad.metricas || {}
    const formatoReporte = actividad.expand?.tipo_actividades?.formato_reporte

    return {
      actividad_realizada_id: actividad.id,
      programacion_origen: programacion.id,
      siembra_asociada_id: programacion.siembras?.[0] || null,
      metricasToPreload: this.transform(metricas, formatoReporte).flat,
      observacionesPreload: this.generateAutoObservaciones(metricas, formatoReporte),
      fechaEjecucion: new Date().toISOString().split('T')[0]
    }
  }
}

/**
 * Handler para actividades de Aplicación (fitosanitarios, fertilizantes, etc.)
 */
class AplicacionHandler extends BaseBitacoraHandler {
  constructor() {
    super('aplicacion')
  }

  validate(datos, context = {}) {
    const errors = []
    const warnings = []

    // Validar producto
    if (!datos.producto || datos.producto.trim() === '') {
      errors.push('El producto aplicado es requerido')
    }

    // Validar dosis
    if (!datos.dosis || datos.dosis <= 0) {
      errors.push('La dosis es requerida y debe ser mayor a 0')
    }

    // Validar método
    if (!datos.metodo || datos.metodo.trim() === '') {
      errors.push('El método de aplicación es requerido')
    }

    // Advertencias de seguridad
    if (datos.producto && datos.producto.toLowerCase().match(/toxico|peligro|veneno/)) {
      warnings.push('Producto peligroso: Verificar equipo de protección')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  transform(metricas, formatoReporte = null) {
    return transformMetricasByTipo(metricas, 'aplicacion', formatoReporte)
  }

  async postProcess(entrada, context = {}) {
    // Registrar alertas de reingreso para ciertos productos
    const metricas = entrada.metricas || {}
    if (metricas.producto && metricas.producto.toLowerCase().match(/sistémico|larga duración/)) {
      logger.info(`[AplicacionHandler] Producto con reingreso detectado: ${metricas.producto}`)
    }
    return entrada
  }

  async prepareFormData(programacion, actividad) {
    const metricas = actividad.metricas || {}
    const formatoReporte = actividad.expand?.tipo_actividades?.formato_reporte

    return {
      actividad_realizada_id: actividad.id,
      programacion_origen: programacion.id,
      siembra_asociada_id: programacion.siembras?.[0] || null,
      metricasToPreload: this.transform(metricas, formatoReporte).flat,
      observacionesPreload: this.generateAutoObservaciones(metricas, formatoReporte),
      fechaEjecucion: new Date().toISOString().split('T')[0]
    }
  }
}

/**
 * Handler para actividades de Monitoreo
 */
class MonitoreoHandler extends BaseBitacoraHandler {
  constructor() {
    super('monitoreo')
  }

  validate(datos, context = {}) {
    const errors = []
    const warnings = []

    // Fecha obligatoria
    if (!datos.fecha_monitoreo || isNaN(new Date(datos.fecha_monitoreo).getTime())) {
      errors.push('La fecha de monitoreo es requerida')
    }

    // Validaciones de rangos
    if (datos.temperatura !== undefined && datos.temperatura !== null) {
      if (datos.temperatura < -50 || datos.temperatura > 60) {
        errors.push('Temperatura fuera de rango válido (-50 a 60°C)')
      }
    }

    if (datos.humedad !== undefined && datos.humedad !== null) {
      if (datos.humedad < 0 || datos.humedad > 100) {
        errors.push('Humedad fuera de rango válido (0 a 100%)')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  transform(metricas, formatoReporte = null) {
    return transformMetricasByTipo(metricas, 'monitoreo', formatoReporte)
  }

  async prepareFormData(programacion, actividad) {
    const metricas = actividad.metricas || {}
    const formatoReporte = actividad.expand?.tipo_actividades?.formato_reporte

    return {
      actividad_realizada_id: actividad.id,
      programacion_origen: programacion.id,
      metricasToPreload: this.transform(metricas, formatoReporte).flat,
      observacionesPreload: '',
      fechaEjecucion: new Date().toISOString().split('T')[0]
    }
  }
}

/**
 * Handler para actividades de Riego
 */
class RiegoHandler extends BaseBitacoraHandler {
  constructor() {
    super('riego')
  }

  validate(datos, context = {}) {
    const errors = []
    const warnings = []

    // Validar método
    if (!datos.metodo || datos.metodo.trim() === '') {
      errors.push('El método de riego es requerido')
    }

    // Validar cantidad o tiempo
    if (!datos.dosis_agua && !datos.tiempo_horas) {
      errors.push('Se requiere dosis de agua o tiempo de riego')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  transform(metricas, formatoReporte = null) {
    return transformMetricasByTipo(metricas, 'riego', formatoReporte)
  }

  async prepareFormData(programacion, actividad) {
    const metricas = actividad.metricas || {}
    const formatoReporte = actividad.expand?.tipo_actividades?.formato_reporte

    return {
      actividad_realizada_id: actividad.id,
      programacion_origen: programacion.id,
      siembra_asociada_id: programacion.siembras?.[0] || null,
      metricasToPreload: this.transform(metricas, formatoReporte).flat,
      observacionesPreload: this.generateAutoObservaciones(metricas, formatoReporte),
      fechaEjecucion: new Date().toISOString().split('T')[0]
    }
  }
}

/**
 * Handler para actividades de Fertilización
 */
class FertilizacionHandler extends BaseBitacoraHandler {
  constructor() {
    super('fertilizacion')
  }

  validate(datos, context = {}) {
    const errors = []
    const warnings = []

    // Validar tipo
    if (!datos.tipo_fertilizante || datos.tipo_fertilizante.trim() === '') {
      errors.push('El tipo de fertilizante es requerido')
    }

    // Validar dosis
    if (!datos.dosis || datos.dosis <= 0) {
      errors.push('La dosis es requerida y debe ser mayor a 0')
    }

    // Advertir si no hay fórmula NPK
    if (!datos.formula && !datos.npk) {
      warnings.push('Recomendable incluir fórmula NPK del fertilizante')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  transform(metricas, formatoReporte = null) {
    return transformMetricasByTipo(metricas, 'fertilizacion', formatoReporte)
  }

  async prepareFormData(programacion, actividad) {
    const metricas = actividad.metricas || {}
    const formatoReporte = actividad.expand?.tipo_actividades?.formato_reporte

    return {
      actividad_realizada_id: actividad.id,
      programacion_origen: programacion.id,
      siembra_asociada_id: programacion.siembras?.[0] || null,
      metricasToPreload: this.transform(metricas, formatoReporte).flat,
      observacionesPreload: this.generateAutoObservaciones(metricas, formatoReporte),
      fechaEjecucion: new Date().toISOString().split('T')[0]
    }
  }
}

/**
 * Handler genérico para tipos no específicos
 */
class GenericHandler extends BaseBitacoraHandler {
  constructor(tipo) {
    super(tipo || 'generico')
  }

  validate(datos, context = {}) {
    // Validación genérica: verificar que haya datos
    const errors = []

    if (!datos || Object.keys(datos).length === 0) {
      errors.push('No hay datos para validar')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    }
  }

  transform(metricas, formatoReporte = null) {
    return transformMetricasByTipo(metricas, this.tipo, formatoReporte)
  }

  async prepareFormData(programacion, actividad) {
    const metricas = actividad.metricas || {}
    const formatoReporte = actividad.expand?.tipo_actividades?.formato_reporte

    return {
      actividad_realizada_id: actividad.id,
      programacion_origen: programacion.id,
      siembra_asociada_id: programacion.siembras?.[0] || null,
      metricasToPreload: this.transform(metricas, formatoReporte).flat,
      observacionesPreload: this.generateAutoObservaciones(metricas, formatoReporte),
      fechaEjecucion: new Date().toISOString().split('T')[0]
    }
  }
}

/**
 * Registro de handlers por tipo de actividad
 */
const HANDLERS_REGISTRY = {
  siembra: new SiembraHandler(),
  cosecha: new CosechaHandler(),
  aplicacion: new AplicacionHandler(),
  monitoreo: new MonitoreoHandler(),
  riego: new RiegoHandler(),
  fertilizacion: new FertilizacionHandler(),
  labranza: new GenericHandler('labranza'),
  poda: new GenericHandler('poda')
}

/**
 * Obtiene el handler apropiado para un tipo de actividad
 * @param {string} tipoActividad - Tipo de actividad (nombre o ID)
 * @param {Object} actividadesStore - Store de actividades (opcional, para buscar nombre por ID)
 * @returns {BaseBitacoraHandler} Handler apropiado
 */
export async function getHandlerForTipo(tipoActividad, actividadesStore = null) {
  // Si es un ID, intentar obtener el nombre
  if (actividadesStore && tipoActividad && tipoActividad.length > 10) {
    try {
      const tipo = await actividadesStore.tiposActividades.find(t => t.id === tipoActividad)
      if (tipo) {
        tipoActividad = tipo.nombre
      }
    } catch (e) {
      logger.warn(`[bitacoraHandlers] No se pudo resolver tipo ID: ${tipoActividad}`)
    }
  }

  // Normalizar nombre
  const tipoNormalizado = normalizeTipoNombre(tipoActividad)

  // Buscar handler específico
  let handler = HANDLERS_REGISTRY[tipoNormalizado]

  // Si no hay handler específico, usar genérico
  if (!handler) {
    logger.info(`[bitacoraHandlers] No hay handler específico para: ${tipoNormalizado}, usando genérico`)
    handler = new GenericHandler(tipoNormalizado)
  }

  return handler
}

/**
 * Normaliza el nombre del tipo de actividad para buscar handlers
 * @param {string} tipo - Tipo de actividad
 * @returns {string} Tipo normalizado
 */
function normalizeTipoNombre(tipo) {
  if (!tipo) return 'generico'

  return tipo
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
 * Procesa una entrada de bitácora completa usando el handler apropiado
 * @param {Object} datos - Datos de la entrada
 * @param {string} tipoActividad - Tipo de actividad
 * @param {Object} actividadesStore - Store de actividades
 * @returns {Promise<Object>} Datos procesados
 */
export async function processBitacoraEntry(datos, tipoActividad, actividadesStore) {
  const handler = await getHandlerForTipo(tipoActividad, actividadesStore)

  // 1. Validar
  const validation = handler.validate(datos.metricas || {})
  if (!validation.valid) {
    throw new Error(`Validación fallida: ${validation.errors.join(', ')}`)
  }

  // 2. Transformar métricas
  const transformedMetricas = handler.transform(datos.metricas)

  // 3. Retornar datos procesados
  return {
    ...datos,
    metricasTransformadas: transformedMetricas,
    validationWarnings: validation.warnings
  }
}

/**
 * Exporta el registro de handlers para acceso directo si es necesario
 */
export { HANDLERS_REGISTRY as BITACORA_HANDLERS }

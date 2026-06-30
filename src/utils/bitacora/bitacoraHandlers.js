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
    // Delegar validación al validador central
    const result = validateBitacoraEntry(datos, this.tipo, context.tipoActividadData)

    // Solo mantener warnings específicos del handler
    const warnings = [...(result.warnings || [])]

    return {
      valid: result.valid,
      errors: result.errors,
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
    // Delegar validación al validador central
    const result = validateBitacoraEntry(datos, this.tipo, context.tipoActividadData)

    // Solo mantener warnings específicos del handler
    const warnings = [...(result.warnings || [])]

    return {
      valid: result.valid,
      errors: result.errors,
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
    // Delegar validación al validador central
    const result = validateBitacoraEntry(datos, this.tipo, context.tipoActividadData)

    // Solo mantener warnings específicos del handler
    const warnings = [...(result.warnings || [])]

    return {
      valid: result.valid,
      errors: result.errors,
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

    try {
      let monto = Number(metricas.costo_total_aplicacion) || 0;

      if (monto <= 0) {
        const { useHaciendaStore } = await import('@/stores/haciendaStore');
        const haciendaStore = useHaciendaStore();
        if (haciendaStore.isModuleActive('kardex_bodega')) {
          const { useBodegaStore } = await import('@/stores/bodegaStore');
          const bodegaStore = useBodegaStore();
          const item = bodegaStore.items.find(i =>
            i.nombre?.toLowerCase() === (metricas.producto_aplicado || metricas.producto)?.toLowerCase()
          );
          if (item) {
            const precio = item.costo_promedio_ponderado || item.costo_adquisicion || 0;
            const cantidad = Number(metricas.dosis) || 0;
            monto = precio * cantidad;
          }
        }
      }

      if (monto > 0) {
        const { useFinanzaStore } = await import('@/stores/finanzaStore');
        const { useAuthStore } = await import('@/stores/authStore');
        const finanzaStore = useFinanzaStore();
        const authStore = useAuthStore();
        
        await finanzaStore.crearRegistro({
          fecha: entrada.fecha || entrada.fecha_ejecucion || new Date().toISOString(),
          detalle: `Aplicación: ${metricas.producto_aplicado || metricas.producto || 'Insumo'}`,
          razon_social: '',
          factura: `BIT-${entrada.id}`,
          costo: 'MATERIALES',
          comentarios: `Área: ${metricas.area_aplicada || '?'} ha`,
          monto,
          pagado_por: authStore.user?.id
        });
      } else {
        logger.info('[AplicacionHandler] Sin costo calculable, omitiendo entrada en Finanzas.');
      }
    } catch (error) {
      logger.warn('[AplicacionHandler] Error al auto-registrar en finanzas:', error);
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
    // Delegar validación al validador central
    const result = validateBitacoraEntry(datos, this.tipo, context.tipoActividadData)

    // Solo mantener warnings específicos del handler
    const warnings = [...(result.warnings || [])]

    return {
      valid: result.valid,
      errors: result.errors,
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
    // Delegar validación al validador central
    const result = validateBitacoraEntry(datos, this.tipo, context.tipoActividadData)

    // Solo mantener warnings específicos del handler
    const warnings = [...(result.warnings || [])]

    return {
      valid: result.valid,
      errors: result.errors,
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
    // Delegar validación al validador central
    const result = validateBitacoraEntry(datos, this.tipo, context.tipoActividadData)

    // Solo mantener warnings específicos del handler
    const warnings = [...(result.warnings || [])]

    return {
      valid: result.valid,
      errors: result.errors,
      warnings
    }
  }

  transform(metricas, formatoReporte = null) {
    return transformMetricasByTipo(metricas, 'fertilizacion', formatoReporte)
  }

  async postProcess(entrada, context = {}) {
    const metricas = entrada.metricas || {};
    try {
      let monto = Number(metricas.costo_total_aplicacion) || 0;

      if (monto <= 0) {
        const { useHaciendaStore } = await import('@/stores/haciendaStore');
        const haciendaStore = useHaciendaStore();
        if (haciendaStore.isModuleActive('kardex_bodega')) {
          const { useBodegaStore } = await import('@/stores/bodegaStore');
          const bodegaStore = useBodegaStore();
          const item = bodegaStore.items.find(i =>
            i.nombre?.toLowerCase() === (metricas.producto_aplicado || metricas.producto)?.toLowerCase()
          );
          if (item) {
            const precio = item.costo_promedio_ponderado || item.costo_adquisicion || 0;
            const cantidad = Number(metricas.dosis) || 0;
            monto = precio * cantidad;
          }
        }
      }

      if (monto > 0) {
        const { useFinanzaStore } = await import('@/stores/finanzaStore');
        const { useAuthStore } = await import('@/stores/authStore');
        const finanzaStore = useFinanzaStore();
        const authStore = useAuthStore();
        
        await finanzaStore.crearRegistro({
          fecha: entrada.fecha || entrada.fecha_ejecucion || new Date().toISOString(),
          detalle: `Fertilización: ${metricas.producto_aplicado || metricas.producto || 'Insumo'}`,
          razon_social: '',
          factura: `BIT-${entrada.id}`,
          costo: 'MATERIALES',
          comentarios: `Área: ${metricas.area_aplicada || '?'} ha`,
          monto,
          pagado_por: authStore.user?.id
        });
      } else {
        logger.info('[FertilizacionHandler] Sin costo calculable, omitiendo entrada en Finanzas.');
      }
    } catch (error) {
      logger.warn('[FertilizacionHandler] Error al auto-registrar en finanzas:', error);
    }

    return entrada;
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
    // Delegar validación al validador central
    const result = validateBitacoraEntry(datos, this.tipo, context.tipoActividadData)

    // Solo mantener warnings específicos del handler
    const warnings = [...(result.warnings || [])]

    return {
      valid: result.valid,
      errors: result.errors,
      warnings
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
  fertilizacion_y_nutricion: new FertilizacionHandler(),
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
  if (Array.isArray(tipoActividad)) {
    tipoActividad = tipoActividad[0];
  }

  // Si es un ID, intentar obtener el nombre
  if (actividadesStore && typeof tipoActividad === 'string' && tipoActividad.length > 10) {
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

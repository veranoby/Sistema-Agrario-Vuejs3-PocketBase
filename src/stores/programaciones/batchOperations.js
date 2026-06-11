/**
 * batchOperations.js
 * Batch operations for programaciones
 * @module programaciones/batchOperations
 */

import { logger } from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import { format } from 'date-fns'
import {
  calcularProximaEjecucion,
  calcularEjecucionesPendientes,
  formatToISOString
} from './utils/dateCalculators'
import { getHandlerForTipo, processBitacoraEntry } from '@/utils/bitacora/bitacoraHandlers'
import { validateBitacoraEntry } from '@/utils/validators/bitacoraValidators'
import { transformMetricasByTipo } from '@/utils/bitacoraMetricTransformer'

/**
 * Prepares data for creating bitacora entries from programacion
 * ENHANCED: Ahora usa handlers especializados por tipo de actividad
 * @param {Object} programacion - Programacion object
 * @param {Object} actividadesStore - Actividades store instance
 * @returns {Promise<Object|null>} Prepared data object or null if error
 */
export async function prepareBitacoraEntryData(programacion, actividadesStore) {
  try {
    if (!programacion || !programacion.actividades || programacion.actividades.length === 0) {
      logger.error('[batchOperations] No activities found in the programacion object. programacion:', JSON.stringify(programacion))
      return null
    }

    const primaryActivityId = programacion.actividades[0]
    logger.debug(`[batchOperations] Buscando actividad: ${primaryActivityId}`)

    // Siempre hacer fetch con expand para garantizar tipo_actividades resuelto
    let actividad = null
    try {
      actividad = await actividadesStore.fetchActividadById(primaryActivityId, { expand: 'tipo_actividades' })
    } catch (fetchError) {
      logger.error(`[batchOperations] Error fetching activity ${primaryActivityId}:`, fetchError?.message || fetchError)
      return null
    }

    if (!actividad) {
      logger.error(`[batchOperations] Activity ${primaryActivityId} could not be found or fetched.`)
      return null
    }

    logger.debug('[batchOperations] Actividad obtenida:', {
      id: actividad.id,
      tipo_actividades: actividad.tipo_actividades,
      expand_tipo: actividad.expand?.tipo_actividades
    })

    // Obtener tipo de actividad — normalizar si es Array
    let tipoActividadId = Array.isArray(actividad.tipo_actividades) 
      ? actividad.tipo_actividades[0] 
      : actividad.tipo_actividades

    let tipoActividad = null

    // Primero intentar desde expand (ya resuelto por PocketBase)
    if (actividad.expand?.tipo_actividades) {
      tipoActividad = Array.isArray(actividad.expand.tipo_actividades)
        ? actividad.expand.tipo_actividades[0]
        : actividad.expand.tipo_actividades
    }

    // Fallback: buscar en el store de tipos
    if (!tipoActividad && tipoActividadId) {
      if (actividadesStore.tiposActividades.length === 0) {
        await actividadesStore.cargarTiposActividades()
      }
      tipoActividad = actividadesStore.tiposActividades.find(ta => ta.id === tipoActividadId)
    }

    logger.debug('[batchOperations] tipoActividad resuelto:', tipoActividad?.nombre || tipoActividadId || 'NINGUNO')

    // Obtener handler especializado para este tipo
    const handler = await getHandlerForTipo(
      tipoActividad?.nombre || tipoActividadId,
      actividadesStore
    )

    // Usar handler para preparar datos del formulario
    const prefillDataObject = await handler.prepareFormData(programacion, actividad)

    // Validar datos preparados usando el handler
    const metricasCrudas = actividad.metricas || {}
    const validation = handler.validate(metricasCrudas)

    if (!validation.valid) {
      logger.warn('[batchOperations] Validation warnings for prepared data:', validation.warnings)
    }

    logger.debug('[batchOperations] Prepared data for Bitacora Entry:', prefillDataObject)
    return prefillDataObject
  } catch (error) {
    // Usar console.error directamente para ver el mensaje real (el logger lo suprime)
    console.error('[batchOperations] REAL ERROR:', error)
    console.error('[batchOperations] MENSAJE:', error?.message)
    console.error('[batchOperations] STACK:', error?.stack)
    logger.error('[batchOperations] Error preparing bitacora entry data:', error?.message || String(error))
    return null
  }
}

/**
 * Validates siembra context for a programacion
 * @param {string} programacionId - Programacion ID
 * @param {string|null} siembraId - Siembra ID to validate
 * @param {Array} programaciones - Array of programaciones to search
 * @returns {Object} Validation result { valid, error?, message? }
 */
export function validateSiembraContext(programacionId, siembraId, programaciones) {
  if (!siembraId) {
    logger.warn('[batchOperations] No siembraId provided for validation')
    return { valid: true, warning: 'No siembra context specified' }
  }

  const programacion = programaciones.find(p => p.id === programacionId)
  if (!programacion) {
    return { valid: false, error: `Programación ${programacionId} no encontrada` }
  }

  if (!programacion.siembras || !Array.isArray(programacion.siembras)) {
    return { valid: false, error: 'Programación no tiene siembras asociadas' }
  }

  if (!programacion.siembras.includes(siembraId)) {
    return {
      valid: false,
      error: `Siembra ${siembraId} no está asociada a la programación ${programacionId}`
    }
  }

  return { valid: true, message: 'Siembra context validated successfully' }
}

/**
 * Executes a batch of programaciones for multiple dates
 * @param {Object} payload - Batch execution payload
 * @param {string} payload.programacionId - Programacion ID
 * @param {Array<string>} payload.fechasEjecucion - Array of execution dates
 * @param {string} payload.observacionesAdicionales - Additional observations
 * @param {string|null} payload.siembraId - Siembra ID for context isolation
 * @param {Array<string>} payload.metricasSeleccionadas - Selected metrics to include
 * @param {Object} stores - Object containing required stores
 * @returns {Promise<Object>} Execution result
 */
export async function ejecutarProgramacionesBatch(payload, stores) {
  const { programacionId, fechasEjecucion, observacionesAdicionales = '', siembraId = null, metricasSeleccionadas = [], signature = null, bpa_respuestas = {} } = payload
  const { actividadesStore, bitacoraStore, uiFeedbackStore, programaciones } = stores

  try {
    // Validate siembra context to prevent cross-siembra data corruption
    if (!siembraId) {
      logger.warn('[batchOperations] No siembraId provided for batch execution - proceeding without siembra isolation')
    }

    const programacion = programaciones.find(p => p.id === programacionId)
    if (!programacion) {
      logger.error(`[batchOperations] Programacion ${programacionId} no encontrada.`)
      throw new Error(`Programación ${programacionId} no encontrada`)
    }

    // Validate siembra context against programacion's siembras
    if (siembraId && programacion.siembras && Array.isArray(programacion.siembras)) {
      if (!programacion.siembras.includes(siembraId)) {
        logger.error(`[batchOperations] SiembraId ${siembraId} not associated with programacion ${programacionId}`)
        throw new Error('La siembra especificada no está asociada a esta programación')
      }
    }

    if (!programacion.actividades || programacion.actividades.length === 0) {
      logger.error(`[batchOperations] Programacion ${programacionId} no tiene actividades asociadas.`)
      throw new Error(`Programación ${programacionId} no tiene actividades`)
    }

    const primaryActivityId = programacion.actividades[0]
    let actividad
    try {
      actividad = await actividadesStore.fetchActividadById(primaryActivityId, { expand: 'tipo_actividades' })
    } catch (error) {
      logger.error(`[batchOperations] Error fetching actividad ${primaryActivityId}:`, error)
      throw new Error(`Error cargando actividad ${primaryActivityId}`)
    }

    if (!actividad) {
      logger.error(`[batchOperations] Actividad ${primaryActivityId} no pudo ser cargada.`)
      throw new Error(`Actividad ${primaryActivityId} no pudo ser cargada`)
    }

    // ENHANCED: Usar handler especializado para procesar métricas
    const handler = await getHandlerForTipo(
      actividad.expand?.tipo_actividades?.nombre || actividad.tipo_actividades,
      actividadesStore
    )

    // Validar métricas antes de procesar
    const validation = handler.validate(actividad.metricas || {})
    if (!validation.valid) {
      logger.error('[batchOperations] Validation failed for batch execution:', validation.errors)
      throw new Error(`Validación de métricas fallida: ${validation.errors.join(', ')}`)
    }

    // Transformar métricas usando el handler
    const transformedMetricas = handler.transform(
      actividad.metricas || {},
      actividad.expand?.tipo_actividades?.formato_reporte
    )

    // Preparar métricas para submit según selección
    const metricasToSubmit = {}
    const metricasCrudas = actividad.metricas || {}

    if (metricasSeleccionadas.length > 0) {
      // Filtrar por métricas seleccionadas
      for (const key of metricasSeleccionadas) {
        if (payload.metricasValues && payload.metricasValues[key] !== undefined) {
          metricasToSubmit[key] = payload.metricasValues[key]
        } else if (transformedMetricas.flat[key] !== undefined) {
          metricasToSubmit[key] = transformedMetricas.flat[key]
        } else if (metricasCrudas[key]?.valor !== undefined) {
          metricasToSubmit[key] = metricasCrudas[key].valor
        }
      }
    } else {
      // Incluir todas las métricas usando valores ingresados (si existen) o defecto
      const sourceKeys = Object.keys(transformedMetricas.flat).length > 0 
        ? Object.keys(transformedMetricas.flat) 
        : Object.keys(metricasCrudas);

      for (const key of sourceKeys) {
         if (payload.metricasValues && payload.metricasValues[key] !== undefined) {
           metricasToSubmit[key] = payload.metricasValues[key]
         } else if (transformedMetricas.flat[key] !== undefined) {
           metricasToSubmit[key] = transformedMetricas.flat[key]
         } else if (metricasCrudas[key]?.valor !== undefined) {
           metricasToSubmit[key] = metricasCrudas[key].valor
         }
      }
    }

    // Generar observaciones automáticas usando el handler
    const observacionesContent = handler.generateAutoObservaciones(
      metricasCrudas,
      actividad.expand?.tipo_actividades?.formato_reporte
    )

    // Combine auto-generated observaciones with additional user input
    const finalObservaciones = [observacionesContent, observacionesAdicionales]
      .filter(obs => obs && obs.trim())
      .join('\n\n')

    const batchId = 'batch_' + Date.now()
    const finalObservacionesConBatch = [finalObservaciones, `[Lote de Ejecución: ${batchId}]` ]
      .filter(obs => obs && obs.trim())
      .join('\n\n')

    let successfulExecutions = 0
    let latestSuccessfullyExecutedDate = null

    const sortedDates = [...fechasEjecucion].sort((a, b) => new Date(a) - new Date(b))

    for (const dateString of sortedDates) {
      // Create bitacora entries ONLY for the specified siembra context
      const entryData = {
        programacion_origen: programacionId,
        actividad_realizada: primaryActivityId,
        fecha_ejecucion: new Date(dateString + 'T00:00:00.000Z').toISOString(),
        estado_ejecucion: 'completado',
        // Use the specific siembraId if provided, otherwise fall back to programacion's first siembra
        siembra_asociada: siembraId || (programacion.siembras && programacion.siembras.length > 0 ? programacion.siembras[0] : null),
        // Ensure siembras array includes the specific siembra context
        siembras: siembraId ? [siembraId] : (programacion.siembras || []),
        metricas: { ...metricasToSubmit },
        notas: finalObservacionesConBatch,
        bpa_respuestas: bpa_respuestas,
        signature: signature
      }

      try {
        await bitacoraStore.crearBitacoraEntry(entryData)
        successfulExecutions++
        latestSuccessfullyExecutedDate = dateString
      } catch (error) {
        logger.error(`[batchOperations] Error creando entrada de bitácora para fecha ${dateString}:`, error)
        // Continue with next date
      }
    }

    return {
      successfulExecutions,
      totalExecutions: sortedDates.length,
      latestSuccessfullyExecutedDate
    }
  } catch (error) {
    logger.error('[batchOperations] Error in ejecutarProgramacionesBatch:', error)
    throw error
  }
}

/**
 * Finalizes programacion execution after batch completion
 * @param {Object} payload - Finalization payload
 * @param {string} payload.programacionId - Programacion ID
 * @param {string} payload.fechaEjecucionReal - Real execution date
 * @param {Object} programacion - Programacion object
 * @returns {Promise<Object>} Finalization data with updated dates
 */
export async function finalizeProgramacionExecution(payload, programacion) {
  try {
    const { programacionId, fechaEjecucionReal } = payload

    const dateParts = fechaEjecucionReal.split('T')[0].split('-')
    const year = parseInt(dateParts[0], 10)
    const month = parseInt(dateParts[1], 10) - 1
    const day = parseInt(dateParts[2], 10)

    const newUltimaEjecucionDate = new Date(Date.UTC(year, month, day, 0, 0, 0))
    const newUltimaEjecucionISO = newUltimaEjecucionDate.toISOString()

    const tempProgForCalc = {
      ...programacion,
      ultima_ejecucion: newUltimaEjecucionISO
    }

    const proximaEjecucionDate = calcularProximaEjecucion(tempProgForCalc)
    const proxima_ejecucion_iso = proximaEjecucionDate.toISOString()
    const ejecucionesPendientes = 0

    logger.debug(`[batchOperations] Finalized execution for programacion ${programacionId}. New ultima_ejecucion: ${newUltimaEjecucionISO}, new proxima_ejecucion: ${proxima_ejecucion_iso}`)

    return {
      ultima_ejecucion: newUltimaEjecucionISO,
      proxima_ejecucion: proxima_ejecucion_iso,
      ejecucionesPendientes: ejecucionesPendientes
    }
  } catch (error) {
    logger.error(`[batchOperations] Error finalizing programacion execution:`, error)
    throw error
  }
}

/**
 * Updates programacion after batch execution
 * @param {string} programacionId - Programacion ID
 * @param {string} latestSuccessfullyExecutedDate - Latest executed date
 * @param {Object} programacion - Programacion object
 * @returns {Promise<Object>} Update data
 */
export async function updateProgramacionAfterBatch(programacionId, latestSuccessfullyExecutedDate, programacion) {
  try {
    const dateParts = latestSuccessfullyExecutedDate.split('-')
    const year = parseInt(dateParts[0], 10)
    const month = parseInt(dateParts[1], 10) - 1
    const day = parseInt(dateParts[2], 10)
    const latestDateObj = new Date(Date.UTC(year, month, day, 0, 0, 0))
    const latestSuccessfullyExecutedDateISO = latestDateObj.toISOString()

    const tempProgForCalc = {
      ...programacion,
      ultima_ejecucion: latestSuccessfullyExecutedDateISO
    }

    const proximaEjecucionDate = calcularProximaEjecucion(tempProgForCalc)
    const proxima_ejecucion_iso = proximaEjecucionDate.toISOString()
    const ejecuciones_pendientes = calcularEjecucionesPendientes(tempProgForCalc)

    return {
      ultima_ejecucion: latestSuccessfullyExecutedDateISO,
      proxima_ejecucion: proxima_ejecucion_iso,
      ejecucionesPendientes: ejecuciones_pendientes
    }
  } catch (error) {
    logger.error('[batchOperations] Error updating programacion after batch:', error)
    throw error
  }
}

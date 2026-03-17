/**
 * Scheduler - Sistema de ejecución automática de programaciones
 *
 * Funcionalidad:
 * - Verifica programaciones pendientes cada 5 minutos
 * - Ejecuta automáticamente programaciones vencidas
 * - Crea bitácoras automáticamente para cumplimiento
 * - Integra con notificationStore para alertas
 */

import { pb } from '@/utils/pocketbase'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { getSchedulerOptimizer } from '@/utils/schedulerOptimizer'
import { logger } from '@/utils/logger'

export class Scheduler {
  constructor() {
    this.cronJob = null
    this.checkInterval = 5 * 60 * 1000 // 5 minutos
    this.isRunning = false
    this.executedCount = 0
    this.lastCheck = null
  }

  /**
   * Inicia el scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('[Scheduler] Ya está corriendo, omitiendo inicio')
      return
    }

    logger.debug('[Scheduler] Iniciando scheduler...')
    this.isRunning = true

    // Ejecutar verificación inmediata
    this.checkAndExecute().catch(error => {
      logger.error('[Scheduler] Error en verificación inicial:', error)
    })

    // Configurar intervalo periódico
    this.cronJob = setInterval(() => {
      this.checkAndExecute().catch(error => {
        logger.error('[Scheduler] Error en verificación periódica:', error)
      })
    }, this.checkInterval)

    logger.debug(`[Scheduler] Iniciado - verificando cada ${this.checkInterval / 60000} minutos`)
  }

  /**
   * Detiene el scheduler
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('[Scheduler] No está corriendo, omitiendo detención')
      return
    }

    logger.debug('[Scheduler] Deteniendo scheduler...')

    if (this.cronJob) {
      clearInterval(this.cronJob)
      this.cronJob = null
    }

    this.isRunning = false
    this.executedCount = 0
    logger.debug('[Scheduler] Detenido')
  }

  /**
   * Verifica y ejecuta programaciones pendientes (versión optimizada)
   */
  async checkAndExecute() {
    if (!pb.authStore.isValid) {
      logger.debug('[Scheduler] Usuario no autenticado, omitiendo verificación')
      return
    }

    // Usar optimizador para reducir llamadas a PocketBase
    const optimizer = getSchedulerOptimizer()

    // Verificar si debe hacer check (evita llamadas innecesarias)
    if (!optimizer.shouldCheckNow()) {
      logger.debug('[Scheduler] Omitiendo verificación por inactividad')
      return
    }

    const startTime = performance.now()
    this.lastCheck = new Date().toISOString()

    try {
      logger.debug(`[Scheduler] Iniciando verificación optimizada: ${new Date(this.lastCheck).toLocaleString()}`)

      // Usar check optimizado con caché
      const result = await optimizer.checkPendingProgramacionesOptimized()

      // Si usó caché y no hay pendientes, retornar temprano
      if (result.cached && result.programaciones?.length === 0) {
        logger.debug('[Scheduler] Caché válido, no hay pendientes')
        return
      }

      const programaciones = result.programaciones || []
      logger.debug(`[Scheduler] ${programaciones.length} programaciones pendientes encontradas ${result.cached ? '(caché)' : '(fetch)'}`)

      if (programaciones.length === 0) {
        logger.debug('[Scheduler] No hay programaciones para ejecutar')
        return
      }

      // Ejecutar cada programación pendiente
      let successfulExecutions = 0
      let failedExecutions = 0

      for (const programacion of programaciones) {
        try {
          await this.executeProgramacion(programacion)
          successfulExecutions++
        } catch (error) {
          logger.error(`[Scheduler] Error ejecutando programación ${programacion.id}:`, error)
          failedExecutions++
        }
      }

      this.executedCount += successfulExecutions

      const elapsed = performance.now() - startTime
      logger.debug(`[Scheduler] Verificación completada en ${elapsed.toFixed(0)}ms - ${successfulExecutions} exitosas, ${failedExecutions} fallidas`)

      // Limpiar caché después de ejecutar para forzar refresh en próximo ciclo
      if (successfulExecutions > 0) {
        optimizer.clearCache()
      }

      // Notificar resumen
      if (successfulExecutions > 0) {
        this.notifyExecutionSummary(successfulExecutions, failedExecutions)
      }

    } catch (error) {
      logger.error('[Scheduler] Error en checkAndExecute:', error)
      handleError(error, 'Error verificando programaciones automáticas')
    }
  }

  /**
   * Ejecuta una programación específica
   */
  async executeProgramacion(programacion) {
    logger.debug(`[Scheduler] Ejecutando programación ${programacion.id}: ${programacion.descripcion}`)

    const programacionesStore = useProgramacionesStore()
    const bitacoraStore = useBitacoraStore()
    const notificationStore = useNotificationStore()
    const snackbarStore = useSnackbarStore()

    // Validar que tenga actividades
    if (!programacion.actividades || programacion.actividades.length === 0) {
      logger.warn(`[Scheduler] Programación ${programacion.id} no tiene actividades, omitiendo`)
      return
    }

    const primaryActivityId = programacion.actividades[0]
    const siembraId = programacion.siembras && programacion.siembras.length > 0
      ? programacion.siembras[0]
      : null

    // Obtener fechas pendientes para esta programación
    const fechasPendientes = programacionesStore.getFechasPendientes(programacion, siembraId)

    if (fechasPendientes.length === 0) {
      logger.debug(`[Scheduler] No hay fechas pendientes para programación ${programacion.id}`)
      return
    }

    logger.debug(`[Scheduler] Ejecutando ${fechasPendientes.length} fechas pendientes para programación ${programacion.id}`)

    // Ejecutar batch con todas las fechas pendientes
    try {
      await programacionesStore.ejecutarProgramacionesBatch({
        programacionId: programacion.id,
        fechasEjecucion: fechasPendientes,
        observacionesAdicionales: 'Ejecución automática por scheduler',
        siembraId: siembraId,
        metricasSeleccionadas: []
      })

      // Notificar éxito individual
      notificationStore.addNotification({
        title: 'Programación ejecutada automáticamente',
        message: `${programacion.descripcion} - ${fechasPendientes.length} fechas registradas`,
        type: 'success'
      })

      logger.debug(`[Scheduler] Programación ${programacion.id} ejecutada exitosamente`)

    } catch (error) {
      logger.error(`[Scheduler] Error ejecutando programación ${programacion.id}:`, error)

      notificationStore.addNotification({
        title: 'Error ejecutando programación',
        message: `${programacion.descripcion} - ${error.message}`,
        type: 'error'
      })

      throw error
    }
  }

  /**
   * Notifica resumen de ejecuciones
   */
  notifyExecutionSummary(successful, failed) {
    const snackbarStore = useSnackbarStore()

    if (failed === 0) {
      snackbarStore.showSnackbar(
        `${successful} programaciones ejecutadas automáticamente`,
        'success'
      )
    } else {
      snackbarStore.showSnackbar(
        `${successful} exitosas, ${failed} fallidas`,
        'warning'
      )
    }
  }

  /**
   * Ejecuta una verificación manual (on-demand)
   */
  async runManually() {
    logger.debug('[Scheduler] Ejecutando verificación manual...')
    await this.checkAndExecute()
  }

  /**
   * Obtiene estadísticas del scheduler
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      executedCount: this.executedCount,
      lastCheck: this.lastCheck,
      checkInterval: this.checkInterval,
      nextCheck: this.isRunning && this.lastCheck
        ? new Date(new Date(this.lastCheck).getTime() + this.checkInterval).toISOString()
        : null
    }
  }
}

// Singleton instance
let schedulerInstance = null

export function initScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new Scheduler()
    logger.debug('[Scheduler] Instancia creada')
  }
  return schedulerInstance
}

export function getScheduler() {
  if (!schedulerInstance) {
    logger.warn('[Scheduler] Instancia no inicializada, creando...')
    schedulerInstance = new Scheduler()
  }
  return schedulerInstance
}

export default schedulerInstance

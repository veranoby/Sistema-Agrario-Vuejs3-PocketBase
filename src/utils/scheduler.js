/**
 * Scheduler - Sistema de verificación de programaciones pendientes
 *
 * Funcionalidad:
 * - Verifica programaciones pendientes cada 5 minutos
 * - NOTIFICA al usuario sobre pendientes (NO ejecuta automáticamente)
 * - El usuario decide cuándo ejecutar desde el dashboard
 */

import { pb } from '@/utils/pocketbase'
import { useProgramacionesStore } from '@/stores/programacionesStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { handleError } from '@/utils/errorHandler'
import { getSchedulerOptimizer } from '@/utils/schedulerOptimizer'
import { logger } from '@/utils/logger'

export class Scheduler {
  constructor() {
    this.cronJob = null
    this.checkInterval = 5 * 60 * 1000 // 5 minutos
    this.isRunning = false
    this.lastCheck = null
    this.pendingProgramaciones = []
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
    this.checkPending().catch(error => {
      logger.error('[Scheduler] Error en verificación inicial:', error)
    })

    // Configurar intervalo periódico
    this.cronJob = setInterval(() => {
      this.checkPending().catch(error => {
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
    this.pendingProgramaciones = []
    logger.debug('[Scheduler] Detenido')
  }

  /**
   * Verifica programaciones pendientes (SOLO NOTIFICA, NO EJECUTA)
   */
  async checkPending() {
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

    this.lastCheck = new Date().toISOString()

    try {
      logger.debug(`[Scheduler] Verificando programaciones pendientes: ${new Date(this.lastCheck).toLocaleString()}`)

      // Usar check optimizado con caché
      const result = await optimizer.checkPendingProgramacionesOptimized()

      // Si usó caché y no hay pendientes, retornar temprano
      if (result.cached && result.programaciones?.length === 0) {
        logger.debug('[Scheduler] Caché válido, no hay pendientes')
        this.pendingProgramaciones = []
        return
      }

      const programaciones = result.programaciones || []
      this.pendingProgramaciones = programaciones

      logger.debug(`[Scheduler] ${programaciones.length} programaciones pendientes encontradas ${result.cached ? '(caché)' : '(fetch)'}`)

      if (programaciones.length === 0) {
        logger.debug('[Scheduler] No hay programaciones pendientes')
        return
      }

      // SOLO NOTIFICAR, NO EJECUTAR
      const notificationStore = useNotificationStore()
      notificationStore.addNotification({
        title: 'Programaciones pendientes',
        message: `Tienes ${programaciones.length} programación${programaciones.length > 1 ? 'es' : ''} pendiente${programaciones.length > 1 ? 's' : ''} de ejecutar`,
        type: 'warning'
      })

      logger.debug(`[Scheduler] Notificación enviada: ${programaciones.length} programaciones pendientes`)

    } catch (error) {
      logger.error('[Scheduler] Error en checkPending:', error)
      handleError(error, 'Error verificando programaciones pendientes')
    }
  }

  /**
   * Ejecuta una verificación manual (on-demand)
   */
  async runManually() {
    logger.debug('[Scheduler] Ejecutando verificación manual...')
    await this.checkPending()
  }

  /**
   * Obtiene las programaciones pendientes actuales
   */
  getPendingProgramaciones() {
    return this.pendingProgramaciones
  }

  /**
   * Limpia las programaciones pendientes (después de ejecutar)
   */
  clearPending() {
    this.pendingProgramaciones = []
    const optimizer = getSchedulerOptimizer()
    optimizer.clearCache()
  }

  /**
   * Obtiene estadísticas del scheduler
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      checkInterval: this.checkInterval,
      pendingCount: this.pendingProgramaciones.length,
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

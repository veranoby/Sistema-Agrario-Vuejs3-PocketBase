/**
 * Scheduler - Sistema de verificación de programaciones pendientes
 *
 * Funcionalidad:
 * - Verifica programaciones pendientes cada 5 minutos
 * - NOTIFICA al usuario sobre pendientes (NO ejecuta automáticamente)
 * - El usuario decide cuándo ejecutar desde el dashboard
 */

import { pb } from '@/utils/pocketbase'
import { useProgramacionesStore } from '@/stores/programaciones'
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

    let authStore
    try {
      const { useAuthStore } = await import('@/stores/authStore')
      authStore = useAuthStore()
      if (authStore.isSuperAdmin) {
        logger.debug('[Scheduler] Usuario superadmin, omitiendo verificación')
        return
      }

      if (authStore.isAsesor) {
        await this.checkPendingAsesor(authStore.user)
        return
      }
    } catch(e) {
      logger.error('[Scheduler] Error al cargar authStore, abortando verificación:', e)
      return
    }

    let haciendaId = null
    try {
      const { useHaciendaStore } = await import('@/stores/haciendaStore')
      const haciendaStore = useHaciendaStore()
      haciendaId = haciendaStore.mi_hacienda?.id
    } catch(e) {
      logger.error('[Scheduler] Error al cargar haciendaStore, abortando verificación:', e)
      return
    }

    if (!haciendaId) {
      logger.debug('[Scheduler] Usuario sin hacienda activa, omitiendo verificación')
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
      const result = await optimizer.checkPendingProgramacionesOptimized(haciendaId)

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
      const hasUnread = notificationStore.notifications.some(n => !n.read && n.title === 'Programaciones pendientes')
      if (!hasUnread) {
        notificationStore.addNotification({
          title: 'Programaciones pendientes',
          message: `Tienes ${programaciones.length} programación${programaciones.length > 1 ? 'es' : ''} pendiente${programaciones.length > 1 ? 's' : ''} de ejecutar`,
          type: 'warning'
        })
      }

      logger.debug(`[Scheduler] Notificación enviada: ${programaciones.length} programaciones pendientes`)

      // ---- NUEVAS NOTIFICACIONES PARA HACIENDA (Administradores/Auditores) ----
      try {
        if (haciendaId) {
          // 1. Recordatorios pendientes
          try {
            const hoy = new Date().toISOString().split('T')[0]
            const recordatorios = await pb.collection('recordatorios').getList(1, 1, {
              filter: `hacienda = "${haciendaId}" && estado = "pendiente" && fecha_recordatorio <= "${hoy} 23:59:59"`,
              $cancelKey: 'hacienda_rec_sched'
            })
            if (recordatorios.totalItems > 0) {
              const hasUnreadRec = notificationStore.notifications.some(n => !n.read && n.tag === 'hacienda-recordatorios')
              if (!hasUnreadRec) {
                notificationStore.addNotification({
                  title: 'Recordatorios pendientes',
                  message: `Tienes ${recordatorios.totalItems} recordatorio(s) para hoy o atrasados.`,
                  type: 'info',
                  tag: 'hacienda-recordatorios'
                })
              }
            }
          } catch(e) {}

          // 2. Paquetes evaluados por asesores
          try {
            const paquetes = await pb.collection('paquetes_evaluacion').getList(1, 1, {
              filter: `hacienda_id = "${haciendaId}" && estado = "evaluado"`,
              $cancelKey: 'hacienda_paq_sched'
            })
            if (paquetes.totalItems > 0) {
              const hasUnreadPaq = notificationStore.notifications.some(n => !n.read && n.tag === 'hacienda-paquetes')
              if (!hasUnreadPaq) {
                notificationStore.addNotification({
                  title: 'Paquetes de asesores',
                  message: `Tienes ${paquetes.totalItems} paquete(s) evaluado(s) por revisar.`,
                  type: 'success',
                  tag: 'hacienda-paquetes'
                })
              }
            }
          } catch(e) {}

          // 3. Mensajes no leídos de asesores
          try {
            const vinculaciones = await pb.collection('vinculaciones_asesor').getFullList({
              filter: `hacienda_id = "${haciendaId}"`,
              $cancelKey: 'hacienda_vinc_sched'
            })
            if (vinculaciones.length > 0) {
              const vincIds = vinculaciones.map(v => `"${v.id}"`).join(',')
              const mensajes = await pb.collection('comunicaciones_asesoria').getList(1, 1, {
                filter: `vinculacion_id ?= [${vincIds}] && leido = false && emisor_id != "${authStore.user.id}"`,
                $cancelKey: 'hacienda_msg_sched'
              })
              if (mensajes.totalItems > 0) {
                const hasUnreadMsg = notificationStore.notifications.some(n => !n.read && n.tag === 'hacienda-mensajes')
                if (!hasUnreadMsg) {
                  notificationStore.addNotification({
                    title: 'Mensajes de asesores',
                    message: `Tienes ${mensajes.totalItems} mensaje(s) no leído(s) de tus asesores.`,
                    type: 'info',
                    tag: 'hacienda-mensajes'
                  })
                }
              }
            }
          } catch(e) {}
        }
      } catch (e) {
        logger.error('[Scheduler] Error verificando notificaciones extra de hacienda:', e)
      }

    } catch (error) {
      logger.error('[Scheduler] Error en checkPending:', error)
      handleError(error, 'Error verificando programaciones pendientes')
    }
  }

  /**
   * Verifica notificaciones exclusivas para Asesores
   */
  async checkPendingAsesor(user) {
    if (!user || user.role !== 'asesor') return

    try {
      logger.debug(`[Scheduler] Verificando notificaciones para asesor: ${user.id}`)
      const notificationStore = useNotificationStore()

      // 1. Solicitudes de conexión (vinculaciones_asesor pendientes)
      try {
        const vinculaciones = await pb.collection('vinculaciones_asesor').getList(1, 1, {
          filter: `asesor_id = "${user.id}" && estado = "pendiente" && iniciada_por != "${user.id}"`,
          $cancelKey: 'asesor_vinc_sched'
        })
        if (vinculaciones.totalItems > 0) {
          const hasUnread = notificationStore.notifications.some(n => !n.read && n.tag === 'asesor-vinculaciones')
          if (!hasUnread) {
            notificationStore.addNotification({
              title: 'Solicitudes de conexión',
              message: `Tienes ${vinculaciones.totalItems} solicitud(es) de conexión pendiente(s).`,
              type: 'info',
              tag: 'asesor-vinculaciones'
            })
          }
        }
      } catch (e) { /* ignore if collection doesn't exist */ }

      // 2. Paquetes entrantes (paquetes_evaluacion pendientes)
      try {
        const paquetes = await pb.collection('paquetes_evaluacion').getList(1, 1, {
          filter: `asesor_id = "${user.id}" && estado = "pendiente"`,
          $cancelKey: 'asesor_paq_sched'
        })
        if (paquetes.totalItems > 0) {
          const hasUnread = notificationStore.notifications.some(n => !n.read && n.tag === 'asesor-paquetes')
          if (!hasUnread) {
            notificationStore.addNotification({
              title: 'Paquetes de evaluación',
              message: `Tienes ${paquetes.totalItems} paquete(s) entrante(s) por responder.`,
              type: 'warning',
              tag: 'asesor-paquetes'
            })
          }
        }
      } catch (e) { /* ignore */ }

      // 3. Mensajes no leídos
      try {
        const vinculacionesAsesor = await pb.collection('vinculaciones_asesor').getFullList({
          filter: `asesor_id = "${user.id}"`,
          $cancelKey: 'asesor_vinc_list_sched'
        })
        
        if (vinculacionesAsesor.length > 0) {
          const vincIds = vinculacionesAsesor.map(v => `"${v.id}"`).join(',')
          const mensajes = await pb.collection('comunicaciones_asesoria').getList(1, 1, {
            filter: `vinculacion_id ?= [${vincIds}] && leido = false && emisor_id != "${user.id}"`,
            $cancelKey: 'asesor_msg_sched'
          })
          if (mensajes.totalItems > 0) {
            const hasUnread = notificationStore.notifications.some(n => !n.read && n.tag === 'asesor-mensajes')
            if (!hasUnread) {
              notificationStore.addNotification({
                title: 'Nuevos mensajes',
                message: `Tienes ${mensajes.totalItems} mensaje(s) no leído(s).`,
                type: 'info',
                tag: 'asesor-mensajes'
              })
            }
          }
        }
      } catch (e) { /* ignore */ }

    } catch (error) {
      logger.error('[Scheduler] Error verificando pendientes de asesor:', error)
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

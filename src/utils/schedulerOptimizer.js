/**
 * Scheduler Optimizer - Optimiza las llamadas a PocketBase del scheduler
 *
 * Estrategias:
 * 1. Caché inteligente de programaciones
 * 2. Debounce de llamadas
 * 3. Detección de cambios delta
 * 4. Background sync solo cuando es necesario
 */

import { pb } from '@/utils/pocketbase'
import { useProgramacionesStore } from '@/stores/programaciones'

export class SchedulerOptimizer {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 10 * 60 * 1000 // 10 minutos
    this.lastFullSync = null
    this.syncInProgress = false
    this.pendingSync = false
    this.debounceTimer = null
    this.debounceDelay = 30 * 1000 // 30 segundos debounce
  }

  /**
   * Verifica si hay programaciones pendientes (versión optimizada)
   * - Usa caché cuando es posible
   * - Solo hace request si hay cambios probables
   */
  async checkPendingProgramacionesOptimized() {
    // Si ya hay un sync en progreso, no hacer otro
    if (this.syncInProgress) {
      this.pendingSync = true
      return { cached: true, count: this.getCachedPendingCount() }
    }

    // Verificar si el caché es válido
    if (this.isCacheValid()) {
      const cached = this.getCachedPending()
       // console.log('[SchedulerOptimizer] Usando caché - pendientes:', cached.length)
      return { cached: true, programaciones: cached }
    }

    // Hacer fetch optimizado (solo IDs y fechas críticas)
    return await this.fetchOptimizedPending()
  }

  /**
   * Fetch optimizado - solo campos necesarios
   */
  async fetchOptimizedPending() {
    this.syncInProgress = true

    try {
      const now = new Date().toISOString()

      // Solo traer campos necesarios para determinar si está pendiente
      const programaciones = await pb.collection('programaciones').getFullList({
        filter: `estado = "activo" && proxima_ejecucion <= "${now}"`,
        fields: 'id,proxima_ejecucion,ultima_ejecucion,frecuencia,frecuencia_personalizada,estado',
        skipTotal: true // No contar total, ahorra resources
      })

      // Actualizar caché
      this.updateCache(programaciones)

       // console.log('[SchedulerOptimizer] Fetch optimizado - pendientes:', programaciones.length)
      return { cached: false, programaciones }

    } catch (error) {
       // console.error('[SchedulerOptimizer] Error en fetch optimizado:', error)
      // En caso de error, retornar caché si existe
      const cached = this.getCachedPending()
      return { cached: true, programaciones: cached, error }
    } finally {
      this.syncInProgress = false

      // Si había un sync pendiente, ejecutarlo después
      if (this.pendingSync) {
        this.pendingSync = false
        setTimeout(() => this.fetchOptimizedPending(), 1000)
      }
    }
  }

  /**
   * Verifica si el caché es válido
   */
  isCacheValid() {
    if (!this.lastFullSync) return false

    const age = Date.now() - this.lastFullSync
    return age < this.cacheTimeout
  }

  /**
   * Actualiza el caché
   */
  updateCache(programaciones) {
    this.cache.set('pending', programaciones)
    this.lastFullSync = Date.now()
  }

  /**
   * Obtiene pendientes del caché
   */
  getCachedPending() {
    return this.cache.get('pending') || []
  }

  /**
   * Obtiene count de pendientes del caché
   */
  getCachedPendingCount() {
    const cached = this.getCachedPending()
    return cached.length
  }

  /**
   * Limpia el caché (para llamar después de ejecutar)
   */
  clearCache() {
    this.cache.clear()
    this.lastFullSync = null
     // console.log('[SchedulerOptimizer] Caché limpiado')
  }

  /**
   * Debounce para evitar llamadas excesivas
   */
  debounceCheck() {
    return new Promise((resolve) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }

      this.debounceTimer = setTimeout(async () => {
        const result = await this.checkPendingProgramacionesOptimized()
        resolve(result)
      }, this.debounceDelay)
    })
  }

  /**
   * Estrategia inteligente: solo check si hay actividad del usuario
   */
  shouldCheckNow() {
    // No check si el usuario está inactivo por más de 30 min
    const lastActivity = this.getLastUserActivity()
    if (!lastActivity) return true

    const inactiveTime = Date.now() - lastActivity
    if (inactiveTime > 30 * 60 * 1000) {
       // console.log('[SchedulerOptimizer] Usuario inactivo, omitiendo check')
      return false
    }

    return true
  }

  getLastUserActivity() {
    const last = localStorage.getItem('last_user_activity')
    return last ? parseInt(last) : null
  }

  /**
   * Actualiza actividad del usuario
   */
  updateUserActivity() {
    localStorage.setItem('last_user_activity', Date.now().toString())
  }
}

// Singleton instance
let optimizerInstance = null

export function getSchedulerOptimizer() {
  if (!optimizerInstance) {
    optimizerInstance = new SchedulerOptimizer()
  }
  return optimizerInstance
}

export default optimizerInstance

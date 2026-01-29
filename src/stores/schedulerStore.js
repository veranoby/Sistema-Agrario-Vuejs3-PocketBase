/**
 * Scheduler Store - Gestión del estado del scheduler automático
 *
 * Funcionalidad:
 * - Control de inicio/detención del scheduler
 * - Estado de ejecución y estadísticas
 * - Integración con authStore para auto-inicio
 * - Preferencias de usuario para scheduler
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getScheduler, initScheduler } from '@/utils/scheduler'

export const useSchedulerStore = defineStore('scheduler', {
  state: () => ({
    enabled: false,
    isRunning: false,
    lastCheck: null,
    executedCount: 0,
    checkInterval: 5 * 60 * 1000, // 5 minutos
    userPreference: null, // 'auto', 'manual', null (not set)
    initialized: false
  }),

  getters: {
    /**
     * Texto de estado para mostrar en UI
     */
    statusText: (state) => {
      if (!state.enabled) return 'Scheduler OFF'
      if (!state.isRunning) return 'Scheduler DETENIDO'
      return 'Scheduler ON'
    },

    /**
     * Color para indicador visual
     */
    statusColor: (state) => {
      if (!state.enabled) return 'grey'
      if (!state.isRunning) return 'error'
      return 'success'
    },

    /**
     * Icono para indicador visual
     */
    statusIcon: (state) => {
      if (!state.enabled) return 'mdi-calendar-remove'
      if (!state.isRunning) return 'mdi-calendar-alert'
      return 'mdi-calendar-check'
    },

    /**
     * Próxima verificación programada
     */
    nextCheck: (state) => {
      if (!state.lastCheck || !state.isRunning) return null
      return new Date(new Date(state.lastCheck).getTime() + state.checkInterval)
    },

    /**
     * Tiempo restante para próxima verificación
     */
    timeUntilNextCheck: (state) => {
      if (!state.lastCheck || !state.isRunning) return null
      const next = new Date(new Date(state.lastCheck).getTime() + state.checkInterval)
      const now = new Date()
      const diff = Math.max(0, next.getTime() - now.getTime())
      return Math.floor(diff / 1000 / 60) // minutos
    },

    /**
     * Tareas pendientes totales
     */
    pendingTasksCount: (state) => {
      // Este getter se actualizará cuando integremos con programacionesStore
      return 0
    }
  },

  actions: {
    /**
     * Inicializa el scheduler
     */
    async init() {
      if (this.initialized) {
        console.log('[SchedulerStore] Ya inicializado')
        return
      }

      console.log('[SchedulerStore] Inicializando...')

      // Cargar preferencia de usuario
      this.loadUserPreference()

      // Inicializar scheduler singleton
      const scheduler = initScheduler()

      // Actualizar estado desde el scheduler
      this.updateFromScheduler(scheduler)

      // Si la preferencia es 'auto', iniciar automáticamente
      if (this.userPreference === 'auto' || this.userPreference === null) {
        await this.start()
      }

      this.initialized = true
      console.log('[SchedulerStore] Inicialización completada')
    },

    /**
     * Inicia el scheduler
     */
    async start() {
      console.log('[SchedulerStore] Iniciando scheduler...')

      const scheduler = getScheduler()
      scheduler.start()

      this.enabled = true
      this.isRunning = true

      // Guardar preferencia
      this.userPreference = 'auto'
      this.saveUserPreference()

      // Actualizar estado
      this.updateFromScheduler(scheduler)

      console.log('[SchedulerStore] Scheduler iniciado')
    },

    /**
     * Detiene el scheduler
     */
    async stop() {
      console.log('[SchedulerStore] Deteniendo scheduler...')

      const scheduler = getScheduler()
      scheduler.stop()

      this.enabled = false
      this.isRunning = false

      // Guardar preferencia
      this.userPreference = 'manual'
      this.saveUserPreference()

      console.log('[SchedulerStore] Scheduler detenido')
    },

    /**
     * Toggle scheduler (on/off)
     */
    async toggle() {
      if (this.isRunning) {
        await this.stop()
      } else {
        await this.start()
      }
    },

    /**
     * Ejecuta una verificación manual
     */
    async runManually() {
      console.log('[SchedulerStore] Ejecutando verificación manual...')

      const scheduler = getScheduler()
      await scheduler.runManually()

      // Actualizar estado
      this.updateFromScheduler(scheduler)
    },

    /**
     * Actualiza el estado desde el scheduler
     */
    updateFromScheduler(scheduler) {
      const stats = scheduler.getStats()

      this.isRunning = stats.isRunning
      this.lastCheck = stats.lastCheck
      this.executedCount = stats.executedCount
      this.checkInterval = stats.checkInterval
    },

    /**
     * Actualiza el contador de tareas pendientes
     */
    updatePendingTasks(count) {
      // Este método se llamará desde programacionesStore
      console.log(`[SchedulerStore] Tareas pendientes: ${count}`)
      // Pendiente: implementar estado para pendingTasksCount
    },

    /**
     * Carga la preferencia de usuario desde localStorage
     */
    loadUserPreference() {
      try {
        const saved = localStorage.getItem('scheduler_preference')
        if (saved) {
          this.userPreference = saved
          console.log(`[SchedulerStore] Preferencia cargada: ${saved}`)
        }
      } catch (error) {
        console.error('[SchedulerStore] Error cargando preferencia:', error)
      }
    },

    /**
     * Guarda la preferencia de usuario en localStorage
     */
    saveUserPreference() {
      try {
        localStorage.setItem('scheduler_preference', this.userPreference || 'manual')
        console.log(`[SchedulerStore] Preferencia guardada: ${this.userPreference}`)
      } catch (error) {
        console.error('[SchedulerStore] Error guardando preferencia:', error)
      }
    },

    /**
     * Reset del store (para logout)
     */
    reset() {
      console.log('[SchedulerStore] Reset store...')

      const scheduler = getScheduler()
      scheduler.stop()

      this.enabled = false
      this.isRunning = false
      this.lastCheck = null
      this.executedCount = 0
      this.initialized = false

      console.log('[SchedulerStore] Store reseteado')
    }
  }
})

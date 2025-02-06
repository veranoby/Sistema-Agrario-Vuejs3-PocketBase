import { defineStore } from 'pinia'
import { SyncQueue } from '@/utils/syncQueue'
import { useSnackbarStore } from './snackbarStore'

export const useSyncStore = defineStore('sync', {
  state: () => ({
    isOnline: navigator.onLine,
    queue: new SyncQueue(),
    lastSyncTime: null,
    syncStatus: 'idle',
    errors: []
  }),

  actions: {
    async init() {
      if (!this.initialized) {
        // Cargar queue guardado
        const savedQueue = this.loadFromLocalStorage('syncQueue')
        if (savedQueue) {
          this.queue.queue = savedQueue
        }

        // Configurar event listeners
        window.addEventListener('online', () => this.handleOnline())
        window.addEventListener('offline', () => this.handleOffline())
        this.initialized = true

        // Si estamos online al iniciar y hay operaciones pendientes, procesarlas
        if (navigator.onLine && this.queue.queue.length > 0) {
          await this.processPendingQueue()
        }
      }
    },

    async handleOnline() {
      useSnackbarStore().showSnackbar('Conexión restaurada. Procesando queue...' + this.queue.queue)
      this.isOnline = true
      if (this.queue.queue.length > 0) {
        await this.processPendingQueue()
      }
    },

    handleOffline() {
      this.isOnline = false
    },

    async queueOperation(operation) {
      const tempId = await this.queue.add(operation)
      // Guardar queue actualizado en localStorage
      this.saveToLocalStorage('syncQueue', this.queue.queue)

      if (this.isOnline) {
        await this.processPendingQueue()
      }
      return tempId
    },

    async processPendingQueue() {
      if (this.syncStatus === 'syncing') return

      this.syncStatus = 'syncing'
      useSnackbarStore().showSnackbar('Procesando cambios pendientes...')

      try {
        await this.queue.process()
        this.lastSyncTime = Date.now()
        this.syncStatus = 'completed'

        // Limpiar la cola después de procesar
        this.queue.queue = []
        this.saveToLocalStorage('syncQueue', [])

        useSnackbarStore().showSnackbar('Cambios sincronizados correctamente')
      } catch (error) {
        console.error('Error procesando queue:', error)
        this.syncStatus = 'error'
        useSnackbarStore().showSnackbar('Error al sincronizar cambios', 'error')
      }
    },

    saveToLocalStorage(key, value) {
      //    console.log('guardando en localStorage:', key)
      localStorage.setItem(key, JSON.stringify(value))
    },

    loadFromLocalStorage(key) {
      //   console.log('cargando del localStorage:', key)
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    },

    removeFromLocalStorage(key) {
      console.log('borrando del localStorage:', key)
      localStorage.removeItem(key)
    }
  }
})

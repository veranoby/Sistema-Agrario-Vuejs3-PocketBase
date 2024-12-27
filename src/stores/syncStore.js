import { defineStore } from 'pinia'
import { SyncQueue } from '@/utils/syncQueue'

export const useSyncStore = defineStore('sync', {
  state: () => ({
    isOnline: navigator.onLine,
    queue: new SyncQueue(),
    lastSyncTime: null,
    syncStatus: 'idle',
    errors: [],
    initialized: false
  }),

  actions: {
    async init() {
      if (!this.initialized) {
        window.addEventListener('online', () => this.handleOnline())
        window.addEventListener('offline', () => this.handleOffline())
        this.initialized = true

        const savedQueue = this.loadFromLocalStorage('syncQueue')
        if (savedQueue) {
          this.queue = new SyncQueue()
          this.queue.queue = savedQueue
        }
      }

      if (this.isOnline && this.queue.queue.length > 0) {
        await this.queue.syncPendingChanges()
      }
    },

    handleOnline() {
      this.isOnline = true
      this.queue.process()
    },

    handleOffline() {
      this.isOnline = false
    },

    async queueOperation(operation) {
      await this.queue.add(operation)
      if (this.isOnline) {
        await this.queue.process()
      }
    },

    loadFromLocalStorage(key) {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    },
    saveToLocalStorage(key, value) {
      localStorage.setItem(key, JSON.stringify(value))
    },

    removeFromLocalStorage(key) {
      localStorage.removeItem(key)
    }
  }
})

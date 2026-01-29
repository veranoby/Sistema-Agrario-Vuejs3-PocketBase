/**
 * Notification Store - Gestión de notificaciones del sistema
 *
 * Funcionalidad:
 * - Gestión de notificaciones en-app
 * - Integración con Notification API del navegador
 * - Contador de notificaciones no leídas
 * - Historial de notificaciones
 */

import { defineStore } from 'pinia'

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    notifications: [],
    permission: 'default', // 'default', 'granted', 'denied'
    maxNotifications: 100,
    initialized: false
  }),

  getters: {
    /**
     * Cantidad de notificaciones no leídas
     */
    unreadCount: (state) => {
      return state.notifications.filter(n => !n.read).length
    },

    /**
     * Notificaciones ordenadas por fecha (más recientes primero)
     */
    sortedNotifications: (state) => {
      return [...state.notifications].sort((a, b) => {
        const dateA = new Date(a.timestamp || 0)
        const dateB = new Date(b.timestamp || 0)
        return dateB.getTime() - dateA.getTime()
      })
    },

    /**
     * Últimas N notificaciones
     */
    recentNotifications: (state) => (limit = 10) => {
      return state.sortedNotifications.slice(0, limit)
    },

    /**
     * Notificaciones por tipo
     */
    notificationsByType: (state) => (type) => {
      return state.notifications.filter(n => n.type === type)
    },

    /**
     * Puede mostrar notificaciones del navegador
     */
    canShowBrowserNotifications: (state) => {
      return state.permission === 'granted' && 'Notification' in window
    }
  },

  actions: {
    /**
     * Inicializa el store de notificaciones
     */
    async init() {
      if (this.initialized) {
        console.log('[NotificationStore] Ya inicializado')
        return
      }

      console.log('[NotificationStore] Inicializando...')

      // Cargar notificaciones desde localStorage
      this.loadFromStorage()

      // Verificar permiso de notificación
      if ('Notification' in window) {
        this.permission = Notification.permission

        // Si el permiso está otorgado, verificar si hay notificaciones pendientes
        if (this.permission === 'granted') {
          console.log('[NotificationStore] Permisos de notificación otorgados')
        }
      } else {
        console.warn('[NotificationStore] Notification API no soportada')
        this.permission = 'unsupported'
      }

      this.initialized = true
      console.log('[NotificationStore] Inicialización completada')
    },

    /**
     * Solicita permiso para notificaciones del navegador
     */
    async requestPermission() {
      if (!('Notification' in window)) {
        console.warn('[NotificationStore] Notification API no soportada')
        this.permission = 'unsupported'
        return false
      }

      if (this.permission === 'granted') {
        console.log('[NotificationStore] Permisos ya otorgados')
        return true
      }

      if (this.permission === 'denied') {
        console.warn('[NotificationStore] Permisos denegados por el usuario')
        return false
      }

      try {
        console.log('[NotificationStore] Solicitando permisos...')
        const result = await Notification.requestPermission()
        this.permission = result

        if (result === 'granted') {
          console.log('[NotificationStore] Permisos otorgados')
          // Notificación de prueba
          new Notification('Sistema Agri', {
            body: 'Notificaciones activadas correctamente',
            icon: '/favicon.ico'
          })
          return true
        } else {
          console.warn('[NotificationStore] Permisos denegados')
          return false
        }
      } catch (error) {
        console.error('[NotificationStore] Error solicitando permisos:', error)
        this.permission = 'denied'
        return false
      }
    },

    /**
     * Agrega una nueva notificación
     */
    addNotification(notification) {
      const newNotification = {
        id: Date.now() + Math.random(),
        read: false,
        timestamp: new Date().toISOString(),
        ...notification
      }

      // Agregar al inicio del array
      this.notifications.unshift(newNotification)

      // Mantener máximo de notificaciones
      if (this.notifications.length > this.maxNotifications) {
        this.notifications = this.notifications.slice(0, this.maxNotifications)
      }

      // Mostrar notificación del navegador si está permitido
      this.showBrowserNotification(newNotification)

      // Guardar en localStorage
      this.saveToStorage()

      console.log(`[NotificationStore] Notificación agregada: ${newNotification.title}`)
    },

    /**
     * Muestra notificación del navegador
     */
    showBrowserNotification(notification) {
      if (!this.canShowBrowserNotifications) {
        return
      }

      try {
        const notif = new Notification(notification.title || 'Sistema Agri', {
          body: notification.message || notification.body,
          icon: notification.icon || '/favicon.ico',
          tag: notification.tag || 'general'
        })

        // Cerrar automáticamente después de 5 segundos
        setTimeout(() => notif.close(), 5000)

        // Marcar como leída al hacer click
        notif.onclick = () => {
          window.focus()
          notif.close()
          this.markAsRead(notification.id)
        }
      } catch (error) {
        console.error('[NotificationStore] Error mostrando notificación del navegador:', error)
      }
    },

    /**
     * Marca una notificación como leída
     */
    markAsRead(notificationId) {
      const index = this.notifications.findIndex(n => n.id === notificationId)
      if (index !== -1) {
        this.notifications[index].read = true
        this.saveToStorage()
      }
    },

    /**
     * Marca todas las notificaciones como leídas
     */
    markAllAsRead() {
      this.notifications.forEach(n => {
        n.read = true
      })
      this.saveToStorage()
      console.log('[NotificationStore] Todas las notificaciones marcadas como leídas')
    },

    /**
     * Elimina una notificación
     */
    removeNotification(notificationId) {
      this.notifications = this.notifications.filter(n => n.id !== notificationId)
      this.saveToStorage()
    },

    /**
     * Limpia todas las notificaciones
     */
    clearAll() {
      this.notifications = []
      this.saveToStorage()
      console.log('[NotificationStore] Todas las notificaciones eliminadas')
    },

    /**
     * Guarda notificaciones en localStorage
     */
    saveToStorage() {
      try {
        localStorage.setItem('notifications', JSON.stringify(this.notifications))
      } catch (error) {
        console.error('[NotificationStore] Error guardando notificaciones:', error)
      }
    },

    /**
     * Carga notificaciones desde localStorage
     */
    loadFromStorage() {
      try {
        const saved = localStorage.getItem('notifications')
        if (saved) {
          this.notifications = JSON.parse(saved)
          console.log(`[NotificationStore] ${this.notifications.length} notificaciones cargadas`)
        }
      } catch (error) {
        console.error('[NotificationStore] Error cargando notificaciones:', error)
        this.notifications = []
      }
    },

    /**
     * Reset del store (para logout)
     */
    reset() {
      console.log('[NotificationStore] Reset store...')
      this.notifications = []
      this.initialized = false
      // No reseteamos permission porque es una configuración del navegador
    }
  }
})

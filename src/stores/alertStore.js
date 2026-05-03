import { defineStore } from 'pinia'
import { sendAlert, configureAlertPreferences, alertTypes, getAlertPreferences } from '@/services/emailAlertService'
import { logger } from '@/utils/logger'
import { useNotificationStore } from './notificationStore'

export const useAlertStore = defineStore('alerts', {
  state: () => ({
    preferences: {
      enabledTypes: [],
      recipients: [],
      frequency: 'immediate'
    },
    loading: false,
    error: null
  }),

  getters: {
    /**
     * Verifica si un tipo de alerta está habilitado
     * @param {string} type - Tipo de alerta a verificar
     * @returns {boolean} true si está habilitado
     */
    isEnabled: (state) => (type) => state.preferences.enabledTypes.includes(type),
    
    /**
     * Verifica si hay destinatarios configurados
     * @returns {boolean} true si hay destinatarios
     */
    hasRecipients: (state) => state.preferences.recipients.length > 0,
    
    /**
     * Obtiene el número de destinatarios configurados
     * @returns {number} Cantidad de destinatarios
     */
    recipientsCount: (state) => state.preferences.recipients.length,
    
    /**
     * Verifica si el sistema está configurado correctamente
     * @returns {boolean} true si está configurado
     */
    isConfigured: (state) => 
      state.preferences.enabledTypes.length > 0 && 
      state.preferences.recipients.length > 0
  },

  actions: {
    /**
     * Carga las preferencias de alertas desde el backend
     * @param {string} haciendaId - ID de la hacienda
     */
    async loadPreferences(haciendaId) {
      this.loading = true
      this.error = null
      
      try {
        const preferences = await getAlertPreferences(haciendaId)
        this.preferences = preferences
        logger.info('[ALERT_STORE] Preferencias cargadas', { haciendaId })
      } catch (error) {
        logger.error('[ALERT_STORE] Error cargando preferencias', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Dispara una alerta de actividad crítica
     * @param {Object} activity - Datos de la actividad
     */
    async triggerCriticalActivityAlert(activity) {
      if (!this.isEnabled(alertTypes.ACTIVIDAD_CRITICA)) {
        logger.debug('[ALERT_STORE] Alerta crítica deshabilitada, omitiendo')
        return
      }

      if (!this.hasRecipients) {
        logger.warn('[ALERT_STORE] No hay destinatarios configurados para alerta crítica')
        return
      }

      try {
        this.loading = true

        // In-app notification
        const notificationStore = useNotificationStore()
        notificationStore.addNotification({
          title: `Actividad Crítica: ${activity.nombre}`,
          message: activity.descripcion || 'Se requiere atención inmediata en esta actividad.',
          type: 'error'
        })

        await sendAlert({
          type: alertTypes.ACTIVIDAD_CRITICA,
          recipients: this.preferences.recipients,
          data: {
            actividadNombre: activity.nombre,
            descripcion: activity.descripcion,
            prioridad: activity.prioridad,
            fechaVencimiento: activity.fecha_vencimiento,
            zonas: activity.zonas || [],
            responsables: activity.responsables || []
          },
          hacienda: activity.hacienda
        })
        logger.info('[ALERT_STORE] Alerta crítica enviada', { activityId: activity.id })
      } catch (error) {
        logger.error('[ALERT_STORE] Error enviando alerta crítica', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Dispara una alerta de BPA vencido
     * @param {Object} zona - Datos de la zona
     */
    async triggerBPAExpiredAlert(zona) {
      if (!this.isEnabled(alertTypes.BPA_VENCIDO)) {
        logger.debug('[ALERT_STORE] Alerta BPA deshabilitada, omitiendo')
        return
      }

      if (!this.hasRecipients) {
        logger.warn('[ALERT_STORE] No hay destinatarios configurados para alerta BPA')
        return
      }

      try {
        this.loading = true

        // In-app notification
        const notificationStore = useNotificationStore()
        notificationStore.addNotification({
          title: `BPA Vencido: ${zona.nombre}`,
          message: `La certificación BPA para la zona ${zona.nombre} ha vencido o está próxima a vencer.`,
          type: 'warning'
        })

        await sendAlert({
          type: alertTypes.BPA_VENCIDO,
          recipients: this.preferences.recipients,
          data: {
            zonaNombre: zona.nombre,
            bpaEstado: zona.bpa_estado,
            cultivo: zona.cultivo,
            hacienda: zona.hacienda,
            fechaVencimiento: zona.fecha_vencimiento_bpa
          },
          hacienda: zona.hacienda
        })
        logger.info('[ALERT_STORE] Alerta BPA enviada', { zonaId: zona.id })
      } catch (error) {
        logger.error('[ALERT_STORE] Error enviando alerta BPA', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Dispara una alerta de recordatorio
     * @param {Object} recordatorio - Datos del recordatorio
     */
    async triggerReminderAlert(recordatorio) {
      if (!this.isEnabled(alertTypes.RECORDATORIO)) {
        logger.debug('[ALERT_STORE] Alerta de recordatorio deshabilitada, omitiendo')
        return
      }

      if (!this.hasRecipients) {
        logger.warn('[ALERT_STORE] No hay destinatarios configurados para recordatorio')
        return
      }

      try {
        this.loading = true

        // In-app notification
        const notificationStore = useNotificationStore()
        notificationStore.addNotification({
          title: `Recordatorio: ${recordatorio.titulo}`,
          message: recordatorio.descripcion,
          type: 'info'
        })

        await sendAlert({
          type: alertTypes.RECORDATORIO,
          recipients: this.preferences.recipients,
          data: {
            titulo: recordatorio.titulo,
            descripcion: recordatorio.descripcion,
            fechaRecordatorio: recordatorio.fecha_recordatorio,
            prioridad: recordatorio.prioridad,
            estado: recordatorio.estado
          },
          hacienda: recordatorio.hacienda
        })
        logger.info('[ALERT_STORE] Recordatorio enviado', { recordatorioId: recordatorio.id })
      } catch (error) {
        logger.error('[ALERT_STORE] Error enviando recordatorio', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Dispara una alerta de actividad asignada
     * @param {Object} activity - Datos de la actividad
     * @param {string} responsableNombre - Nombre del responsable asignado
     */
    async triggerActivityAssignedAlert(activity, responsableNombre) {
      if (!this.isEnabled(alertTypes.ACTIVIDAD_ASIGNADA)) {
        logger.debug('[ALERT_STORE] Alerta de asignación deshabilitada, omitiendo')
        return
      }

      if (!this.hasRecipients) {
        logger.warn('[ALERT_STORE] No hay destinatarios configurados para asignación')
        return
      }

      try {
        this.loading = true

        // In-app notification
        const notificationStore = useNotificationStore()
        notificationStore.addNotification({
          title: `Actividad Asignada: ${activity.nombre}`,
          message: `Se ha asignado la actividad a ${responsableNombre}.`,
          type: 'success'
        })

        await sendAlert({
          type: alertTypes.ACTIVIDAD_ASIGNADA,
          recipients: this.preferences.recipients,
          data: {
            actividadNombre: activity.nombre,
            descripcion: activity.descripcion,
            responsable: responsableNombre,
            fechaAsignacion: new Date().toISOString()
          },
          hacienda: activity.hacienda
        })
        logger.info('[ALERT_STORE] Alerta de asignación enviada', { activityId: activity.id })
      } catch (error) {
        logger.error('[ALERT_STORE] Error enviando alerta de asignación', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Dispara una alerta de zona que requiere atención
     * @param {Object} zona - Datos de la zona
     * @param {string} motivo - Motivo de la alerta
     */
    async triggerZoneAttentionAlert(zona, motivo) {
      if (!this.isEnabled(alertTypes.ZONA_REQUIERE_ATENCION)) {
        logger.debug('[ALERT_STORE] Alerta de zona deshabilitada, omitiendo')
        return
      }

      if (!this.hasRecipients) {
        logger.warn('[ALERT_STORE] No hay destinatarios configurados para alerta de zona')
        return
      }

      try {
        this.loading = true

        // In-app notification
        const notificationStore = useNotificationStore()
        notificationStore.addNotification({
          title: `Atención en Zona: ${zona.nombre}`,
          message: motivo,
          type: 'warning'
        })

        await sendAlert({
          type: alertTypes.ZONA_REQUIERE_ATENCION,
          recipients: this.preferences.recipients,
          data: {
            zonaNombre: zona.nombre,
            motivo: motivo,
            tipo: zona.tipo,
            ubicacion: zona.ubicacion
          },
          hacienda: zona.hacienda
        })
        logger.info('[ALERT_STORE] Alerta de zona enviada', { zonaId: zona.id })
      } catch (error) {
        logger.error('[ALERT_STORE] Error enviando alerta de zona', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Actualiza las preferencias de alertas
     * @param {string} haciendaId - ID de la hacienda
     * @param {Object} newPreferences - Nuevas preferencias
     */
    async updatePreferences(haciendaId, newPreferences) {
      this.loading = true
      this.error = null
      
      try {
        await configureAlertPreferences(haciendaId, newPreferences)
        this.preferences = {
          enabledTypes: newPreferences.enabledTypes || [],
          recipients: newPreferences.recipients || [],
          frequency: newPreferences.frequency || 'immediate'
        }
        logger.info('[ALERT_STORE] Preferencias actualizadas', { haciendaId })
      } catch (error) {
        logger.error('[ALERT_STORE] Error actualizando preferencias', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Habilita un tipo de alerta específico
     * @param {string} type - Tipo de alerta a habilitar
     */
    enableAlertType(type) {
      if (!this.preferences.enabledTypes.includes(type)) {
        this.preferences.enabledTypes.push(type)
        logger.info('[ALERT_STORE] Tipo de alerta habilitado', { type })
      }
    },

    /**
     * Deshabilita un tipo de alerta específico
     * @param {string} type - Tipo de alerta a deshabilitar
     */
    disableAlertType(type) {
      const index = this.preferences.enabledTypes.indexOf(type)
      if (index !== -1) {
        this.preferences.enabledTypes.splice(index, 1)
        logger.info('[ALERT_STORE] Tipo de alerta deshabilitado', { type })
      }
    },

    /**
     * Agrega un destinatario a la lista
     * @param {string} email - Email a agregar
     */
    addRecipient(email) {
      const trimmedEmail = email.trim()
      if (!this.preferences.recipients.includes(trimmedEmail)) {
        this.preferences.recipients.push(trimmedEmail)
        logger.info('[ALERT_STORE] Destinatario agregado', { email: trimmedEmail })
      }
    },

    /**
     * Remueve un destinatario de la lista
     * @param {string} email - Email a remover
     */
    removeRecipient(email) {
      const index = this.preferences.recipients.indexOf(email.trim())
      if (index !== -1) {
        this.preferences.recipients.splice(index, 1)
        logger.info('[ALERT_STORE] Destinatario removido', { email })
      }
    },

    /**
     * Limpia el estado del store
     */
    reset() {
      this.preferences = {
        enabledTypes: [],
        recipients: [],
        frequency: 'immediate'
      }
      this.loading = false
      this.error = null
      logger.info('[ALERT_STORE] Store reseteado')
    }
  }
})

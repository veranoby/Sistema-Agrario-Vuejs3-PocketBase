import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { logger } from '@/utils/logger'
import { sendAlert } from '@/services/emailAlertService'

/**
 * Templates de reportes disponibles
 */
const REPORT_TEMPLATES = [
  {
    id: 'actividades_semanal',
    name: 'Reporte Semanal de Actividades',
    description: 'Resumen de actividades de la semana',
    params: { dateRange: '7d' }
  },
  {
    id: 'bpa_compliance',
    name: 'Reporte de Cumplimiento BPA',
    description: 'Estado de BPA por zona',
    params: { includeDetails: true }
  },
  {
    id: 'siembras_activas',
    name: 'Siembras Activas',
    description: 'Listado de siembras actualmente activas',
    params: { includeMetrics: true }
  },
  {
    id: 'productividad',
    name: 'Reporte de Productividad',
    description: 'Métricas de productividad por zona',
    params: { period: 'monthly' }
  }
]

/**
 * Frecuencias de reporte disponibles
 */
export const REPORT_FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
}

/**
 * Tipos de reporte disponibles
 */
export const REPORT_TYPES = {
  ACTIVIDADES_SEMANAL: 'actividades_semanal',
  BPA_COMPLIANCE: 'bpa_compliance',
  SIEMBRAS_ACTIVAS: 'siembras_activas',
  PRODUCTIVIDAD: 'productividad'
}

export const useReportStore = defineStore('reports', {
  state: () => ({
    templates: REPORT_TEMPLATES,
    schedules: [],
    history: [],
    loading: false,
    error: null
  }),

  getters: {
    /**
     * Obtiene los schedules para una hacienda específica
     * @param {string} haciendaId - ID de la hacienda
     * @returns {Array} Lista de schedules
     */
    getSchedulesForHacienda: (state) => (haciendaId) => {
      return state.schedules.filter(s => s.haciendaId === haciendaId)
    },

    /**
     * Obtiene un template por ID
     * @param {string} templateId - ID del template
     * @returns {Object|undefined} Template encontrado
     */
    getTemplateById: (state) => (templateId) => {
      return state.templates.find(t => t.id === templateId)
    },

    /**
     * Obtiene el historial de reportes ejecutados
     * @returns {Array} Historial ordenado por fecha
     */
    getHistory: (state) => {
      return state.history.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
    },

    /**
     * Verifica si hay schedules activos
     * @returns {boolean} true si hay schedules activos
     */
    hasActiveSchedules: (state) => {
      return state.schedules.some(s => s.active)
    }
  },

  actions: {
    /**
     * Carga los schedules desde el backend
     * @param {string} haciendaId - ID de la hacienda
     */
    async loadSchedules(haciendaId) {
      this.loading = true
      this.error = null

      try {
        const records = await pb.collection('report_schedules').getList(1, 100, {
          filter: `haciendaId="${haciendaId}"`,
          sort: '-created'
        })

        this.schedules = records.items
        logger.info('[REPORT_STORE] Schedules cargados', { count: records.totalItems })
      } catch (error) {
        logger.error('[REPORT_STORE] Error cargando schedules', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Programa un nuevo reporte
     * @param {string} templateId - ID del template
     * @param {string} frequency - Frecuencia ('daily', 'weekly', 'monthly')
     * @param {string[]} recipients - Lista de emails destinatarios
     * @param {string} haciendaId - ID de la hacienda
     * @returns {Promise<Object>} Schedule creado
     */
    async scheduleReport(templateId, frequency, recipients, haciendaId) {
      try {
        const schedule = {
          id: Date.now().toString(),
          templateId,
          frequency,
          recipients,
          haciendaId,
          nextRun: this.calculateNextRun(frequency),
          active: true,
          createdAt: new Date().toISOString()
        }

        this.schedules.push(schedule)

        // Guardar en backend
        await pb.collection('report_schedules').create(schedule)

        logger.info('[REPORT_STORE] Schedule creado', { templateId, frequency })
        return schedule
      } catch (error) {
        logger.error('[REPORT_STORE] Error creando schedule', error)
        throw error
      }
    },

    /**
     * Ejecuta un reporte programado
     * @param {string} scheduleId - ID del schedule
     */
    async executeScheduledReport(scheduleId) {
      const schedule = this.schedules.find(s => s.id === scheduleId)
      if (!schedule) {
        logger.warn('[REPORT_STORE] Schedule no encontrado', { scheduleId })
        return
      }

      try {
        // Generar reporte
        const report = await this.generateReport(schedule.templateId, schedule.haciendaId)

        // Enviar a recipients
        await this.sendReport(report, schedule.recipients)

        // Actualizar nextRun
        schedule.nextRun = this.calculateNextRun(schedule.frequency)

        // Agregar al historial
        this.history.unshift({
          id: Date.now(),
          scheduleId,
          templateId: schedule.templateId,
          generatedAt: new Date().toISOString(),
          recipients: schedule.recipients.length
        })

        // Actualizar en backend
        await pb.collection('report_schedules').update(scheduleId, {
          nextRun: schedule.nextRun
        })

        logger.info('[REPORT_STORE] Reporte generado y enviado', { scheduleId })
      } catch (error) {
        logger.error('[REPORT_STORE] Error ejecutando reporte', error)
        throw error
      }
    },

    /**
     * Genera un reporte según el template
     * @param {string} templateId - ID del template
     * @param {string} haciendaId - ID de la hacienda
     * @returns {Promise<Object>} Reporte generado
     */
    async generateReport(templateId, haciendaId) {
      const template = this.templates.find(t => t.id === templateId)
      if (!template) {
        throw new Error(`Template ${templateId} no encontrado`)
      }

      switch (templateId) {
        case REPORT_TYPES.ACTIVIDADES_SEMANAL:
          return await this.generateActividadesSemanal(haciendaId)
        case REPORT_TYPES.BPA_COMPLIANCE:
          return await this.generateBPACompliance(haciendaId)
        case REPORT_TYPES.SIEMBRAS_ACTIVAS:
          return await this.generateSiembrasActivas(haciendaId)
        case REPORT_TYPES.PRODUCTIVIDAD:
          return await this.generateProductividad(haciendaId)
        default:
          throw new Error(`Template ${templateId} no implementado`)
      }
    },

    /**
     * Genera reporte semanal de actividades
     * @param {string} haciendaId - ID de la hacienda
     * @returns {Promise<Object>} Reporte generado
     */
    async generateActividadesSemanal(haciendaId) {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const actividades = await pb.collection('actividades').getList(1, 1000, {
        filter: `hacienda="${haciendaId}" && created >= "${weekAgo.toISOString()}"`,
        sort: '-created'
      })

      return {
        title: 'Reporte Semanal de Actividades',
        templateId: 'actividades_semanal',
        data: actividades.items,
        summary: {
          total: actividades.totalItems,
          byEstado: this.groupBy(actividades.items, 'estado'),
          byTipo: this.groupBy(actividades.items, 'tipo_actividades')
        },
        generatedAt: new Date().toISOString()
      }
    },

    /**
     * Genera reporte de cumplimiento BPA
     * @param {string} haciendaId - ID de la hacienda
     * @returns {Promise<Object>} Reporte generado
     */
    async generateBPACompliance(haciendaId) {
      const zonas = await pb.collection('zonas').getList(1, 100, {
        filter: `hacienda="${haciendaId}"`
      })

      const complianceData = zonas.items.map(z => ({
        zona: z.nombre,
        bpaScore: z.bpa_estado || 0,
        status: (z.bpa_estado || 0) >= 60 ? 'Compliant' : 'Non-Compliant'
      }))

      const compliantCount = complianceData.filter(z => z.status === 'Compliant').length
      const averageBPA = complianceData.reduce((sum, z) => sum + z.bpaScore, 0) / complianceData.length

      return {
        title: 'Reporte de Cumplimiento BPA',
        templateId: 'bpa_compliance',
        data: complianceData,
        summary: {
          totalZonas: zonas.totalItems,
          compliantCount,
          nonCompliantCount: zonas.totalItems - compliantCount,
          averageBPA: Math.round(averageBPA)
        },
        generatedAt: new Date().toISOString()
      }
    },

    /**
     * Genera reporte de siembras activas
     * @param {string} haciendaId - ID de la hacienda
     * @returns {Promise<Object>} Reporte generado
     */
    async generateSiembrasActivas(haciendaId) {
      const siembras = await pb.collection('siembras').getList(1, 100, {
        filter: `hacienda="${haciendaId}" && estado != "finalizada"`
      })

      return {
        title: 'Siembras Activas',
        templateId: 'siembras_activas',
        data: siembras.items,
        summary: {
          total: siembras.totalItems,
          totalSuperficie: siembras.items.reduce((sum, s) => sum + (s.superficie || 0), 0)
        },
        generatedAt: new Date().toISOString()
      }
    },

    /**
     * Genera reporte de productividad
     * @param {string} haciendaId - ID de la hacienda
     * @returns {Promise<Object>} Reporte generado
     */
    async generateProductividad(haciendaId) {
      // Placeholder para lógica de productividad
      return {
        title: 'Reporte de Productividad',
        templateId: 'productividad',
        data: [],
        summary: {},
        generatedAt: new Date().toISOString()
      }
    },

    /**
     * Envía un reporte por email
     * @param {Object} report - Reporte generado
     * @param {string[]} recipients - Lista de emails destinatarios
     */
    async sendReport(report, recipients) {
      try {
        await sendAlert({
          type: 'recordatorio',
          recipients,
          data: {
            titulo: report.title,
            descripcion: `Reporte generado el ${new Date(report.generatedAt).toLocaleString()}`,
            reporte: report
          },
          hacienda: 'system'
        })

        logger.info('[REPORT_STORE] Reporte enviado', {
          title: report.title,
          to: recipients.length
        })
      } catch (error) {
        logger.error('[REPORT_STORE] Error enviando reporte', error)
        throw error
      }
    },

    /**
     * Calcula la próxima fecha de ejecución según la frecuencia
     * @param {string} frequency - Frecuencia ('daily', 'weekly', 'monthly')
     * @returns {string} ISO string de la próxima fecha
     */
    calculateNextRun(frequency) {
      const now = new Date()

      switch (frequency) {
        case 'daily':
          now.setDate(now.getDate() + 1)
          now.setHours(9, 0, 0, 0)
          return now.toISOString()
        case 'weekly':
          now.setDate(now.getDate() + 7)
          now.setHours(9, 0, 0, 0)
          return now.toISOString()
        case 'monthly':
          now.setMonth(now.getMonth() + 1)
          now.setDate(1)
          now.setHours(9, 0, 0, 0)
          return now.toISOString()
        default:
          return now.toISOString()
      }
    },

    /**
     * Agrupa items por una clave específica
     * @param {Array} array - Array de items
     * @param {string} key - Clave para agrupar
     * @returns {Object} Objeto con conteos
     */
    groupBy(array, key) {
      return array.reduce((groups, item) => {
        const value = item[key] || 'N/A'
        groups[value] = (groups[value] || 0) + 1
        return groups
      }, {})
    },

    /**
     * Activa o desactiva un schedule
     * @param {string} scheduleId - ID del schedule
     * @param {boolean} active - Estado deseado
     */
    async toggleSchedule(scheduleId, active) {
      const schedule = this.schedules.find(s => s.id === scheduleId)
      if (!schedule) return

      schedule.active = active
      await pb.collection('report_schedules').update(scheduleId, { active })

      logger.info('[REPORT_STORE] Schedule actualizado', { scheduleId, active })
    },

    /**
     * Elimina un schedule
     * @param {string} scheduleId - ID del schedule a eliminar
     */
    async deleteSchedule(scheduleId) {
      const index = this.schedules.findIndex(s => s.id === scheduleId)
      if (index === -1) return

      this.schedules.splice(index, 1)
      await pb.collection('report_schedules').delete(scheduleId)

      logger.info('[REPORT_STORE] Schedule eliminado', { scheduleId })
    },

    /**
     * Limpia el estado del store
     */
    reset() {
      this.templates = REPORT_TEMPLATES
      this.schedules = []
      this.history = []
      this.loading = false
      this.error = null
      logger.info('[REPORT_STORE] Store reseteado')
    },

    // =============================================================================
    // NUEVAS ACTIONS PARA SISTEMA DE REPORTES PROGRAMADOS V2
    // =============================================================================

    /**
     * Obtiene reportes programados desde el nuevo endpoint
     * Usa GET /api/reports/scheduled
     */
    async fetchScheduledReports() {
      this.loading = true
      this.error = null

      try {
        const response = await pb.send('/api/reports/scheduled')
        this.schedules = response.items || []
        logger.info('[REPORT_STORE] Schedules cargados desde API', { count: this.schedules.length })
      } catch (error) {
        logger.error('[REPORT_STORE] Error cargando schedules desde API', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Crea un nuevo reporte programado
     * Usa POST /api/reports/scheduled
     * @param {Object} data - Datos del reporte
     * @returns {Promise<Object>} Reporte creado
     */
    async createScheduledReport(data) {
      this.loading = true
      this.error = null

      try {
        const response = await pb.send('/api/reports/scheduled', {
          method: 'POST',
          body: {
            name: data.name,
            type: data.type,
            frequency: data.frequency || 'weekly',
            recipients: data.recipients || [],
            filters: data.filters || {},
            format: data.format || 'csv',
            isActive: data.isActive !== false
          }
        })

        // Actualizar localmente en lugar de refetch completo
        this.schedules.push(response)
        logger.info('[REPORT_STORE] Reporte programado creado', { id: response.id })
        return response
      } catch (error) {
        logger.error('[REPORT_STORE] Error creando reporte programado', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Actualiza un reporte programado existente
     * Usa PUT /api/reports/scheduled/:id
     * @param {string} id - ID del reporte
     * @param {Object} data - Datos a actualizar
     * @returns {Promise<Object>} Reporte actualizado
     */
    async updateScheduledReport(id, data) {
      this.loading = true
      this.error = null

      try {
        const response = await pb.send(`/api/reports/scheduled/${id}`, {
          method: 'PUT',
          body: data
        })

        // Actualizar localmente en lugar de refetch completo
        const index = this.schedules.findIndex(s => s.id === id)
        if (index !== -1) {
          this.schedules[index] = response
        }
        logger.info('[REPORT_STORE] Reporte programado actualizado', { id })
        return response
      } catch (error) {
        logger.error('[REPORT_STORE] Error actualizando reporte programado', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Elimina un reporte programado
     * Usa DELETE /api/reports/scheduled/:id
     * @param {string} id - ID del reporte
     */
    async deleteScheduledReport(id) {
      this.loading = true
      this.error = null

      try {
        await pb.send(`/api/reports/scheduled/${id}`, { method: 'DELETE' })

        // Remover localmente en lugar de refetch completo
        this.schedules = this.schedules.filter(s => s.id !== id)
        logger.info('[REPORT_STORE] Reporte programado eliminado', { id })
      } catch (error) {
        logger.error('[REPORT_STORE] Error eliminando reporte programado', error)
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})


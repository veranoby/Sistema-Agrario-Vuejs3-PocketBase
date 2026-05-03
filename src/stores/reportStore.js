import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { logger } from '@/utils/logger'
import { sendAlert } from '@/services/emailAlertService'
import { reportingModule } from '@/modules/reporting'

/**
 * Templates de reportes disponibles (mapeados a reportEngine)
 */
const REPORT_TEMPLATES = [
  {
    id: 'actividades',
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
    id: 'rendimientos',
    name: 'Reporte de Rendimiento',
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
  ACTIVIDADES: 'actividades',
  BPA_COMPLIANCE: 'bpa_compliance',
  SIEMBRAS_ACTIVAS: 'siembras_activas',
  RENDIMIENTOS: 'rendimientos'
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
     */
    getSchedulesForHacienda: (state) => (haciendaId) => {
      return state.schedules.filter(s => s.haciendaId === haciendaId)
    },

    /**
     * Obtiene un template por ID
     */
    getTemplateById: (state) => (templateId) => {
      return state.templates.find(t => t.id === templateId)
    },

    /**
     * Obtiene el historial de reportes ejecutados
     */
    getHistory: (state) => {
      return [...state.history].sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
    }
  },

  actions: {
    /**
     * Carga los schedules desde el backend
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
      } finally {
        this.loading = false
      }
    },

    /**
     * Genera un reporte delegando al reportingModule
     */
    async generateReport(templateId, haciendaId, config = {}) {
      try {
        return await reportingModule.generate(templateId, { ...config, haciendaId })
      } catch (error) {
        logger.error('[REPORT_STORE] Error generando reporte:', error)
        throw error
      }
    },

    /**
     * Ejecuta un reporte programado
     */
    async executeScheduledReport(scheduleId) {
      const schedule = this.schedules.find(s => s.id === scheduleId)
      if (!schedule) return

      try {
        const report = await this.generateReport(schedule.templateId, schedule.haciendaId)
        await this.sendReport(report, schedule.recipients)

        schedule.nextRun = this.calculateNextRun(schedule.frequency)
        this.history.unshift({
          id: Date.now(),
          scheduleId,
          templateId: schedule.templateId,
          generatedAt: new Date().toISOString(),
          recipients: schedule.recipients.length
        })

        await pb.collection('report_schedules').update(scheduleId, {
          nextRun: schedule.nextRun
        })
      } catch (error) {
        logger.error('[REPORT_STORE] Error ejecutando reporte programado:', error)
      }
    },

    /**
     * Envía un reporte por email
     */
    async sendReport(report, recipients) {
      try {
        await sendAlert({
          type: 'recordatorio',
          recipients,
          data: {
            titulo: report.metadata?.title || 'Reporte del Sistema',
            descripcion: `Reporte generado el ${new Date().toLocaleString()}`,
            reporte: report
          },
          hacienda: 'system'
        })
      } catch (error) {
        logger.error('[REPORT_STORE] Error enviando reporte por email:', error)
      }
    },

    calculateNextRun(frequency) {
      const now = new Date()
      switch (frequency) {
        case 'daily': now.setDate(now.getDate() + 1); break
        case 'weekly': now.setDate(now.getDate() + 7); break
        case 'monthly': now.setMonth(now.getMonth() + 1); break
      }
      now.setHours(9, 0, 0, 0)
      return now.toISOString()
    },

    async toggleSchedule(scheduleId, active) {
      const schedule = this.schedules.find(s => s.id === scheduleId)
      if (!schedule) return
      schedule.active = active
      await pb.collection('report_schedules').update(scheduleId, { active })
    },

    async deleteSchedule(scheduleId) {
      this.schedules = this.schedules.filter(s => s.id !== scheduleId)
      await pb.collection('report_schedules').delete(scheduleId)
    }
  }
})


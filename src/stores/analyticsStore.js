import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'
import { exportToCSV } from '@/utils/exporters'

export const useAnalyticsStore = defineStore('analytics', {
  state: () => ({
    globalMetrics: null,
    usageMetrics: null,
    patterns: null,
    loading: false,
    error: null
  }),

  getters: {
    /**
     * Verificar si hay métricas globales cargadas
     */
    hasGlobalMetrics: (state) => state.globalMetrics !== null,

    /**
     * Verificar si hay métricas de uso cargadas
     */
    hasUsageMetrics: (state) => state.usageMetrics !== null,

    /**
     * Obtener total de usuarios
     */
    totalUsers: (state) => state.globalMetrics?.totalUsers || 0,

    /**
     * Obtener crecimiento
     */
    growthRate: (state) => {
      const metrics = state.globalMetrics
      if (!metrics) return 0
      const current = metrics.activeUsers?.month || 0
      const previous = metrics.totalUsers || 1
      return Math.round(((current - previous) / previous) * 100)
    }
  },

  actions: {
    /**
     * Obtener métricas globales
     * @param {string} range - 'day' | 'week' | 'month' | 'custom'
     */
    async fetchGlobalMetrics(range = 'month') {
      this.loading = true
      this.error = null

      try {
        const response = await fetch(`/api/analytics/global?range=${range}`, {
          headers: {
            'Authorization': `Bearer ${pb.authStore.token}`
          }
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error fetching global metrics')
        }

        const data = await response.json()
        this.globalMetrics = data
        
        logger.info('[ANALYTICS] Métricas globales cargadas', { range })
        return data
      } catch (error) {
        handleError(error, 'Error cargando métricas globales')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Obtener métricas de uso
     * @param {Object} filters - { userId, haciendaId, moduleId, startDate, endDate }
     */
    async fetchUsageMetrics(filters) {
      this.loading = true
      this.error = null

      if (!filters.startDate || !filters.endDate) {
        this.error = 'startDate and endDate required'
        this.loading = false
        throw new Error(this.error)
      }

      try {
        const params = new URLSearchParams({
          startDate: filters.startDate,
          endDate: filters.endDate
        })

        if (filters.userId) params.append('userId', filters.userId)
        if (filters.haciendaId) params.append('haciendaId', filters.haciendaId)
        if (filters.moduleId) params.append('moduleId', filters.moduleId)

        const response = await fetch(`/api/analytics/usage?${params}`, {
          headers: {
            'Authorization': `Bearer ${pb.authStore.token}`
          }
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error fetching usage metrics')
        }

        const data = await response.json()
        this.usageMetrics = data
        
        logger.info('[ANALYTICS] Métricas de uso cargadas', { 
          totalActions: data.totalActions 
        })
        return data
      } catch (error) {
        handleError(error, 'Error cargando métricas de uso')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Obtener patrones (data mining)
     * @param {Object} filters - { type, region, cultivo }
     */
    async fetchPatterns(filters = {}) {
      this.loading = true
      this.error = null

      try {
        const params = new URLSearchParams({
          type: filters.type || 'siembra'
        })

        if (filters.region) params.append('region', filters.region)
        if (filters.cultivo) params.append('cultivo', filters.cultivo)

        const response = await fetch(`/api/analytics/patterns?${params}`, {
          headers: {
            'Authorization': `Bearer ${pb.authStore.token}`
          }
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error fetching patterns')
        }

        const data = await response.json()
        this.patterns = data
        
        logger.info('[ANALYTICS] Patrones cargados', { 
          type: data.type, 
          count: data.patterns?.length 
        })
        return data
      } catch (error) {
        handleError(error, 'Error cargando patrones')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Exportar métricas de uso a CSV
     * @param {Object} filters - Filtros para la exportación
     */
    async exportToCSV(filters) {
      this.loading = true
      this.error = null

      if (!filters.startDate || !filters.endDate) {
        this.error = 'startDate and endDate required'
        this.loading = false
        throw new Error(this.error)
      }

      try {
        // Obtener datos desde API
        const params = new URLSearchParams({
          startDate: filters.startDate,
          endDate: filters.endDate
        })

        if (filters.userId) params.append('userId', filters.userId)
        if (filters.haciendaId) params.append('haciendaId', filters.haciendaId)

        const response = await fetch(`/api/analytics/usage?${params}`, {
          headers: {
            'Authorization': `Bearer ${pb.authStore.token}`
          }
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Error fetching usage data')
        }

        const data = await response.json()

        // Usar exportToCSV compartido
        const csvData = data.activityByDay?.map(d => ({
          date: d.date,
          count: d.count
        })) || []

        if (csvData.length === 0) {
          this.error = 'No data to export'
          this.loading = false
          throw new Error(this.error)
        }

        const filename = `usage_metrics_${filters.startDate}_${filters.endDate}.csv`
        exportToCSV(csvData, filename)

        logger.info('[ANALYTICS] CSV exportado exitosamente', { rows: csvData.length })
      } catch (error) {
        handleError(error, 'Error exportando CSV')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Limpiar estado
     */
    reset() {
      this.globalMetrics = null
      this.usageMetrics = null
      this.patterns = null
      this.loading = false
      this.error = null
    }
  }
})

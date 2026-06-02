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

    async fetchResumenCostosOperativos() {
      this.loading = true
      this.error = null

      try {
        const { useFinanzaStore } = await import('./finanzaStore')
        const { useBodegaMovimientosStore } = await import('./bodegaMovimientosStore')
        const { useBodegaStore } = await import('./bodegaStore')
        const { useNominaStore } = await import('./nominaStore')
        const { useHaciendaStore } = await import('./haciendaStore')

        const finanzasStore = useFinanzaStore()
        const bodegaMovStore = useBodegaMovimientosStore()
        const bodegaStore = useBodegaStore()
        const nominaStore = useNominaStore()
        const haciendaStore = useHaciendaStore()

        const isNominaActive = haciendaStore.isModuleActive('nomina_express')
        const isBodegaActive = haciendaStore.isModuleActive('kardex_bodega')

        const promises = [finanzasStore.cargarRegistros()]
        if (isBodegaActive) {
          promises.push(bodegaMovStore.cargarMovimientos())
          promises.push(bodegaStore.cargarItems())
        }
        if (isNominaActive) {
          promises.push(nominaStore.cargarHistoricoNomina())
        }
        
        await Promise.all(promises)

        const finanzasSuma = finanzasStore.registros.reduce((sum, r) => sum + (r.monto || 0), 0)

        let bodegaSuma = 0
        if (isBodegaActive) {
          bodegaSuma = bodegaMovStore.movimientos
            .filter(m => m.tipo === 'egreso')
            .reduce((sum, m) => {
              const item = bodegaStore.items.find(i => i.id === m.item)
              const price = m.costo_unitario_aplicado || item?.costo_promedio_ponderado || item?.costo_adquisicion || 0
              return sum + (Number(m.cantidad) || 0) * price
            }, 0)
        }

        let nominaSuma = 0
        if (isNominaActive) {
          nominaSuma = nominaStore.nominas.reduce((sum, n) => sum + (Number(n.total_pagado) || 0), 0)
        }

        this.globalMetrics = {
          totalCostos: finanzasSuma + bodegaSuma + nominaSuma,
          totalFinanzas: finanzasSuma,
          totalBodega: bodegaSuma,
          totalNomina: nominaSuma
        }

        return this.globalMetrics
      } catch (error) {
        handleError(error, 'Error cargando resumen de costos operativos')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async calcularCostoPorHectarea(siembraId) {
      this.loading = true
      try {
        const { useSiembrasStore } = await import('./siembrasStore')
        const { useBodegaMovimientosStore } = await import('./bodegaMovimientosStore')
        const { useBodegaStore } = await import('./bodegaStore')
        const { useTarjasStore } = await import('./tarjasStore')
        const { useNominaStore } = await import('./nominaStore')
        const { useBitacoraStore } = await import('./bitacoraStore')

        const siembrasStore = useSiembrasStore()
        const bodegaMovStore = useBodegaMovimientosStore()
        const bodegaStore = useBodegaStore()
        const tarjasStore = useTarjasStore()
        const nominaStore = useNominaStore()
        const bitacoraStore = useBitacoraStore()

        await Promise.all([
          siembrasStore.cargarSiembras(),
          bodegaMovStore.cargarMovimientos(),
          bodegaStore.cargarItems(),
          tarjasStore.cargarTarjas(),
          nominaStore.cargarHistoricoNomina(),
          bitacoraStore.init()
        ])

        const siembra = siembrasStore.getSiembraById(siembraId)
        if (!siembra) throw new Error('Siembra no encontrada')

        const insumosCosto = bodegaMovStore.movimientos
          .filter(m => {
            if (m.tipo !== 'egreso') return false
            if (m.siembra === siembraId) return true
            if (m.notas && m.notas.includes(siembraId)) return true
            if (m.expand?.bitacora) {
              const bSiembras = m.expand.bitacora.siembras || []
              if (Array.isArray(bSiembras) && bSiembras.includes(siembraId)) return true
              if (bSiembras === siembraId) return true
            }
            return false
          })
          .reduce((sum, m) => {
            const item = bodegaStore.items.find(i => i.id === m.item)
            const price = m.costo_unitario_aplicado || item?.costo_promedio_ponderado || item?.costo_adquisicion || 0
            return sum + (Number(m.cantidad) || 0) * price
          }, 0)

        let manoObraCosto = 0
        const rates = nominaStore.rates || { cajas: 0.50, racimos: 0.20, kilos: 0.10, unidades: 0.05 }
        const siembraTarjas = tarjasStore.tarjas.filter(t => t.siembra === siembraId)
        siembraTarjas.forEach(t => {
          const rate = rates[t.tipo_unidad] || 0.05
          manoObraCosto += (t.cantidad || 0) * rate
        })

        let jornalCost = 0
        const siembraBitacoras = bitacoraStore.bitacoraEntries.filter(b => {
          const siembras = b.siembras || []
          if (Array.isArray(siembras)) return siembras.includes(siembraId)
          return siembras === siembraId
        })
        siembraBitacoras.forEach(b => {
          const numWorkers = Array.isArray(b.trabajadores_involucrados) ? b.trabajadores_involucrados.length : 0;
          let sumJornales = 0;
          if (numWorkers > 0) {
            b.trabajadores_involucrados.forEach(wid => {
               const w = nominaStore.plantilla?.find(w => w.id === wid);
               sumJornales += (w?.valor_jornal || nominaStore.defaultJornal || 15.00);
            });
          } else {
             sumJornales = nominaStore.defaultJornal || 15.00;
          }
          const numSiembras = Array.isArray(b.siembras) ? b.siembras.length : 1
          jornalCost += sumJornales / (numSiembras || 1)
        })

        const area = Number(siembra.area_total) || 1
        const costoTotal = insumosCosto + manoObraCosto + jornalCost
        const costoPorHectarea = costoTotal / area

        return {
          siembraId,
          nombre: siembra.nombre,
          area,
          insumosCosto,
          manoObraCosto: manoObraCosto + jornalCost,
          costoTotal,
          costoPorHectarea
        }
      } catch (err) {
        handleError(err, 'Error al calcular costo por hectárea')
        throw err
      } finally {
        this.loading = false
      }
    },

    async proyeccionDeCosechaSemanal() {
      this.loading = true
      try {
        const { useTarjasStore } = await import('./tarjasStore')
        const tarjasStore = useTarjasStore()
        await tarjasStore.cargarTarjas()

        const semanales = {}
        tarjasStore.tarjas.forEach(t => {
          const fechaObj = new Date(t.fecha || t.created)
          const startOfYear = new Date(fechaObj.getFullYear(), 0, 1)
          const pastDays = (fechaObj - startOfYear) / 86400000
          const weekNumber = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7)
          const key = `Semana ${weekNumber}`

          if (!semanales[key]) {
            semanales[key] = { semana: key, cajas: 0, racimos: 0, kilos: 0, unidades: 0 }
          }
          if (semanales[key][t.tipo_unidad] !== undefined) {
            semanales[key][t.tipo_unidad] += t.cantidad || 0
          }
        })

        return Object.values(semanales)
          .sort((a, b) => a.semana.localeCompare(b.semana, undefined, { numeric: true }))
          .slice(-6)
      } catch (err) {
        handleError(err, 'Error al calcular proyección de cosecha')
        throw err
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

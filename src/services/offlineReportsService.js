// FASE 4: Servicio para generación de reportes offline
import { useSyncStore } from '@/stores/syncStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useHaciendaStore } from '@/stores/haciendaStore'

/**
 * Servicio especializado para generación de reportes offline
 * Funciona completamente sin conexión a internet
 */
export class OfflineReportsService {
  constructor() {
    this.syncStore = null
    this.reportTypes = {
      BPA_COMPLIANCE: 'bpa_compliance',
      ACTIVITY_SUMMARY: 'activity_summary',
      PRODUCTIVITY: 'productivity',
      HARVEST_REPORT: 'harvest_report',
      FINANCIAL_SUMMARY: 'financial_summary'
    }
  }

  // Inicializar servicio
  init() {
    try {
      this.syncStore = useSyncStore()
      console.log('OfflineReportsService inicializado')
    } catch (error) {
      console.error('Error inicializando OfflineReportsService:', error)
    }
  }

  // Generar reporte completo BPA con detalles extendidos
  async generateBPAComplianceReport(options = {}) {
    try {
      const {
        includeDetails = true,
        includerecommendations = true,
        dateFrom = null,
        dateTo = null
      } = options

      const report = {
        id: `bpa_${Date.now()}`,
        type: this.reportTypes.BPA_COMPLIANCE,
        title: 'Reporte de Cumplimiento BPA',
        generatedAt: new Date().toISOString(),
        options,
        data: {
          summary: {},
          haciendas: [],
          zonas: [],
          recommendations: [],
          charts: []
        }
      }

      // Obtener datos de stores
      const zonasStore = useZonasStore()
      const haciendaStore = useHaciendaStore()
      const zonas = zonasStore.items || []
      const haciendas = haciendaStore.items || []

      // Procesar zonas con datos BPA
      let totalScore = 0
      let zonasWithBPA = 0

      zonas.forEach(zona => {
        if (zona.datos_bpa) {
          const bpaScore = this.calculateBPAScore(zona.datos_bpa)
          const zonaData = {
            id: zona.id,
            nombre: zona.nombre || 'Sin nombre',
            hacienda: this.findHaciendaName(zona.hacienda, haciendas),
            bpaScore,
            datos_bpa: includeDetails ? zona.datos_bpa : null,
            lastUpdate: zona.updated || zona.created,
            status: this.getBPAStatus(bpaScore)
          }

          report.data.zonas.push(zonaData)
          totalScore += bpaScore
          zonasWithBPA++
        }
      })

      // Calcular resumen
      report.data.summary = {
        totalZonas: zonas.length,
        zonasWithBPA,
        averageScore: zonasWithBPA > 0 ? Math.round(totalScore / zonasWithBPA) : 0,
        complianceLevel: this.getComplianceLevel(totalScore / zonasWithBPA),
        distribution: this.calculateScoreDistribution(report.data.zonas)
      }

      // Generar recomendaciones si es solicitado
      if (includerecommendations) {
        report.data.recommendations = this.generateBPARecommendations(report.data.zonas, report.data.summary)
      }

      // Generar datos para charts
      report.data.charts = this.generateBPAChartData(report.data.zonas)

      console.log('Reporte BPA generado offline:', report.id)
      return report

    } catch (error) {
      console.error('Error generando reporte BPA offline:', error)
      return null
    }
  }

  // Generar reporte de resumen de actividades
  async generateActivitySummaryReport(options = {}) {
    try {
      const {
        groupBy = 'categoria',
        includeMetrics = true,
        dateFrom = null,
        dateTo = null
      } = options

      const report = {
        id: `activities_${Date.now()}`,
        type: this.reportTypes.ACTIVITY_SUMMARY,
        title: 'Resumen de Actividades',
        generatedAt: new Date().toISOString(),
        options,
        data: {
          summary: {},
          activities: [],
          groupedData: {},
          trends: []
        }
      }

      const actividadesStore = useActividadesStore()
      const actividades = actividadesStore.items || []

      // Filtrar por fechas si se especifican
      let filteredActivities = actividades
      if (dateFrom || dateTo) {
        filteredActivities = this.filterByDateRange(actividades, dateFrom, dateTo)
      }

      // Procesar actividades
      const processedActivities = filteredActivities.map(actividad => ({
        id: actividad.id,
        nombre: actividad.nombre || 'Sin nombre',
        categoria: actividad.categoria || 'Sin categoría',
        estado: actividad.estado || 'pendiente',
        prioridad: actividad.prioridad || 'normal',
        fechaCreacion: actividad.created,
        fechaActualizacion: actividad.updated,
        metricas: includeMetrics ? actividad.metricas : null
      }))

      report.data.activities = processedActivities

      // Agrupar datos según criterio
      report.data.groupedData = this.groupActivities(processedActivities, groupBy)

      // Calcular resumen
      report.data.summary = {
        total: processedActivities.length,
        completadas: processedActivities.filter(a => a.estado === 'completado').length,
        pendientes: processedActivities.filter(a => a.estado === 'pendiente').length,
        enProceso: processedActivities.filter(a => a.estado === 'en_proceso').length,
        porCategoria: this.countByField(processedActivities, 'categoria'),
        porPrioridad: this.countByField(processedActivities, 'prioridad')
      }

      console.log('Reporte de actividades generado offline:', report.id)
      return report

    } catch (error) {
      console.error('Error generando reporte de actividades offline:', error)
      return null
    }
  }

  // Generar reporte de productividad
  async generateProductivityReport(options = {}) {
    try {
      const {
        includeEfficiency = true,
        includeTrends = true,
        period = 'monthly'
      } = options

      const report = {
        id: `productivity_${Date.now()}`,
        type: this.reportTypes.PRODUCTIVITY,
        title: 'Reporte de Productividad',
        generatedAt: new Date().toISOString(),
        options,
        data: {
          summary: {},
          productivity: {},
          efficiency: {},
          trends: []
        }
      }

      // Simular datos de productividad (en implementación real vendría de bitácora)
      const actividadesStore = useActividadesStore()
      const actividades = actividadesStore.items || []

      // Calcular métricas de productividad básicas
      report.data.summary = {
        totalActividades: actividades.length,
        actividadesCompletadas: actividades.filter(a => a.estado === 'completado').length,
        tasaCompletacion: actividades.length > 0
          ? Math.round((actividades.filter(a => a.estado === 'completado').length / actividades.length) * 100)
          : 0,
        promedioTiempo: this.calculateAverageTime(actividades)
      }

      // Calcular eficiencia si es solicitado
      if (includeEfficiency) {
        report.data.efficiency = this.calculateEfficiencyMetrics(actividades)
      }

      // Generar tendencias si es solicitado
      if (includeTrends) {
        report.data.trends = this.generateProductivityTrends(actividades, period)
      }

      console.log('Reporte de productividad generado offline:', report.id)
      return report

    } catch (error) {
      console.error('Error generando reporte de productividad offline:', error)
      return null
    }
  }

  // Exportar reporte a diferentes formatos
  async exportReport(report, format = 'json') {
    try {
      let content
      let mimeType
      let extension

      switch (format.toLowerCase()) {
        case 'json':
          content = JSON.stringify(report, null, 2)
          mimeType = 'application/json'
          extension = 'json'
          break

        case 'csv':
          content = this.convertToCSV(report)
          mimeType = 'text/csv'
          extension = 'csv'
          break

        case 'txt':
          content = this.convertToText(report)
          mimeType = 'text/plain'
          extension = 'txt'
          break

        default:
          throw new Error('Formato no soportado: ' + format)
      }

      // Crear y descargar archivo
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `${report.type}_${new Date().toISOString().split('T')[0]}.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('Reporte exportado:', format)
      return true

    } catch (error) {
      console.error('Error exportando reporte:', error)
      return false
    }
  }

  // Métodos auxiliares

  calculateBPAScore(datosBpa) {
    if (!datosBpa || typeof datosBpa !== 'object') return 0

    let totalPoints = 0
    let maxPoints = 0

    Object.values(datosBpa).forEach(value => {
      if (typeof value === 'number') {
        totalPoints += value
        maxPoints += 100
      }
    })

    return maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0
  }

  getBPAStatus(score) {
    if (score >= 90) return 'excelente'
    if (score >= 75) return 'bueno'
    if (score >= 60) return 'regular'
    return 'deficiente'
  }

  getComplianceLevel(score) {
    if (score >= 90) return 'Excelente'
    if (score >= 75) return 'Bueno'
    if (score >= 60) return 'Regular'
    return 'Deficiente'
  }

  calculateScoreDistribution(zonas) {
    const distribution = {
      excelente: 0,
      bueno: 0,
      regular: 0,
      deficiente: 0
    }

    zonas.forEach(zona => {
      const status = this.getBPAStatus(zona.bpaScore)
      distribution[status]++
    })

    return distribution
  }

  generateBPARecommendations(zonas, summary) {
    const recommendations = []

    if (summary.averageScore < 75) {
      recommendations.push({
        priority: 'high',
        category: 'general',
        title: 'Mejora urgente del cumplimiento BPA',
        description: 'El puntaje promedio está por debajo del estándar aceptable (75%)',
        actions: [
          'Revisar y actualizar protocolos BPA',
          'Capacitar al personal en buenas prácticas',
          'Implementar sistema de verificación regular'
        ]
      })
    }

    // Identificar zonas con menor puntaje
    const lowScoreZones = zonas.filter(zona => zona.bpaScore < 60)
    if (lowScoreZones.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'zonas_criticas',
        title: `${lowScoreZones.length} zona(s) requieren atención inmediata`,
        description: 'Zonas con puntaje BPA crítico (< 60%)',
        actions: lowScoreZones.map(zona => `Revisar zona: ${zona.nombre}`)
      })
    }

    return recommendations
  }

  generateBPAChartData(zonas) {
    return [
      {
        type: 'distribution',
        title: 'Distribución de Puntajes BPA',
        data: this.calculateScoreDistribution(zonas)
      },
      {
        type: 'scores',
        title: 'Puntajes por Zona',
        data: zonas.map(zona => ({
          label: zona.nombre,
          value: zona.bpaScore
        }))
      }
    ]
  }

  findHaciendaName(haciendaId, haciendas) {
    const hacienda = haciendas.find(h => h.id === haciendaId)
    return hacienda ? hacienda.name || hacienda.nombre : 'Sin asignar'
  }

  filterByDateRange(items, dateFrom, dateTo) {
    return items.filter(item => {
      const itemDate = new Date(item.created || item.fecha)
      if (dateFrom && itemDate < new Date(dateFrom)) return false
      if (dateTo && itemDate > new Date(dateTo)) return false
      return true
    })
  }

  groupActivities(activities, groupBy) {
    const groups = {}

    activities.forEach(activity => {
      const key = activity[groupBy] || 'Sin asignar'
      if (!groups[key]) groups[key] = []
      groups[key].push(activity)
    })

    return groups
  }

  countByField(items, field) {
    const counts = {}

    items.forEach(item => {
      const value = item[field] || 'Sin asignar'
      counts[value] = (counts[value] || 0) + 1
    })

    return counts
  }

  calculateAverageTime(activities) {
    // Simulado - en implementación real vendría de métricas
    return Math.round(Math.random() * 60) + 30 // 30-90 minutos promedio
  }

  calculateEfficiencyMetrics(activities) {
    return {
      tasaCompletacion: activities.length > 0
        ? (activities.filter(a => a.estado === 'completado').length / activities.length) * 100
        : 0,
      tiempoPromedio: this.calculateAverageTime(activities),
      factorCalidad: Math.random() * 20 + 80 // 80-100% simulado
    }
  }

  generateProductivityTrends(activities, period) {
    // Simulado - análisis de tendencias básico
    const trends = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      trends.push({
        date: date.toISOString().split('T')[0],
        actividades: Math.floor(Math.random() * 10) + 5,
        completadas: Math.floor(Math.random() * 8) + 3
      })
    }

    return trends
  }

  convertToCSV(report) {
    let csv = `Reporte: ${report.title}\n`
    csv += `Generado: ${report.generatedAt}\n\n`

    if (report.data.zonas) {
      csv += 'Zonas BPA\n'
      csv += 'Nombre,Hacienda,Puntaje BPA,Estado\n'
      report.data.zonas.forEach(zona => {
        csv += `${zona.nombre},${zona.hacienda},${zona.bpaScore},${zona.status}\n`
      })
    }

    if (report.data.activities) {
      csv += '\nActividades\n'
      csv += 'Nombre,Categoría,Estado,Prioridad\n'
      report.data.activities.forEach(activity => {
        csv += `${activity.nombre},${activity.categoria},${activity.estado},${activity.prioridad}\n`
      })
    }

    return csv
  }

  convertToText(report) {
    let text = `${report.title}\n`
    text += `Generado: ${new Date(report.generatedAt).toLocaleString()}\n`
    text += '='.repeat(50) + '\n\n'

    if (report.data.summary) {
      text += 'RESUMEN\n'
      text += '-'.repeat(20) + '\n'
      Object.entries(report.data.summary).forEach(([key, value]) => {
        text += `${key}: ${JSON.stringify(value)}\n`
      })
      text += '\n'
    }

    if (report.data.recommendations) {
      text += 'RECOMENDACIONES\n'
      text += '-'.repeat(20) + '\n'
      report.data.recommendations.forEach((rec, index) => {
        text += `${index + 1}. ${rec.title}\n`
        text += `   ${rec.description}\n\n`
      })
    }

    return text
  }
}

// Exportar instancia singleton
export const offlineReportsService = new OfflineReportsService()

// Auto-inicializar si es posible
if (typeof window !== 'undefined') {
  setTimeout(() => {
    try {
      offlineReportsService.init()
    } catch (error) {
      console.warn('No se pudo auto-inicializar OfflineReportsService:', error)
    }
  }, 1000)
}
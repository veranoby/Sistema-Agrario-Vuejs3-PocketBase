/**
 * ReportGenerator - Motor de reportes personalizados
 * 
 * Genera reportes avanzados de rendimientos, finanzas y cumplimiento
 * con soporte para exportación a PDF y Excel.
 * 
 * @module utils/reportGenerator
 */

import { logger } from './logger'
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth } from 'date-fns'

/**
 * @typedef {Object} ReportConfig
 * @property {string} type - Tipo de reporte (rendimientos, finanzas, cumplimiento)
 * @property {Date} startDate - Fecha de inicio
 * @property {Date} endDate - Fecha de fin
 * @property {string} haciendaId - ID de hacienda
 * @property {string[]} cultivos - Filtro por cultivos
 * @property {string[]} zonas - Filtro por zonas
 * @property {string} format - Formato de salida (json, pdf, excel)
 */

/**
 * @typedef {Object} ReportData
 * @property {Object} metadata - Metadatos del reporte
 * @property {Object} data - Datos del reporte
 * @property {Array} charts - Configuración de gráficos
 * @property {string} generatedAt - Timestamp de generación
 */

export class ReportGenerator {
  constructor() {
    this.templates = new Map()
    this.loadTemplates()
  }

  /**
   * Carga plantillas de reportes predefinidas
   * @private
   */
  loadTemplates() {
    // Plantilla de rendimientos
    this.templates.set('rendimientos', {
      name: 'Rendimiento por Cultivo',
      description: 'Análisis de rendimiento agrícola por tipo de cultivo',
      fields: ['cultivo', 'area', 'produccion', 'rendimiento', 'fecha'],
      charts: ['bar', 'line', 'pie']
    })

    // Plantilla de finanzas
    this.templates.set('finanzas', {
      name: 'Reporte Financiero',
      description: 'Estado de ingresos, costos y rentabilidad',
      fields: ['concepto', 'ingreso', 'costo', 'utilidad', 'fecha'],
      charts: ['waterfall', 'line']
    })

    // Plantilla de cumplimiento BPA
    this.templates.set('cumplimiento', {
      name: 'Cumplimiento BPA',
      description: 'Verificación de Buenas Prácticas Agrícolas',
      fields: ['actividad', 'cumplimiento', 'observaciones', 'fecha'],
      charts: ['radar', 'gauge']
    })

    // Plantilla de actividades
    this.templates.set('actividades', {
      name: 'Reporte de Actividades',
      description: 'Historial de actividades realizadas',
      fields: ['actividad', 'zona', 'responsable', 'estado', 'fecha'],
      charts: ['bar', 'timeline']
    })

    logger.debug('[ReportGenerator] Plantillas cargadas:', this.templates.size)
  }

  /**
   * Genera un reporte completo
   * 
   * @param {ReportConfig} config - Configuración del reporte
   * @returns {Promise<ReportData>}
   * 
   * @example
   * const generator = new ReportGenerator()
   * const report = await generator.generate({
   *   type: 'rendimientos',
   *   startDate: new Date('2026-01-01'),
   *   endDate: new Date(),
   *   haciendaId: 'hac_123'
   * })
   */
  async generate(config) {
    logger.debug('[ReportGenerator] Generando reporte:', config)

    const template = this.templates.get(config.type)
    if (!template) {
      throw new Error(`Plantilla no encontrada: ${config.type}`)
    }

    // Obtener datos
    const data = await this.fetchData(config)

    // Procesar datos según plantilla
    const processedData = this.processData(data, template)

    // Generar gráficos
    const charts = this.generateCharts(processedData, template)

    return {
      metadata: {
        type: config.type,
        template: template.name,
        startDate: config.startDate,
        endDate: config.endDate,
        generatedAt: new Date().toISOString(),
        filters: {
          cultivos: config.cultivos,
          zonas: config.zonas,
          haciendaId: config.haciendaId
        }
      },
      data: processedData,
      charts: charts,
      summary: this.generateSummary(processedData, config.type)
    }
  }

  /**
   * Obtiene datos según tipo de reporte
   * @private
   */
  async fetchData(config) {
    switch (config.type) {
      case 'rendimientos':
        return this.fetchYieldData(config)
      case 'finanzas':
        return this.fetchFinancialData(config)
      case 'cumplimiento':
        return this.fetchComplianceData(config)
      case 'actividades':
        return this.fetchActivitiesData(config)
      default:
        throw new Error(`Tipo de reporte no soportado: ${config.type}`)
    }
  }

  /**
   * Obtiene datos de rendimientos
   * @private
   */
  async fetchYieldData(config) {
    // Simulación de datos - en producción usar stores reales
    const siembras = await this.getSiembrasData(config)
    
    return siembras.map(siembra => ({
      cultivo: siembra.tipo_cultivo || 'Sin especificar',
      zona: siembra.zona_nombre || 'Sin zona',
      area: siembra.area_total || 0,
      produccion: siembra.produccion_estimada || 0,
      rendimiento: siembra.rendimiento || 0,
      fecha_siembra: siembra.fecha_siembra,
      fecha_cosecha: siembra.fecha_cosecha_estimada,
      estado: siembra.estado,
      dias_ciclo: this.calculateCycleDays(siembra)
    }))
  }

  /**
   * Obtiene datos financieros
   * @private
   */
  async fetchFinancialData(config) {
    // Simulación de datos financieros
    const ingresos = await this.getIngresosData(config)
    const costos = await this.getCostosData(config)

    return {
      ingresos,
      costos,
      balance: ingresos.reduce((sum, i) => sum + i.monto, 0) - costos.reduce((sum, c) => sum + c.monto, 0),
      porCategoria: this.agruparPorCategoria(ingresos, costos)
    }
  }

  /**
   * Obtiene datos de cumplimiento BPA
   * @private
   */
  async fetchComplianceData(config) {
    // Simulación de datos de cumplimiento
    const actividades = await this.getActividadesData(config)
    
    return actividades.map(act => ({
      actividad: act.nombre,
      categoria: act.categoria,
      cumplimiento: act.cumplimiento_bpa || 0,
      observaciones: act.observaciones || '',
      fecha: act.fecha_ejecucion,
      responsable: act.responsable,
      criticidad: act.criticidad || 'media'
    }))
  }

  /**
   * Obtiene datos de actividades
   * @private
   */
  async fetchActivitiesData(config) {
    const actividades = await this.getActividadesData(config)
    
    return actividades.map(act => ({
      actividad: act.nombre,
      zona: act.zona_nombre,
      responsable: act.responsable,
      estado: act.estado,
      fecha: act.fecha_ejecucion,
      duracion: act.duracion_estimada,
      completada: act.estado === 'completada'
    }))
  }

  /**
   * Procesa datos según plantilla
   * @private
   */
  processData(data, template) {
    if (!data) return {}

    // Filtrar campos según plantilla
    if (Array.isArray(data)) {
      return data.map(item => {
        const filtered = {}
        template.fields.forEach(field => {
          if (item[field] !== undefined) {
            filtered[field] = item[field]
          }
        })
        return filtered
      })
    }

    return data
  }

  /**
   * Genera configuración de gráficos
   * @private
   */
  generateCharts(data, template) {
    const charts = []

    if (Array.isArray(data) && data.length > 0) {
      // Gráfico de barras por cultivo
      if (data[0].cultivo) {
        const porCultivo = this.agruparPorCultivo(data)
        charts.push({
          type: 'bar',
          title: 'Rendimiento por Cultivo',
          labels: porCultivo.map(d => d.cultivo),
          datasets: [{
            label: 'Rendimiento (kg/ha)',
            data: porCultivo.map(d => d.rendimiento)
          }]
        })
      }

      // Gráfico de línea temporal
      if (data[0].fecha_siembra) {
        const porFecha = this.agruparPorFecha(data)
        charts.push({
          type: 'line',
          title: 'Evolución Temporal',
          labels: porFecha.map(d => d.fecha),
          datasets: [{
            label: 'Siembras',
            data: porFecha.map(d => d.valor)
          }]
        })
      }

      // Gráfico de pastel por estado
      const porEstado = this.agruparPorEstado(data)
      charts.push({
        type: 'pie',
        title: 'Distribución por Estado',
        labels: porEstado.map(d => d.estado),
        datasets: [{
          data: porEstado.map(d => d.cantidad)
        }]
      })
    }

    return charts
  }

  /**
   * Genera resumen ejecutivo
   * @private
   */
  generateSummary(data, type) {
    if (!Array.isArray(data) || data.length === 0) {
      return { message: 'Sin datos para mostrar' }
    }

    switch (type) {
      case 'rendimientos':
        return {
          totalSiembras: data.length,
          rendimientoPromedio: Math.round(data.reduce((sum, d) => sum + (d.rendimiento || 0), 0) / data.length),
          areaTotal: data.reduce((sum, d) => sum + (d.area || 0), 0).toFixed(2),
          cultivoPrincipal: this.getModa(data.map(d => d.cultivo))
        }

      case 'finanzas':
        return {
          totalIngresos: data.ingresos?.reduce((sum, i) => sum + i.monto, 0) || 0,
          totalCostos: data.costos?.reduce((sum, c) => sum + c.monto, 0) || 0,
          utilidad: data.balance || 0,
          margenUtilidad: data.ingresos?.length > 0
            ? ((data.balance / data.ingresos.reduce((sum, i) => sum + i.monto, 0)) * 100).toFixed(2)
            : 0
        }

      case 'cumplimiento':
        const cumplimientoPromedio = data.reduce((sum, d) => sum + (d.cumplimiento || 0), 0) / data.length
        return {
          totalActividades: data.length,
          cumplimientoPromedio: cumplimientoPromedio.toFixed(2) + '%',
          nivelCumplimiento: cumplimientoPromedio >= 90 ? 'Excelente' : cumplimientoPromedio >= 70 ? 'Bueno' : 'Mejorable'
        }

      default:
        return { totalRegistros: data.length }
    }
  }

  // ============================================================================
  // MÉTODOS AUXILIARES DE OBTENCIÓN DE DATOS
  // ============================================================================

  async getSiembrasData(config) {
    // En producción, usar el store real dinámicamente
    try {
      const { useSiembrasStore } = await import('@/stores/siembrasStore')
      const siembrasStore = useSiembrasStore()
      
      // Asegurar que los datos estén cargados
      if (!siembrasStore.siembras || siembrasStore.siembras.length === 0) {
        await siembrasStore.fetchSiembras()
      }

      let data = siembrasStore.siembras || []

      // Aplicar filtros
      if (config.haciendaId) {
        data = data.filter(s => s.hacienda === config.haciendaId)
      }
      if (config.cultivos && config.cultivos.length > 0) {
        data = data.filter(s => config.cultivos.includes(s.tipo_cultivo))
      }
      if (config.zonas && config.zonas.length > 0) {
        data = data.filter(s => config.zonas.includes(s.zona))
      }
      if (config.startDate) {
        data = data.filter(s => s.fecha_siembra && new Date(s.fecha_siembra) >= config.startDate)
      }
      if (config.endDate) {
        data = data.filter(s => s.fecha_siembra && new Date(s.fecha_siembra) <= config.endDate)
      }

      return data
    } catch (error) {
      logger.error('[ReportGenerator] Error obteniendo siembras:', error)
      return []
    }
  }

  async getIngresosData(config) {
    try {
      const { useFinanzaStore } = await import('@/stores/finanzaStore')
      const finanzaStore = useFinanzaStore()
      
      if (!finanzaStore.ingresos || finanzaStore.ingresos.length === 0) {
        await finanzaStore.fetchFinanzas()
      }

      let data = finanzaStore.ingresos || []

      if (config.haciendaId) {
        data = data.filter(i => i.hacienda === config.haciendaId)
      }
      if (config.startDate) {
        data = data.filter(i => new Date(i.fecha) >= config.startDate)
      }
      if (config.endDate) {
        data = data.filter(i => new Date(i.fecha) <= config.endDate)
      }

      return data
    } catch (error) {
      logger.error('[ReportGenerator] Error obteniendo ingresos:', error)
      return []
    }
  }

  async getCostosData(config) {
    try {
      const { useFinanzaStore } = await import('@/stores/finanzaStore')
      const finanzaStore = useFinanzaStore()
      
      if (!finanzaStore.gastos || finanzaStore.gastos.length === 0) {
        await finanzaStore.fetchFinanzas()
      }

      let data = finanzaStore.gastos || []

      if (config.haciendaId) {
        data = data.filter(c => c.hacienda === config.haciendaId)
      }
      if (config.startDate) {
        data = data.filter(c => new Date(c.fecha) >= config.startDate)
      }
      if (config.endDate) {
        data = data.filter(c => new Date(c.fecha) <= config.endDate)
      }

      return data
    } catch (error) {
      logger.error('[ReportGenerator] Error obteniendo costos:', error)
      return []
    }
  }

  async getActividadesData(config) {
    try {
      const { useActividadesStore } = await import('@/stores/actividadesStore')
      const actividadesStore = useActividadesStore()
      
      if (!actividadesStore.actividades || actividadesStore.actividades.length === 0) {
        await actividadesStore.fetchActividades()
      }

      let data = actividadesStore.actividades || []

      if (config.haciendaId) {
        data = data.filter(a => a.hacienda === config.haciendaId)
      }
      if (config.startDate) {
        data = data.filter(a => a.fecha_ejecucion && new Date(a.fecha_ejecucion) >= config.startDate)
      }
      if (config.endDate) {
        data = data.filter(a => a.fecha_ejecucion && new Date(a.fecha_ejecucion) <= config.endDate)
      }

      return data
    } catch (error) {
      logger.error('[ReportGenerator] Error obteniendo actividades:', error)
      return []
    }
  }

  // ============================================================================
  // MÉTODOS DE AGRUPACIÓN Y CÁLCULO
  // ============================================================================

  agruparPorCultivo(data) {
    const agrupado = {}
    data.forEach(d => {
      if (!agrupado[d.cultivo]) {
        agrupado[d.cultivo] = { cultivo: d.cultivo, rendimiento: 0, count: 0 }
      }
      agrupado[d.cultivo].rendimiento += d.rendimiento || 0
      agrupado[d.cultivo].count += 1
    })
    return Object.values(agrupado).map(g => ({
      ...g,
      rendimiento: g.count > 0 ? Math.round(g.rendimiento / g.count) : 0
    }))
  }

  agruparPorFecha(data) {
    const agrupado = {}
    data.forEach(d => {
      const mes = format(parseISO(d.fecha_siembra), 'yyyy-MM')
      if (!agrupado[mes]) {
        agrupado[mes] = { fecha: mes, valor: 0 }
      }
      agrupado[mes].valor += 1
    })
    return Object.values(agrupado).sort((a, b) => a.fecha.localeCompare(b.fecha))
  }

  agruparPorEstado(data) {
    const agrupado = {}
    data.forEach(d => {
      const estado = d.estado || 'sin_estado'
      if (!agrupado[estado]) {
        agrupado[estado] = { estado, cantidad: 0 }
      }
      agrupado[estado].cantidad += 1
    })
    return Object.values(agrupado)
  }

  agruparPorCategoria(ingresos, costos) {
    const categorias = {}
    
    ingresos.forEach(i => {
      if (!categorias[i.categoria]) {
        categorias[i.categoria] = { ingresos: 0, costos: 0 }
      }
      categorias[i.categoria].ingresos += i.monto
    })

    costos.forEach(c => {
      if (!categorias[c.categoria]) {
        categorias[c.categoria] = { ingresos: 0, costos: 0 }
      }
      categorias[c.categoria].costos += c.monto
    })

    return Object.entries(categorias).map(([nombre, datos]) => ({
      nombre,
      ...datos,
      utilidad: datos.ingresos - datos.costos
    }))
  }

  calculateCycleDays(siembra) {
    if (!siembra.fecha_siembra) return 0
    const start = parseISO(siembra.fecha_siembra)
    const end = siembra.fecha_cosecha_estimada ? parseISO(siembra.fecha_cosecha_estimada) : new Date()
    return differenceInDays(end, start)
  }

  getModa(array) {
    if (array.length === 0) return null
    const counts = {}
    array.forEach(item => {
      counts[item] = (counts[item] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  }

  /**
   * Exporta reporte a JSON
   */
  exportToJSON(report) {
    return JSON.stringify(report, null, 2)
  }

  /**
   * Exporta reporte a CSV
   */
  exportToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          return typeof value === 'string' ? `"${value}"` : value
        }).join(',')
      )
    ]

    return csvRows.join('\n')
  }

  /**
   * Exporta reporte a PDF usando jsPDF
   * @param {Object} report - Reporte completo generado
   * @param {string} format - Formato de salida: 'blob', 'dataurl', o 'download'
   * @returns {Promise<Blob|string|null>}
   */
  async exportPDF(report, format = 'download') {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      // Configuración de fuente
      doc.setFont('helvetica')

      // Título
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      const title = report.metadata?.type || 'Reporte'
      doc.text(title.toUpperCase(), 14, 20)

      // Metadatos
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generado: ${new Date(report.metadata?.generatedAt || Date.now()).toLocaleString()}`, 14, 30)

      if (report.metadata?.startDate && report.metadata?.endDate) {
        doc.text(
          `Período: ${report.metadata.startDate.toLocaleDateString()} - ${report.metadata.endDate.toLocaleDateString()}`,
          14,
          36
        )
      }

      // Resumen ejecutivo
      if (report.summary) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Resumen', 14, 50)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        let y = 58
        Object.entries(report.summary).forEach(([key, value]) => {
          const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
          doc.text(`${label}: ${value}`, 14, y)
          y += 6
        })
      }

      // Tabla de datos
      if (report.data && Array.isArray(report.data) && report.data.length > 0) {
        const startY = report.summary ? 90 : 50
        const columns = Object.keys(report.data[0])

        doc.autoTable({
          head: [columns.map(col => col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '))],
          body: report.data.map(row => columns.map(col => row[col] ?? '')),
          startY: startY,
          theme: 'striped',
          headStyles: { fillColor: [76, 175, 80] }, // Verde
          alternateRowStyles: { fillColor: [245, 245, 245] }
        })
      }

      // Finalizar y exportar
      if (format === 'blob') {
        return doc.output('blob')
      } else if (format === 'dataurl') {
        return doc.output('datauristring')
      } else if (format === 'download') {
        const filename = `${report.metadata?.type || 'reporte'}_${Date.now()}.pdf`
        doc.save(filename)
        return null
      }

      return doc.output('blob')
    } catch (error) {
      logger.error('[ReportGenerator] Error exportando PDF:', error)
      throw error
    }
  }
}

// Exportar instancia singleton
export const reportGenerator = new ReportGenerator()

/**
 * Hook conveniente para Vue 3 Composition API
 * 
 * @example
 * // En un componente Vue
 * import { useReportGenerator } from '@/utils/reportGenerator'
 * 
 * setup() {
 *   const { generateReport, isGenerating, error } = useReportGenerator()
 *   
 *   const handleGenerateReport = async (config) => {
 *     const report = await generateReport(config)
 *     console.log('Reporte generado:', report)
 *   }
 *   
 *   return { handleGenerateReport, isGenerating, error }
 * }
 */
export function useReportGenerator() {
  const generator = new ReportGenerator()

  let isGenerating = false
  let error = null

  const generateReport = async (config) => {
    isGenerating = true
    error = null

    try {
      const report = await generator.generate(config)
      return report
    } catch (err) {
      error = err
      throw err
    } finally {
      isGenerating = false
    }
  }

  const exportToCSV = (data) => {
    return generator.exportToCSV(data)
  }

  const exportToJSON = (report) => {
    return generator.exportToJSON(report)
  }

  const exportPDF = async (report, format = 'download') => {
    isGenerating = true
    error = null

    try {
      const result = await generator.exportPDF(report, format)
      return result
    } catch (err) {
      error = err
      throw err
    } finally {
      isGenerating = false
    }
  }

  return {
    generateReport,
    exportToCSV,
    exportToJSON,
    exportPDF,
    isGenerating,
    error
  }
}

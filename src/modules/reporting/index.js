/**
 * reporting/index.js
 * Fachada única del módulo de reportes
 * Arquitectura: dataProvider + reportEngine + exporters
 */

import { reportEngine } from './reportEngine'
import { createDataProvider } from './dataProvider'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'

export const reportingModule = {
  /**
   * Genera un reporte
   * @param {string} type - Tipo de reporte
   * @param {Object} config - Configuración (haciendaId, startDate, endDate, etc.)
   */
  async generate(type, config) {
    const dataProvider = createDataProvider({
      siembrasStore: useSiembrasStore(),
      actividadesStore: useActividadesStore(),
      zonasStore: useZonasStore(),
      bitacoraStore: useBitacoraStore()
    })

    const data = {
      siembras: await dataProvider.getSiembras(config),
      actividades: await dataProvider.getActividades(config),
      zonas: await dataProvider.getZonas(config),
      bitacoras: await dataProvider.getBitacoras(config)
    }

    return reportEngine.generate(type, data, config)
  },

  /**
   * Exporta un reporte
   * @param {Object} report - Reporte generado
   * @param {string} format - Formato (pdf, excel, csv, json, html)
   */
  async export(report, format) {
    switch (format) {
      case 'pdf': {
        const { PdfExporter } = await import('@/utils/exporters/pdfExporter')
        const exporter = new PdfExporter()
        return exporter.export(report)
      }
      case 'excel': {
        const { ExcelExporter } = await import('@/utils/exporters/excelExporter')
        const exporter = new ExcelExporter()
        return exporter.export(report)
      }
      case 'csv': {
        const { csvExporter } = await import('@/utils/exporters/csvExporter')
        return csvExporter.export(report.data)
      }
      case 'json': {
        const { jsonExporter } = await import('@/utils/exporters/jsonExporter')
        return jsonExporter.export(report)
      }
      case 'html': {
        const { htmlExporter } = await import('@/utils/exporters/htmlExporter')
        return htmlExporter.export(report)
      }
      default:
        throw new Error(`Formato no soportado: ${format}`)
    }
  }
}

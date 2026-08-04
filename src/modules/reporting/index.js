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
        const { exportToPDF } = await import('@/utils/exporters/pdfExporter')
        return exportToPDF(report)
      }
      case 'excel': {
        const { excelExporter } = await import('@/utils/exporters/excelExporter')
        return excelExporter.exportBitacoras(report.data)
      }
      case 'csv': {
        const { exportToCSV } = await import('@/utils/exporters/csvExporter')
        return exportToCSV(report.data)
      }
      case 'json': {
        const { downloadFile } = await import('@/utils/fileDownload')
        const json = JSON.stringify(report, null, 2)
        downloadFile(json, 'export.json', 'application/json;charset=utf-8;')
        return true
      }
      case 'html': {
        const { exportToHTML } = await import('@/utils/exporters/htmlExporter')
        return exportToHTML(report)
      }
      case 'md': {
        const { exportToMD } = await import('@/utils/exporters/markdownExporter')
        return exportToMD(report)
      }
      default:
        throw new Error(`Formato no soportado: ${format}`)
    }
  }
}

/**
 * Excel Exporter - Exportación de bitácoras a Excel
 *
 * Funcionalidad:
 * - Exportar bitácoras a Excel (XLSX)
 * - Soporte para filtros y selección múltiple
 * - Formato según tipo_actividad.formato_reporte
 * - Columnas dinámicas según métricas
 */

// Importación dinámica de xlsx para code-splitting
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export class ExcelExporter {
  constructor() {
    this.workbook = null
  }

  /**
   * Exporta bitácoras a Excel
   */
  async exportBitacoras(bitacoras, actividades, tipoActividades, options = {}) {
    try {
      const { fechaInicio, fechaFin, filtros = {} } = options

      const XLSX = await import('xlsx')

      // Preparar datos para exportación
      const data = this.prepareData(bitacoras, actividades, tipoActividades, filtros)

      // Crear hoja de trabajo
      const worksheet = XLSX.utils.json_to_sheet(data)

      // Ajustar ancho de columnas
      this.adjustColumnWidths(worksheet)

      // Crear libro de trabajo
      this.workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Bitácoras')

      // Generar nombre de archivo
      const fileName = this.generateFileName(fechaInicio, fechaFin)

      // Exportar archivo
      XLSX.writeFile(this.workbook, fileName)

      console.log(`[ExcelExporter] Excel exportado: ${fileName}`)
      return fileName

    } catch (error) {
      console.error('[ExcelExporter] Error exportando Excel:', error)
      throw new Error(`Error exportando Excel: ${error.message}`)
    }
  }

  /**
   * Prepara datos para exportación
   */
  prepareData(bitacoras, actividades, tipoActividades, filtros) {
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      try {
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es })
      } catch {
        return 'Fecha inválida'
      }
    }

    const data = []

    for (const bitacora of bitacoras) {
      const actividad = actividades.find(a => a.id === bitacora.actividad_realizada)
      const tipoActividad = tipoActividades.find(ta => ta.id === actividad?.tipo_actividades)

      // Datos base
      const row = {
        'ID': bitacora.id?.slice(-8) || 'N/A',
        'Fecha': formatDate(bitacora.fecha_ejecucion),
        'Actividad': actividad?.nombre || 'N/A',
        'Tipo Actividad': tipoActividad?.nombre || 'N/A',
        'Estado': bitacora.estado_ejecucion || 'N/A',
        'Programación': bitacora.programacion_origen || 'Manual'
      }

      // Agregar métricas según formato_reporte
      if (tipoActividad?.formato_reporte?.columnas && bitacora.metricas) {
        for (const col of tipoActividad.formato_reporte.columnas) {
          if (col.metrica) {
            const valor = bitacora.metricas[col.metrica]
            let valorFormateado = 'No registrado'

            if (valor !== undefined && valor !== null) {
              valorFormateado = String(valor)
              if (col.unidad) {
                valorFormateado += ` ${col.unidad}`
              }
            }

            row[col.nombre] = valorFormateado
          } else if (col.tipo === 'text' && bitacora.metricas[col.nombre]) {
            row[col.nombre] = bitacora.metricas[col.nombre]
          }
        }
      }

      // Agregar notas
      if (bitacora.notas) {
        row['Notas'] = bitacora.notas
      }

      data.push(row)
    }

    return data
  }

  /**
   * Ajusta ancho de columnas
   */
  adjustColumnWidths(worksheet) {
    const cols = Object.keys(worksheet).filter(k => k.startsWith('!') || k.startsWith('A'))

    // Obtener máximo ancho para cada columna
    const colWidths = {}
    for (const cell in worksheet) {
      if (cell[0] === '!') continue

      const col = cell.replace(/[0-9]/g, '')
      const val = worksheet[cell].v

      if (val) {
        const length = String(val).length
        colWidths[col] = Math.max(colWidths[col] || 10, Math.min(50, length + 2))
      }
    }

    // Establecer ancho de columnas
    worksheet['!cols'] = Object.keys(colWidths).map(col => ({
      wch: colWidths[col]
    }))
  }

  /**
   * Genera nombre de archivo
   */
  generateFileName(fechaInicio, fechaFin) {
    const today = format(new Date(), 'yyyy-MM-dd', { locale: es })

    if (fechaInicio && fechaFin) {
      const inicio = format(new Date(fechaInicio), 'yyyy-MM-dd', { locale: es })
      const fin = format(new Date(fechaFin), 'yyyy-MM-dd', { locale: es })
      return `bitacoras_${inicio}_a_${fin}.xlsx`
    }

    return `bitacoras_${today}.xlsx`
  }

  /**
   * Exporta bitácoras con resumen agrupado
   */
  async exportBitacorasWithSummary(bitacoras, actividades, tipoActividades, options = {}) {
    try {
      const XLSX = await import('xlsx')

      // Crear hoja principal de datos
      const data = this.prepareData(bitacoras, actividades, tipoActividades, options.filtros || {})
      const mainSheet = XLSX.utils.json_to_sheet(data)
      this.adjustColumnWidths(mainSheet)

      // Crear hoja de resumen
      const summarySheet = this.createSummarySheet(bitacoras, actividades, XLSX)

      // Crear libro de trabajo
      this.workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(this.workbook, mainSheet, 'Bitácoras Detalle')
      XLSX.utils.book_append_sheet(this.workbook, summarySheet, 'Resumen')

      // Generar nombre de archivo
      const fileName = `bitacoras_resumen_${format(new Date(), 'yyyy-MM-dd_HHmm', { locale: es })}.xlsx`

      // Exportar archivo
      XLSX.writeFile(this.workbook, fileName)

      console.log(`[ExcelExporter] Excel con resumen exportado: ${fileName}`)
      return fileName

    } catch (error) {
      console.error('[ExcelExporter] Error exportando Excel con resumen:', error)
      throw new Error(`Error exportando Excel con resumen: ${error.message}`)
    }
  }

  /**
   * Crea hoja de resumen
   */
  createSummarySheet(bitacoras, actividades, XLSX) {
    const summary = []

    // Agrupar por actividad
    const byActividad = {}
    for (const bitacora of bitacoras) {
      const actividadId = bitacora.actividad_realizada
      if (!byActividad[actividadId]) {
        byActividad[actividadId] = []
      }
      byActividad[actividadId].push(bitacora)
    }

    // Generar filas de resumen
    for (const [actividadId, bitacorasList] of Object.entries(byActividad)) {
      const actividad = actividades.find(a => a.id === actividadId)

      summary.push({
        'Actividad': actividad?.nombre || 'N/A',
        'Total Registros': bitacorasList.length,
        'Completadas': bitacorasList.filter(b => b.estado_ejecucion === 'completado').length,
        'En Progreso': bitacorasList.filter(b => b.estado_ejecucion === 'en_progreso').length,
        'Planificadas': bitacorasList.filter(b => b.estado_ejecucion === 'planificada').length
      })
    }

    const worksheet = XLSX.utils.json_to_sheet(summary)
    this.adjustColumnWidths(worksheet)
    return worksheet
  }
}

// Singleton instance
export const excelExporter = new ExcelExporter()
export default excelExporter

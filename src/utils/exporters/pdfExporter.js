/**
 * PDF Exporter - Exportación de bitácoras a PDF
 *
 * Funcionalidad:
 * - Exportar bitácora individual a PDF
 * - Formato según tipo_actividad.formato_reporte
 * - Header con información de hacienda/actividad
 * - Tabla de métricas dinámicas
 * - Notas y observaciones
 */

// Importación dinámica de jspdf y jspdf-autotable para code-splitting
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export class PdfExporter {
  constructor() {
    this.doc = null
    this.pageWidth = 210 // A4 width in mm
    this.pageHeight = 297 // A4 height in mm
    this.margin = 15
    this.maxWidth = this.pageWidth - (this.margin * 2)
  }

  /**
   * Exporta una bitácora a PDF
   */
  async exportBitacora(entry, actividad, tipoActividad, hacienda) {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default || autoTableModule

      // Inicializar documento PDF (landscape orientation)
      this.doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      let yPosition = this.margin

      // 1. Header
      yPosition = this.addHeader(hacienda, yPosition)

      // 2. Información General
      yPosition = this.addGeneralInfo(entry, actividad, tipoActividad, yPosition)

      // 3. Tabla de Métricas
      if (tipoActividad?.formato_reporte?.columnas && entry.metricas) {
        yPosition = this.addMetricsTable(entry, tipoActividad.formato_reporte.columnas, yPosition)
      }

      // 4. Notas
      if (entry.notas) {
        yPosition = this.addNotes(entry.notas, yPosition)
      }

      // 5. Footer
      this.addFooter()

      // Generar nombre de archivo
      const fileName = this.generateFileName(entry, actividad)

      // GUARDAR PDF
      this.doc.save(fileName)

      console.log(`[PdfExporter] PDF exportado: ${fileName}`)
      return fileName

    } catch (error) {
      console.error('[PdfExporter] Error exportando PDF:', error)
      throw new Error(`Error exportando PDF: ${error.message}`)
    }
  }

  /**
   * Agrega header al PDF
   */
  addHeader(hacienda, yPosition) {
    if (!hacienda) return yPosition

    try {
      // Título principal
      this.doc.setFontSize(18)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(hacienda.nombre || 'Hacienda', this.margin, yPosition)
      yPosition += 8

      // Subtítulo
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text('Reporte de Bitácora', this.margin, yPosition)
      yPosition += 5

      // Línea separadora
      this.doc.setDrawColor(100, 100, 100)
      this.doc.setLineWidth(0.5)
      this.doc.line(this.margin, yPosition, this.pageWidth - this.margin, yPosition)
      yPosition += 8

      return yPosition
    } catch (error) {
      console.error('[PdfExporter] Error en addHeader:', error)
      return yPosition
    }
  }

  /**
   * Agrega información general
   */
  addGeneralInfo(entry, actividad, tipoActividad, yPosition) {
    try {
      const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        try {
          return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: es })
        } catch {
          return 'Fecha inválida'
        }
      }

      // Configurar fuente para info general
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')

      // Datos en dos columnas
      const leftColumn = this.margin
      const rightColumn = this.pageWidth / 2 + 10

      // Columna izquierda
      this.doc.text('Actividad:', leftColumn, yPosition)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(actividad?.nombre || 'N/A', leftColumn + 25, yPosition)
      yPosition += 6

      this.doc.setFont('helvetica', 'normal')
      this.doc.text('Tipo Actividad:', leftColumn, yPosition)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(tipoActividad?.nombre || 'N/A', leftColumn + 25, yPosition)
      yPosition += 6

      this.doc.setFont('helvetica', 'normal')
      this.doc.text('Fecha Ejecución:', leftColumn, yPosition)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(formatDate(entry.fecha_ejecucion), leftColumn + 30, yPosition)
      yPosition += 6

      // Columna derecha
      const rightYStart = yPosition - 12 // Alinear con primera fila

      this.doc.setFont('helvetica', 'normal')
      this.doc.text('Estado:', rightColumn, rightYStart)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(entry.estado_ejecucion || 'N/A', rightColumn + 15, rightYStart)

      this.doc.setFont('helvetica', 'normal')
      this.doc.text('Programación:', rightColumn, rightYStart + 6)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(entry.programacion_origen || 'Manual', rightColumn + 25, rightYStart + 6)

      yPosition += 8

      return yPosition
    } catch (error) {
      console.error('[PdfExporter] Error en addGeneralInfo:', error)
      return yPosition
    }
  }

  /**
   * Agrega tabla de métricas
   */
  addMetricsTable(entry, columnas, yPosition) {
    try {
      // Preparar datos para la tabla
      const tableData = columnas
        .filter(col => col.metrica) // Solo columnas con métrica
        .map(col => {
          const valor = entry.metricas?.[col.metrica]
          let valorFormateado = 'No registrado'

          if (valor !== undefined && valor !== null) {
            valorFormateado = String(valor)

            // Agregar unidad si existe
            if (col.unidad) {
              valorFormateado += ` ${col.unidad}`
            }
          }

          return [col.nombre, valorFormateado]
        })

      if (tableData.length === 0) {
        return yPosition
      }

      // Agregar título de sección
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('Métricas Registradas', this.margin, yPosition)
      yPosition += 5

      // Generar tabla con autoTable
      autoTable(this.doc, {
        startY: yPosition,
        head: [['Métrica', 'Valor']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [76, 175, 80], // Green color
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 'auto' }
        },
        margin: { top: 0, left: this.margin, right: this.margin }
      })

      // Obtener nueva posición Y después de la tabla
      yPosition = this.doc.lastAutoTable.finalY + 8

      return yPosition
    } catch (error) {
      console.error('[PdfExporter] Error en addMetricsTable:', error)
      return yPosition
    }
  }

  /**
   * Agrega notas/observaciones
   */
  addNotes(notas, yPosition) {
    try {
      // Verificar si necesitamos nueva página
      if (yPosition > this.pageHeight - 40) {
        this.doc.addPage()
        yPosition = this.margin
      }

      // Título
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('Notas / Observaciones', this.margin, yPosition)
      yPosition += 5

      // Contenido de notas (con word wrap)
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')

      const splitNotes = this.doc.splitTextToSize(notas, this.maxWidth)
      this.doc.text(splitNotes, this.margin, yPosition)

      yPosition += (splitNotes.length * 4) + 5

      return yPosition
    } catch (error) {
      console.error('[PdfExporter] Error en addNotes:', error)
      return yPosition
    }
  }

  /**
   * Agrega footer al PDF
   */
  addFooter() {
    const pageCount = this.doc.internal.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      const yPos = this.pageHeight - 10

      // Línea separadora
      this.doc.setDrawColor(200, 200, 200)
      this.doc.setLineWidth(0.3)
      this.doc.line(this.margin, yPos - 3, this.pageWidth - this.margin, yPos - 3)

      // Texto de footer
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(100, 100, 100)

      const footerText = `Generado por ConAgri - ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`
      const pageNumText = `Página ${i} de ${pageCount}`

      this.doc.text(footerText, this.margin, yPos)
      this.doc.text(pageNumText, this.pageWidth - this.margin - 20, yPos, { align: 'right' })
    }
  }

  /**
   * Genera nombre de archivo
   */
  generateFileName(entry, actividad) {
    const fecha = format(new Date(entry.fecha_ejecucion), 'yyyy-MM-dd', { locale: es })
    const actividadNombre = actividad?.nombre?.replace(/[^a-zA-Z0-9]/g, '_') || 'bitacora'
    const id = entry.id?.slice(-6) || '000000'

    return `bitacora_${actividadNombre}_${fecha}_${id}.pdf`
  }

  /**
   * Exporta múltiples bitácoras en un solo PDF
   */
  async exportBitacorasMultiple(bitacoras, actividades, tipoActividades, hacienda) {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default || autoTableModule

      this.doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      let firstEntry = true

      for (let i = 0; i < bitacoras.length; i++) {
        const bitacora = bitacoras[i]
        const actividad = actividades.find(a => a.id === bitacora.actividad_realizada)
        const tipoActividad = tipoActividades.find(ta => ta.id === actividad?.tipo_actividades)

        // Agregar nueva página para cada bitácora (excepto la primera)
        if (!firstEntry) {
          this.doc.addPage()
        }

        let yPosition = this.margin
        yPosition = this.addHeader(hacienda, yPosition)
        yPosition = this.addGeneralInfo(bitacora, actividad, tipoActividad, yPosition)

        if (tipoActividad?.formato_reporte?.columnas && bitacora.metricas) {
          yPosition = this.addMetricsTable(bitacora, tipoActividad.formato_reporte.columnas, yPosition)
        }

        if (bitacora.notas) {
          yPosition = this.addNotes(bitacora.notas, yPosition)
        }

        this.addFooter()
        firstEntry = false
      }

      const fileName = `bitacoras_multiple_${format(new Date(), 'yyyy-MM-dd_HHmm', { locale: es })}.pdf`
      this.doc.save(fileName)

      console.log(`[PdfExporter] PDF múltiple exportado: ${fileName}`)
      return fileName

    } catch (error) {
      console.error('[PdfExporter] Error exportando PDF múltiple:', error)
      throw new Error(`Error exportando PDF múltiple: ${error.message}`)
    }
  }
}

// Singleton instance
export const pdfExporter = new PdfExporter()

export const exportToPDF = async (entry, actividad, tipoActividad, hacienda) => {
  return await pdfExporter.exportBitacora(entry, actividad, tipoActividad, hacienda)
}

export default pdfExporter

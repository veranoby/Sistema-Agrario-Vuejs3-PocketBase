/**
 * src/services/lightweightBpaPdfExporter.js
 * 
 * Servicio para generar el PDF de Bitácora BPA (Versión Gratuita / Freemium)
 * 100% en el cliente con jsPDF + jspdf-autotable.
 * No requiere el módulo de pago `pdf_bpa` ni backend extra.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Genera y descarga un PDF de Bitácora BPA en el navegador
 * @param {Object} options
 * @param {Array} options.entries - Entradas de bitácora seleccionadas
 * @param {Object} options.hacienda - Datos de la hacienda (nombre, ruc, ubicacion)
 * @param {string} options.titulo - Título del reporte (ej: "Reporte de Bitácora BPA - Control de Plagas")
 * @returns {Promise<boolean>} true si se generó con éxito
 */
export async function exportLightweightBpaPdf({ entries = [], hacienda = {}, titulo = 'Reporte de Bitácora BPA' }) {
  if (!entries || !entries.length) {
    throw new Error('No hay entradas de bitácora para exportar')
  }

  // Configurar documento jsPDF (A4 Horizontal para tablas de bitácora)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const haciendaNombre = hacienda.nombre || 'Hacienda Agrícola'
  const haciendaRuc = hacienda.ruc || hacienda.identificacion || 'N/A'
  const fechaGeneracion = new Date().toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Header / Membrete
  doc.setFillColor(27, 94, 32) // Verde BPA (#1b5e20)
  doc.rect(0, 0, 297, 18, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('REGISTRO OFICIAL BPA — AGROASSIST FREEMIUM', 14, 12)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado: ${fechaGeneracion}`, 220, 12)

  // Información de la Hacienda
  doc.setTextColor(40, 40, 40)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo.toUpperCase(), 14, 28)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Hacienda: ${haciendaNombre}`, 14, 35)
  doc.setFont('helvetica', 'normal')
  doc.text(`RUC / ID: ${haciendaRuc} | Total Registros: ${entries.length}`, 14, 41)

  // Watermark / Sello Versión Gratuita
  doc.setTextColor(180, 180, 180)
  doc.setFontSize(8)
  doc.text('Formato Básico BPA (Versión Gratuita) — Cumplimiento Normativo Agrocalidad Art. 12-21', 14, 47)

  // Preparar Filas de la Tabla
  const tableHead = [['Fecha', 'Actividad', 'Zonas / Lotes', 'Métricas Clave (BPA)', 'Estado', 'Firma']]
  const tableRows = entries.map(entry => {
    const fecha = entry.fecha_ejecucion
      ? new Date(entry.fecha_ejecucion).toLocaleDateString('es-EC')
      : new Date(entry.created).toLocaleDateString('es-EC')

    const actividad = entry.expand?.actividad_realizada?.nombre || entry.actividad_realizada || 'Actividad'

    let zonas = 'General'
    if (Array.isArray(entry.expand?.zonas)) {
      zonas = entry.expand.zonas.map(z => z.nombre).join(', ')
    } else if (Array.isArray(entry.zonas) && entry.zonas.length > 0) {
      zonas = entry.zonas.join(', ')
    }

    // Formatear métricas relevantes para BPA
    const metricasObj = entry.metricas || {}
    const metricasTextos = []
    if (metricasObj.periodo_carencia_dias) metricasTextos.push(`Carencia: ${metricasObj.periodo_carencia_dias} días`)
    if (metricasObj.ingrediente_activo) metricasTextos.push(`Ing. Activo: ${metricasObj.ingrediente_activo}`)
    if (metricasObj.dosis_aplicada) metricasTextos.push(`Dosis: ${metricasObj.dosis_aplicada} ${metricasObj.unidad_dosis_aplicada || ''}`)
    if (metricasObj.lote_fabricacion) metricasTextos.push(`Lote Fab: ${metricasObj.lote_fabricacion}`)
    if (metricasObj.codigo_trazabilidad_lote) metricasTextos.push(`Trazabilidad: ${metricasObj.codigo_trazabilidad_lote}`)

    const metricasStr = metricasTextos.length ? metricasTextos.join('\n') : (entry.notas || 'Sin métricas')
    const estado = entry.estado_ejecucion ? entry.estado_ejecucion.toUpperCase() : 'COMPLETADA'
    const tieneFirma = entry.signature ? '✅ Firmado' : '⚠️ Pendiente'

    return [fecha, actividad, zonas, metricasStr, estado, tieneFirma]
  })

  // Generar AutoTable
  autoTable(doc, {
    startY: 52,
    head: tableHead,
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [46, 125, 50],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 45 },
      2: { cellWidth: 45 },
      3: { cellWidth: 105 },
      4: { cellWidth: 25 },
      5: { cellWidth: 24 }
    },
    didDrawPage: (data) => {
      // Pie de página en cada hoja
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(
        `Página ${data.pageNumber} de ${pageCount} — Exportado por AgroAssist (Plan Gratuito BPA)`,
        14,
        200
      )
    }
  })

  // Guardar/Descargar el archivo
  const fileName = `Bitacora_BPA_${haciendaNombre.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.pdf`
  doc.save(fileName)
  return true
}

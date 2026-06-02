/**
 * Servicio para la generación dinámica offline-first de certificados BPA
 * Ruta: src/services/pdfGenerator.js
 */

import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Genera y descarga un reporte PDF de BPA con firma y QR
 * @param {Object} entry Registro de bitácora
 * @param {Object} hacienda Hacienda asociada
 */
export async function generateBpaReport(entry, hacienda) {
  try {
    // 1. Carga dinámica de dependencias (Lazy Loading)
    const { jsPDF } = await import('jspdf')
    const autoTableModule = await import('jspdf-autotable')
    const autoTable = autoTableModule.default || autoTableModule
    const QRCode = await import('qrcode')

    // 2. Inicializar documento PDF (A4 Portrait)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = 210
    const pageHeight = 297
    const margin = 15
    const maxWidth = pageWidth - (margin * 2)
    let yPosition = margin

    // 3. Cabecera Corporativa ConAgri (Verde Premium)
    doc.setFillColor(27, 94, 32) // #1b5e20 Verde oscuro
    doc.rect(0, 0, pageWidth, 28, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('CERTIFICADO DE CUMPLIMIENTO BPA', margin, 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Sistema de Gestión Agrícola ConAgri - Auditoría de Buenas Prácticas Agrícolas', margin, 18)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(`REGISTRO: ${entry.id || 'N/A'}`, pageWidth - margin, 12, { align: 'right' })
    doc.text(`FECHA EMISIÓN: ${format(new Date(), 'dd/MM/yyyy')}`, pageWidth - margin, 18, { align: 'right' })

    yPosition = 38

    // 4. Datos de la Hacienda y Bitácora (Cuadro de información general)
    doc.setFillColor(245, 245, 245) // Gris muy claro
    doc.rect(margin, yPosition, maxWidth, 30, 'F')
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.rect(margin, yPosition, maxWidth, 30)

    doc.setTextColor(33, 33, 33)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('INFORMACIÓN DE LA HACIENDA', margin + 5, yPosition + 6)
    doc.text('DATOS DEL REGISTRO DE CAMPO', pageWidth / 2 + 10, yPosition + 6)

    doc.setDrawColor(200, 200, 200)
    doc.line(pageWidth / 2, yPosition + 2, pageWidth / 2, yPosition + 28)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`Nombre: ${hacienda?.name || 'N/A'}`, margin + 5, yPosition + 13)
    doc.text(`Código: ${hacienda?.registro_codigo || 'N/A'}`, margin + 5, yPosition + 18)
    doc.text(`Ubicación: ${hacienda?.ubicacion || 'N/A'}`, margin + 5, yPosition + 23)

    const actividadNombre = entry.expand?.actividad_realizada?.nombre || 'Actividad Desconocida'
    const operarioName = entry.expand?.user_responsable 
      ? `${entry.expand.user_responsable.name || ''} ${entry.expand.user_responsable.lastname || ''}`.trim() || entry.expand.user_responsable.username || 'No asignado'
      : 'No asignado'
    const fechaEjec = entry.fecha_ejecucion 
      ? format(new Date(entry.fecha_ejecucion), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es }) 
      : 'N/A'

    doc.text(`Actividad: ${actividadNombre}`, pageWidth / 2 + 10, yPosition + 13)
    doc.text(`Operador: ${operarioName}`, pageWidth / 2 + 10, yPosition + 18)
    doc.text(`Ejecución: ${fechaEjec}`, pageWidth / 2 + 10, yPosition + 23)

    yPosition += 38

    // 5. Tabla Checklist BPA o Métricas
    const preguntasBpa = entry.expand?.actividad_realizada?.expand?.tipo_actividades?.preguntas_bpa || []
    const respuestas = entry.bpa_respuestas || {}

    doc.setTextColor(27, 94, 32)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('CHECKLIST DE CONTROL DE CALIDAD BPA', margin, yPosition)
    yPosition += 4

    if (preguntasBpa.length > 0) {
      const tableBody = preguntasBpa.map((pregunta, index) => {
        const ans = respuestas[pregunta.id]
        let evalText = 'N/A'
        if (ans === true) evalText = 'CUMPLE'
        if (ans === false) evalText = 'NO CUMPLE'
        return [
          String(index + 1),
          pregunta.pregunta || 'Criterio sin nombre',
          evalText
        ]
      })

      autoTable(doc, {
        startY: yPosition,
        head: [['Nº', 'Criterio de Evaluación / Control de Calidad', 'Evaluación']],
        body: tableBody,
        theme: 'grid',
        styles: {
          fontSize: 8.5,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [27, 94, 32],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 35, halign: 'center' }
        },
        margin: { left: margin, right: margin },
        willDrawCell: (data) => {
          if (data.column.index === 2 && data.cell.section === 'body') {
            const val = data.cell.raw
            if (val === 'CUMPLE') {
              data.cell.styles.fillColor = [200, 230, 201] // Verde suave
              data.cell.styles.textColor = [27, 94, 32] // Verde oscuro
              data.cell.styles.fontStyle = 'bold'
            } else if (val === 'NO CUMPLE') {
              data.cell.styles.fillColor = [255, 205, 210] // Rojo suave
              data.cell.styles.textColor = [198, 40, 40] // Rojo oscuro
              data.cell.styles.fontStyle = 'bold'
            } else if (val === 'N/A') {
              data.cell.styles.fillColor = [238, 238, 238] // Gris suave
              data.cell.styles.textColor = [97, 97, 97] // Gris oscuro
            }
          }
        }
      })

      yPosition = doc.lastAutoTable.finalY + 12
    } else {
      // Si no hay preguntas BPA, renderizar tabla de métricas genéricas de la actividad
      const metricasKeys = Object.keys(entry.metricas || {})
      if (metricasKeys.length > 0) {
        const tableBody = metricasKeys.map((key, index) => [
          String(index + 1),
          key,
          String(entry.metricas[key])
        ])

        autoTable(doc, {
          startY: yPosition,
          head: [['Nº', 'Métrica Registrada', 'Valor']],
          body: tableBody,
          theme: 'grid',
          styles: {
            fontSize: 8.5,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [27, 94, 32],
            textColor: 255,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 45, halign: 'left' }
          },
          margin: { left: margin, right: margin }
        })
        yPosition = doc.lastAutoTable.finalY + 12
      } else {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(9)
        doc.setTextColor(120, 120, 120)
        doc.text('No se encontraron respuestas de checklist BPA ni métricas registradas.', margin, yPosition + 5)
        yPosition += 15
      }
    }

    // 6. Bloque de Notas y Observaciones
    if (entry.notes || entry.notas) {
      const notas = entry.notes || entry.notas
      // Verificar espacio en página
      if (yPosition > pageHeight - 65) {
        doc.addPage()
        yPosition = margin + 15
      }

      doc.setTextColor(27, 94, 32)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Notas / Observaciones de Campo:', margin, yPosition)
      yPosition += 4

      doc.setTextColor(66, 66, 66)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      const splitNotas = doc.splitTextToSize(notas, maxWidth)
      doc.text(splitNotas, margin, yPosition)
      yPosition += (splitNotas.length * 4) + 10
    }

    // 7. Bloque de Firma Digital & QR de Auditoría
    // Garantizar que quepa el bloque de firma (ocupa unos 45mm de alto)
    if (yPosition > pageHeight - 55) {
      doc.addPage()
      yPosition = margin + 15
    }

    // Caja contenedora de firma y QR
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(250, 250, 250)
    doc.rect(margin, yPosition, maxWidth, 35, 'F')
    doc.rect(margin, yPosition, maxWidth, 35)

    // Sección Firma izquierda
    doc.setTextColor(33, 33, 33)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('FIRMA RESPONSABLE', margin + 5, yPosition + 5)

    if (entry.signature?.trazo) {
      try {
        doc.addImage(entry.signature.trazo, 'PNG', margin + 5, yPosition + 6, 60, 22)
      } catch (errImg) {
        console.error('[pdfGenerator] Error renderizando trazo de firma:', errImg)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.text('[Trazo de firma registrado]', margin + 5, yPosition + 15)
      }
    } else {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.text('Documento no firmado físicamente.', margin + 5, yPosition + 15)
    }

    // Línea divisoria en firma
    doc.line(margin + 5, yPosition + 28, margin + 65, yPosition + 28)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(`Responsable: ${operarioName}`, margin + 5, yPosition + 32)

    // Sección QR derecha
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('AUDITORÍA EXTERNA (AGROCALIDAD)', pageWidth - margin - 80, yPosition + 5)

    const qrUrl = `https://conagri.conespacio.org/validar-firma?hash=${entry.signature?.hash || 'N/A'}`
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 120 })

    try {
      doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - margin - 30, yPosition + 2, 26, 26)
    } catch (errQr) {
      console.error('[pdfGenerator] Error renderizando QR:', errQr)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text('Escanee el QR para validar la integridad', pageWidth - margin - 80, yPosition + 12)
    doc.text('criptográfica de esta bitácora directamente', pageWidth - margin - 80, yPosition + 16)
    doc.text('en el oráculo de verificación de ConAgri.', pageWidth - margin - 80, yPosition + 20)

    // Hash SHA-256 en la base
    const hashTxt = `Hash SHA-256: ${entry.signature?.hash || 'N/A'}`
    doc.setFont('courier', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(117, 117, 117)
    doc.text(hashTxt, pageWidth - margin - 80, yPosition + 32)

    // 8. Numeración y pie de página en todas las páginas
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(120, 120, 120)
      doc.text(`Certificado BPA Oficial ConAgri • Generado offline el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, margin, pageHeight - 8)
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
    }

    // 9. Guardar PDF directamente (On-the-fly)
    const sanitizedHacienda = (hacienda?.name || 'Hacienda').replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `Certificado_BPA_${sanitizedHacienda}_Bitacora_${entry.id}.pdf`
    doc.save(fileName)

    console.log(`[pdfGenerator] Reporte descargado localmente: ${fileName}`)
  } catch (error) {
    console.error('[pdfGenerator] Error general generando reporte BPA:', error)
    throw error
  }
}

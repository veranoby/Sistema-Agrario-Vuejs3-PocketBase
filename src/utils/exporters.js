/**
 * Exportadores de datos a diferentes formatos
 * @module utils/exporters
 */

import { logger } from '@/utils/logger'
import { formatDate } from './formatters'

/**
 * Exporta datos a formato CSV
 * @param {Array} data - Array de objetos a exportar
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones de exportación
 * @returns {boolean} True si se exportó correctamente
 */
export function exportToCSV(data, filename = 'export.csv', options = {}) {
  try {
    const {
      headers = null, // Array de strings o null para usar keys del primer objeto
      separator = ',',
      includeHeader = true
    } = options

    if (!data || data.length === 0) {
      logger.warn('[exporters] No hay datos para exportar a CSV')
      return false
    }

    // Obtener headers
    const csvHeaders = headers || Object.keys(data[0])

    // Construir filas
    const rows = data.map(item =>
      csvHeaders.map(header => {
        const value = item[header]
        // Escapar valores con comillas y reemplazar comillas dobles
        const stringValue = value == null ? '' : String(value)
        return `"${stringValue.replace(/"/g, '""')}"`
      }).join(separator)
    )

    // Agregar header si se solicita
    const headerRow = includeHeader
      ? [csvHeaders.map(h => `"${h}"`).join(separator)]
      : []

    const csv = [...headerRow, ...rows].join('\n')

    // Crear blob y descargar
    downloadFile(csv, filename, 'text/csv;charset=utf-8;')

    logger.info(`[exporters] CSV exportado: ${filename}`)
    return true
  } catch (error) {
    logger.error('[exporters] Error exportando a CSV:', error)
    return false
  }
}

/**
 * Exporta datos a formato JSON
 * @param {Array|Object} data - Datos a exportar
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones de exportación
 * @returns {boolean} True si se exportó correctamente
 */
export function exportToJSON(data, filename = 'export.json', options = {}) {
  try {
    const {
      pretty = true,
      replacer = null
    } = options

    const json = JSON.stringify(data, replacer, pretty ? 2 : 0)

    downloadFile(json, filename, 'application/json;charset=utf-8;')

    logger.info(`[exporters] JSON exportado: ${filename}`)
    return true
  } catch (error) {
    logger.error('[exporters] Error exportando a JSON:', error)
    return false
  }
}

/**
 * Exporta datos a formato HTML (tabla)
 * @param {Array} data - Array de objetos a exportar
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones de exportación
 * @returns {boolean} True si se exportó correctamente
 */
export function exportToHTML(data, filename = 'export.html', options = {}) {
  try {
    const {
      title = 'Exportación de Datos',
      headers = null
    } = options

    if (!data || data.length === 0) {
      logger.warn('[exporters] No hay datos para exportar a HTML')
      return false
    }

    const htmlHeaders = headers || Object.keys(data[0])

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generado: ${formatDate(new Date(), 'dd/MM/yyyy HH:mm')}</p>
  <table>
    <thead>
      <tr>${htmlHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>${htmlHeaders.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`

    downloadFile(html, filename, 'text/html;charset=utf-8;')

    logger.info(`[exporters] HTML exportado: ${filename}`)
    return true
  } catch (error) {
    logger.error('[exporters] Error exportando a HTML:', error)
    return false
  }
}

/**
 * Exporta datos a formato Excel (XLSX real)
 * @param {Array} data - Array de objetos a exportar
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones de exportación
 * @returns {boolean} True si se exportó correctamente
 */
export async function exportToExcel(data, filename = 'export.xlsx', options = {}) {
  try {
    const {
      sheetName = 'Datos',
      multiSheet = false,
      summary = null
    } = options

    if (!data || data.length === 0) {
      logger.warn('[exporters] No hay datos para exportar a Excel')
      return false
    }

    // Importación dinámica ES module
    const XLSX = await import('xlsx')

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new()

    // Hoja principal de datos
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Hoja de resumen opcional
    if (summary && multiSheet) {
      const summaryWs = XLSX.utils.json_to_sheet(summary)
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen')
    }

    // Descargar archivo Excel real
    XLSX.writeFile(wb, filename)

    logger.info(`[exporters] Excel XLSX exportado: ${filename}`)
    return true
  } catch (error) {
    logger.error('[exporters] Error exportando a Excel XLSX:', error)
    return false
  }
}

/**
 * Exporta múltiples hojas a archivo Excel
 * @param {Object} sheets - Objeto con nombre de hoja como key y datos como value
 * @param {string} filename - Nombre del archivo
 * @returns {boolean} True si se exportó correctamente
 */
export async function exportMultipleSheets(sheets, filename = 'export.xlsx') {
  try {
    if (!sheets || Object.keys(sheets).length === 0) {
      logger.warn('[exporters] No hay datos para exportar a Excel')
      return false
    }

    // Importación dinámica ES module
    const XLSX = await import('xlsx')

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new()

    // Agregar cada hoja
    for (const [sheetName, data] of Object.entries(sheets)) {
      if (data && Array.isArray(data) && data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      }
    }

    // Descargar archivo
    XLSX.writeFile(wb, filename)

    logger.info(`[exporters] Excel con múltiples hojas exportado: ${filename}`)
    return true
  } catch (error) {
    logger.error('[exporters] Error exportando múltiples hojas:', error)
    return false
  }
}

/**
 * Genera un archivo PDF simple
 * Nota: Para generación de PDF real, se requiere una librería como jsPDF
 * @param {Array} data - Array de objetos a exportar
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones de exportación
 * @returns {boolean} True si se exportó correctamente
 */
export function exportToPDF(data, filename = 'export.pdf', options = {}) {
  try {
    const { title = 'Reporte' } = options

    // Por ahora, exportar como HTML que se puede imprimir a PDF
    logger.warn('[exporters] Generando HTML para imprimir como PDF. Para PDF real, usar librería jsPDF')

    exportToHTML(data, filename.replace('.pdf', '.html'), { title })

    return true
  } catch (error) {
    logger.error('[exporters] Error exportando a PDF:', error)
    return false
  }
}

/**
 * Descarga un archivo en el navegador
 * @param {string} content - Contenido del archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} mimeType - Tipo MIME
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Clona un objeto深度, útil para exportaciones
 * @param {*} obj - Objeto a clonar
 * @returns {*} Objeto clonado
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Agrupa datos por una clave
 * @param {Array} data - Array de objetos
 * @param {string} key - Clave para agrupar
 * @returns {Object} Objeto agrupado
 */
export function groupBy(data, key) {
  return data.reduce((acc, item) => {
    const groupKey = item[key]
    if (!acc[groupKey]) {
      acc[groupKey] = []
    }
    acc[groupKey].push(item)
    return acc
  }, {})
}

/**
 * Transforma datos planos en estructura jerárquica
 * @param {Array} data - Array de objetos planos
 * @param {string} groupByKey - Clave para agrupar
 * @param {string} childKey - Clave para los hijos
 * @returns {Array} Array jerárquico
 */
export function nestBy(data, groupByKey, childKey = 'items') {
  const grouped = groupBy(data, groupByKey)

  return Object.entries(grouped).map(([key, items]) => ({
    [groupByKey]: key,
    [childKey]: items
  }))
}

/**
 * Exporta datos con formato automático según extensión
 * @param {Array} data - Datos a exportar
 * @param {string} filename - Nombre del archivo (con extensión)
 * @param {Object} options - Opciones adicionales
 * @returns {boolean} True si se exportó correctamente
 */
export function exportAuto(data, filename, options = {}) {
  const ext = filename.split('.').pop().toLowerCase()

  const exporters = {
    csv: exportToCSV,
    json: exportToJSON,
    html: exportToHTML,
    xlsx: exportToExcel,
    xls: exportToExcel,
    pdf: exportToPDF
  }

  const exporter = exporters[ext]

  if (!exporter) {
    logger.error(`[exporters] Formato no soportado: ${ext}`)
    return false
  }

  return exporter(data, filename, options)
}


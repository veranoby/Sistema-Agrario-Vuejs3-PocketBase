/**
 * Utilidad centralizada para descarga de archivos
 * Reemplaza funciones duplicadas en formatters.js, csvExporter.js, htmlExporter.js, jsonExporter.js
 */

/**
 * Descarga contenido como un archivo
 * @param {string|Blob} content - Contenido a descargar
 * @param {string} filename - Nombre del archivo
 * @param {string} [mimeType='application/octet-stream'] - Tipo MIME
 */
export function downloadFile(content, filename, mimeType = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
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
 * Descarga contenido Markdown como archivo .md
 * @param {string} markdown - Contenido Markdown
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
export function downloadMarkdown(markdown, filename) {
  const finalFilename = filename.endsWith('.md') ? filename : `${filename}.md`
  downloadFile(markdown, finalFilename, 'text/markdown;charset=utf-8')
}

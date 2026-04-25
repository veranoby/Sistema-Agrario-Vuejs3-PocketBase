import { formatDate } from '@/utils/formatters'

export function exportToHTML(data, filename = 'export.html', options = {}) {
  const { title = 'Exportación de Datos', headers = null } = options

  if (!data || data.length === 0) return false

  const htmlHeaders = headers || Object.keys(data[0])

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
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
  return true
}

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

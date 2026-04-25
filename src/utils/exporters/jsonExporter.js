export function exportToJSON(data, filename = 'export.json', options = {}) {
  const { pretty = true, replacer = null } = options
  const json = JSON.stringify(data, replacer, pretty ? 2 : 0)
  downloadFile(json, filename, 'application/json;charset=utf-8;')
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

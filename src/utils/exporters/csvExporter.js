import { formatDate } from '@/utils/formatters'
import { downloadFile } from '@/utils/fileDownload'

export function exportToCSV(data, filename = 'export.csv', options = {}) {
  const { headers = null, separator = ',', includeHeader = true } = options

  if (!data || data.length === 0) return false

  const csvHeaders = headers || Object.keys(data[0])

  const rows = data.map(item =>
    csvHeaders.map(header => {
      const value = item[header]
      const stringValue = value == null ? '' : String(value)
      return `"${stringValue.replace(/"/g, '""')}"`
    }).join(separator)
  )

  const headerRow = includeHeader
    ? [csvHeaders.map(h => `"${h}"`).join(separator)]
    : []

  const csv = [...headerRow, ...rows].join('\n')
  downloadFile(csv, filename, 'text/csv;charset=utf-8;')
  return true
}

import { downloadFile } from '@/utils/fileDownload'

export function exportToJSON(data, filename = 'export.json', options = {}) {
  const { pretty = true, replacer = null } = options
  const json = JSON.stringify(data, replacer, pretty ? 2 : 0)
  downloadFile(json, filename, 'application/json;charset=utf-8;')
  return true
}

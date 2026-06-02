/**
 * Tests para exporters
 * @file tests/unit/utils/exporters.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportMultipleSheets
} from '@/utils/exporters'

// --- Mocks Centralizados ---
const mockBook = {}
const mockSheet = {}
const mockXLSX = {
  utils: {
    book_new: vi.fn().mockReturnValue(mockBook),
    json_to_sheet: vi.fn().mockReturnValue(mockSheet),
    book_append_sheet: vi.fn()
  },
  writeFile: vi.fn()
}

vi.mock('xlsx', () => ({
  default: mockXLSX,
  utils: {
    book_new: (...args) => mockXLSX.utils.book_new(...args),
    json_to_sheet: (...args) => mockXLSX.utils.json_to_sheet(...args),
    book_append_sheet: (...args) => mockXLSX.utils.book_append_sheet(...args)
  },
  writeFile: (...args) => mockXLSX.writeFile(...args)
}))

beforeEach(() => {
  // Clear mock history before each test
  vi.clearAllMocks()

  // Mock para la creación de elementos 'a' y la simulación de clicks para descarga
  vi.spyOn(document, 'createElement').mockReturnValue({
    href: '',
    download: '',
    click: vi.fn(),
    dispatchEvent: vi.fn()
  })

  // Mock body.appendChild y removeChild para aceptar objetos mock
  vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el)
  vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el)

  // Mock para APIs de navegador que no existen en el entorno de prueba JSDOM
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:http://localhost/uuid-fake'),
    revokeObjectURL: vi.fn()
  })

  vi.stubGlobal('Blob', function (content, options) {
    return { content, options }
  })
})

// Se ejecuta después de cada test para limpiar los mocks y evitar conflictos
afterEach(() => {
  vi.restoreAllMocks()
})
// --- Fin Mocks Centralizados ---

describe('exportToCSV', () => {
  describe('exportación básica', () => {
    it('debe exportar array de objetos a CSV', () => {
      const data = [
        { id: 1, name: 'Test 1', value: 100 },
        { id: 2, name: 'Test 2', value: 200 }
      ]
      const result = exportToCSV(data, 'test.csv')
      expect(result).toBe(true)
    })

    it('debe usar headers personalizados', () => {
      const data = [{ id: 1, name: 'Test 1', value: 100 }]
      const result = exportToCSV(data, 'test.csv', { headers: ['id', 'name'] })
      expect(result).toBe(true)
    })

    it('debe usar separador personalizado', () => {
      const data = [{ id: 1, name: 'Test 1' }]
      const result = exportToCSV(data, 'test.csv', { separator: ';' })
      expect(result).toBe(true)
    })

    it('debe excluir headers si includeHeader es false', () => {
      const data = [{ id: 1, name: 'Test 1' }]
      const result = exportToCSV(data, 'test.csv', { includeHeader: false })
      expect(result).toBe(true)
    })
  })

  describe('manejo de datos vacíos', () => {
    it('debe retornar false para array vacío', () => {
      const result = exportToCSV([], 'test.csv')
      expect(result).toBe(false)
    })

    it('debe retornar false para null', () => {
      const result = exportToCSV(null, 'test.csv')
      expect(result).toBe(false)
    })
  })

  describe('manejo de valores especiales', () => {
    it('debe manejar valores null y undefined', () => {
      const data = [{ id: 1, name: null, value: undefined }]
      const result = exportToCSV(data, 'test.csv')
      expect(result).toBe(true)
    })

    it('debe escapar comillas dobles en los datos', () => {
      const data = [{ id: 1, name: 'Test "con" comillas' }]
      const result = exportToCSV(data, 'test.csv')
      expect(result).toBe(true)
    })

    it('debe manejar saltos de línea en los datos', () => {
      const data = [{ id: 1, name: 'Test\ncon\nsaltos' }]
      const result = exportToCSV(data, 'test.csv')
      expect(result).toBe(true)
    })
  })
})

describe('exportToJSON', () => {
  describe('exportación básica', () => {
    it('debe exportar array de objetos a JSON', () => {
      const data = [{ id: 1, name: 'Test 1' }, { id: 2, name: 'Test 2' }]
      const result = exportToJSON(data, 'test.json')
      expect(result).toBe(true)
    })

    it('debe exportar objeto a JSON', () => {
      const data = { id: 1, name: 'Test' }
      const result = exportToJSON(data, 'test.json')
      expect(result).toBe(true)
    })
  })

  describe('opciones de formateo', () => {
    it('debe usar formato pretty por defecto', () => {
      const data = [{ id: 1, name: 'Test' }]
      const result = exportToJSON(data, 'test.json')
      expect(result).toBe(true)
    })

    it('debe usar formato compacto cuando pretty es false', () => {
      const data = [{ id: 1, name: 'Test' }]
      const result = exportToJSON(data, 'test.json', { pretty: false })
      expect(result).toBe(true)
    })
  })
})

describe('exportToExcel', () => {
  it('debe exportar array de objetos a Excel', async () => {
    const data = [{ id: 1, name: 'Test 1' }]
    const result = await exportToExcel(data, 'test.xlsx')
    expect(result).toBe(true)
    expect(mockXLSX.utils.book_new).toHaveBeenCalled()
    expect(mockXLSX.utils.json_to_sheet).toHaveBeenCalledWith(data)
  })

  it('debe retornar false para datos vacíos', async () => {
    const result = await exportToExcel([], 'test.xlsx')
    expect(result).toBe(false)
  })
})

describe('exportMultipleSheets', () => {
  it('debe exportar múltiples hojas', async () => {
    const sheets = {
      'Hoja1': [{ id: 1, name: 'Test 1' }],
      'Hoja2': [{ id: 2, name: 'Test 2' }]
    }
    const result = await exportMultipleSheets(sheets, 'test.xlsx')
    expect(result).toBe(true)
    expect(mockXLSX.utils.book_append_sheet).toHaveBeenCalledTimes(2)
  })

  it('debe retornar false para objeto de hojas vacío', async () => {
    const result = await exportMultipleSheets({}, 'test.xlsx')
    expect(result).toBe(false)
  })
})

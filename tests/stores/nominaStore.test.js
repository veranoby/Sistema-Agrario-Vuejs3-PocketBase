import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNominaStore } from '@/stores/nominaStore'
import { pb } from '@/utils/pocketbase'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useUserStore } from '@/stores/userStore'

// Mock de PocketBase
vi.mock('@/utils/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getFullList: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }))
  }
}))

// Mock de stores dependientes
vi.mock('@/stores/haciendaStore', () => ({
  useHaciendaStore: vi.fn(() => ({
    mi_hacienda: { id: 'hac-123', name: 'Hacienda Test' }
  }))
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: vi.fn(() => ({
    fetchHaciendaUsers: vi.fn().mockResolvedValue([
      { id: 'op-1', name: 'Juan Perez', role: 'operador', valor_jornal: 15.00 },
      { id: 'op-2', name: 'Maria Gomez', role: 'operador', valor_jornal: 20.00 },
      { id: 'op-3', name: 'Pedro Admin', role: 'administrador', valor_jornal: 30.00 }
    ])
  }))
}))

vi.mock('@/stores/uiFeedbackStore', () => ({
  useUiFeedbackStore: vi.fn(() => ({
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    showSnackbar: vi.fn()
  }))
}))

// Mock de xlsx
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(),
    book_append_sheet: vi.fn()
  },
  writeFile: vi.fn()
}))

describe('useNominaStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Acciones CRUD Básicas', () => {
    it('debe cargar historico de nomina para la hacienda actual', async () => {
      const mockRecords = [
        { id: 'nom-1', semana_inicio: '2026-05-01', semana_fin: '2026-05-07', total_pagado: 120 }
      ]
      const getFullListMock = vi.fn().mockResolvedValue(mockRecords)
      pb.collection.mockReturnValue({ getFullList: getFullListMock })

      const store = useNominaStore()
      const result = await store.cargarHistoricoNomina()

      expect(getFullListMock).toHaveBeenCalledWith({
        filter: 'hacienda="hac-123"',
        sort: '-semana_fin'
      })
      expect(result).toEqual(mockRecords)
      expect(store.nominas).toEqual(mockRecords)
    })

    it('debe crear una nueva nomina', async () => {
      const mockRecord = { id: 'nom-new', semana_inicio: '2026-05-01', total_pagado: 100, detalles: [] }
      const createMock = vi.fn().mockResolvedValue(mockRecord)
      pb.collection.mockReturnValue({ create: createMock })

      const store = useNominaStore()
      const nominaData = { semana_inicio: '2026-05-01', semana_fin: '2026-05-07', total_pagado: 100, detalles: [] }
      const result = await store.guardarNomina(nominaData)

      expect(createMock).toHaveBeenCalledWith({
        hacienda: 'hac-123',
        semana_inicio: '2026-05-01',
        semana_fin: '2026-05-07',
        estado: undefined,
        total_pagado: 100,
        detalles: []
      })
      expect(result).toEqual(mockRecord)
      expect(store.nominas[0]).toEqual(mockRecord)
    })

    it('debe eliminar una nomina', async () => {
      const deleteMock = vi.fn().mockResolvedValue(true)
      pb.collection.mockReturnValue({ delete: deleteMock })

      const store = useNominaStore()
      store.nominas = [{ id: 'nom-1' }]
      
      const result = await store.eliminarNomina('nom-1')

      expect(deleteMock).toHaveBeenCalledWith('nom-1')
      expect(result).toBe(true)
      expect(store.nominas).toEqual([])
    })
  })

  describe('Cálculo de Nómina y Borrador', () => {
    it('debe generar un borrador de nómina calculando jornales y destajo correctamente', async () => {
      // Mock bitacoras (para calcular asistencia/dias trabajados)
      // op-1 tiene 2 bitacoras en diferentes fechas (2 dias trabajados)
      // op-2 tiene 1 bitacora (1 dia trabajado)
      const mockBitacoras = [
        { id: 'b-1', user_created: 'op-1', fecha: '2026-05-02T10:00:00.000Z' },
        { id: 'b-2', user_created: 'op-1', fecha: '2026-05-03T11:00:00.000Z' },
        { id: 'b-3', user_created: 'op-2', fecha: '2026-05-02T10:00:00.000Z' }
      ]

      // Mock tarjas (para calcular destajos)
      // op-1 cosechó 10 cajas (rate: 0.50) -> $5.00
      // op-2 cosechó 100 kilos (rate: 0.10) y 50 racimos (rate: 0.20) -> $10.00 + $10.00 = $20.00
      const mockTarjas = [
        { id: 't-1', operario: 'op-1', tipo_unidad: 'cajas', cantidad: 10, fecha: '2026-05-02T12:00:00.000Z' },
        { id: 't-2', operario: 'op-2', tipo_unidad: 'kilos', cantidad: 100, fecha: '2026-05-02T12:00:00.000Z' },
        { id: 't-3', operario: 'op-2', tipo_unidad: 'racimos', cantidad: 50, fecha: '2026-05-03T12:00:00.000Z' }
      ]

      pb.collection.mockImplementation((collectionName) => {
        return {
          getFullList: vi.fn().mockImplementation(() => {
            if (collectionName === 'bitacora') return mockBitacoras
            if (collectionName === 'tarjas') return mockTarjas
            return []
          })
        }
      })

      const store = useNominaStore()
      const borrador = await store.generarBorradorSemana('2026-05-01', '2026-05-07')

      // Verificar que solo se procesan operarios (op-1, op-2), no administradores (op-3)
      expect(borrador.length).toBe(2)

      // Verificar op-1
      const op1Detalle = borrador.find(d => d.operario_id === 'op-1')
      expect(op1Detalle).toBeDefined()
      expect(op1Detalle.dias_trabajados).toBe(2)
      expect(op1Detalle.pago_jornal).toBe(30.00) // 2 dias * $15.00
      expect(op1Detalle.pago_destajo).toBe(5.00) // 10 cajas * $0.50
      expect(op1Detalle.total_neto).toBe(35.00) // $30 + $5

      // Verificar op-2
      const op2Detalle = borrador.find(d => d.operario_id === 'op-2')
      expect(op2Detalle).toBeDefined()
      expect(op2Detalle.dias_trabajados).toBe(1)
      expect(op2Detalle.pago_jornal).toBe(20.00) // 1 dia * $20.00
      expect(op2Detalle.pago_destajo).toBe(20.00) // 100 kilos * $0.10 + 50 racimos * $0.20 = $10 + $10
      expect(op2Detalle.total_neto).toBe(40.00) // $20 + $20
    })

    it('debe lanzar un error si la hacienda no está seleccionada', async () => {
      vi.mocked(useHaciendaStore).mockReturnValueOnce({ mi_hacienda: null })
      const store = useNominaStore()
      await expect(store.generarBorradorSemana('2026-05-01', '2026-05-07')).rejects.toThrow('Hacienda no seleccionada')
    })

    it('debe usar jornal por defecto si el operario no tiene valor_jornal', async () => {
      vi.mocked(useUserStore).mockReturnValueOnce({
        fetchHaciendaUsers: vi.fn().mockResolvedValue([
          { id: 'op-4', name: 'Sin Jornal', role: 'operador', valor_jornal: null }
        ])
      })

      const mockBitacoras = [{ id: 'b-4', user_created: 'op-4', fecha: '2026-05-02T10:00:00.000Z' }]
      pb.collection.mockImplementation((collectionName) => {
        return {
          getFullList: vi.fn().mockImplementation(() => {
            if (collectionName === 'bitacora') return mockBitacoras
            return []
          })
        }
      })

      const store = useNominaStore()
      const borrador = await store.generarBorradorSemana('2026-05-01', '2026-05-07')

      expect(borrador.length).toBe(1)
      expect(borrador[0].valor_jornal).toBe(15.00) // defaultJornal
      expect(borrador[0].pago_jornal).toBe(15.00) // 1 * 15
      expect(borrador[0].total_neto).toBe(15.00)
    })

    it('debe calcular correctamente un operario sin asistencia pero con destajo', async () => {
      const mockTarjas = [
        { id: 't-4', operario: 'op-1', tipo_unidad: 'cajas', cantidad: 20, fecha: '2026-05-02T12:00:00.000Z' }
      ]
      pb.collection.mockImplementation((collectionName) => {
        return {
          getFullList: vi.fn().mockImplementation(() => {
            if (collectionName === 'tarjas') return mockTarjas
            return []
          })
        }
      })

      const store = useNominaStore()
      const borrador = await store.generarBorradorSemana('2026-05-01', '2026-05-07')

      const op1Detalle = borrador.find(d => d.operario_id === 'op-1')
      expect(op1Detalle).toBeDefined()
      expect(op1Detalle.dias_trabajados).toBe(0)
      expect(op1Detalle.pago_jornal).toBe(0)
      expect(op1Detalle.pago_destajo).toBe(10.00) // 20 cajas * 0.50
      expect(op1Detalle.total_neto).toBe(10.00)
    })
  })

  describe('Exportación Excel', () => {
    it('debe exportar la planilla a Excel de manera exitosa', async () => {
      const store = useNominaStore()
      const detalles = [
        {
          operario_nombre: 'Juan Perez',
          dias_trabajados: 5,
          valor_jornal: 15.00,
          pago_jornal: 75.00,
          cosechas: { cajas: 10, kilos: 0, racimos: 0, unidades: 0 },
          pago_destajo: 5.00,
          ajustes: 0,
          total_neto: 80.00
        }
      ]

      const result = await store.exportarNominaExcel({ inicio: '2026-05-01', fin: '2026-05-07' }, detalles)
      expect(result).toBe(true)
      
      const XLSX = await import('xlsx')
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled()
      expect(XLSX.utils.book_new).toHaveBeenCalled()
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalled()
      expect(XLSX.writeFile).toHaveBeenCalled()
    })
  })
})

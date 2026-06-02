import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBodegaStore } from '@/stores/bodegaStore'
import { pb } from '@/utils/pocketbase'
import { useSyncStore } from '@/stores/sync/index'
import { syncPlugin } from '@/stores/plugins/syncPlugin'
import { tieredCache } from '@/utils/cacheManager'

// Mock de PocketBase
vi.mock('@/utils/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      getList: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }))
  }
}))

// Mock de cacheManager
vi.mock('@/utils/cacheManager', () => ({
  tieredCache: {
    fetchWithCache: vi.fn((config, fetchFn) => fetchFn()),
    invalidatePattern: vi.fn()
  },
  CacheKeys: {
    paginatedResult: vi.fn((coll, page, filter) => ({ key: `cache:${coll}:${page}` }))
  }
}))

// Mock de haciendaStore
vi.mock('@/stores/haciendaStore', () => ({
  useHaciendaStore: vi.fn(() => ({
    mi_hacienda: { id: 'hac-123', name: 'Hacienda Test' }
  }))
}))

// Mock de uiFeedbackStore
vi.mock('@/stores/uiFeedbackStore', () => ({
  useUiFeedbackStore: vi.fn(() => ({
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    showSnackbar: vi.fn()
  }))
}))

// Mock de useSyncStore
const mockSyncStore = {
  isOnline: true,
  generateTempId: vi.fn(() => 'temp-insumo-123'),
  queueOperation: vi.fn(),
  saveToLocalStorage: vi.fn(),
  loadFromLocalStorage: vi.fn()
}
vi.mock('@/stores/sync/index', () => ({
  useSyncStore: vi.fn(() => mockSyncStore)
}))

describe('useBodegaStore', () => {
  beforeEach(() => {
    const pinia = createPinia()
    pinia._p.push(syncPlugin)
    setActivePinia(pinia)
    
    mockSyncStore.isOnline = true
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Inicialización y Carga', () => {
    it('debe cargar los items desde PocketBase cuando está online', async () => {
      const mockResultList = {
        items: [
          { id: 'item-1', nombre: 'Abono NPK', stock_actual: 50, stock_minimo: 10 }
        ]
      }
      
      const getListMock = vi.fn().mockResolvedValue(mockResultList)
      pb.collection.mockReturnValue({ getList: getListMock })

      const store = useBodegaStore()
      const initialized = await store.init()

      expect(initialized).toBe(true)
      expect(store.items).toEqual(mockResultList.items)
      expect(mockSyncStore.saveToLocalStorage).toHaveBeenCalledWith('bodega_items', mockResultList.items)
    })

    it('debe retornar items locales si está offline y ya existen en memoria', async () => {
      mockSyncStore.isOnline = false
      const store = useBodegaStore()
      store.items = [{ id: 'item-1', nombre: 'Abono NPK' }]

      const result = await store.cargarItems()
      expect(result).toEqual([{ id: 'item-1', nombre: 'Abono NPK' }])
    })

    it('debe limpiar items si está offline y no hay items cargados en memoria', async () => {
      mockSyncStore.isOnline = false
      const store = useBodegaStore()
      store.items = []

      const result = await store.cargarItems()
      expect(result).toEqual([])
      expect(store.items).toEqual([])
    })
  })

  describe('Acciones CRUD - Online', () => {
    it('debe registrar un nuevo insumo', async () => {
      const inputData = { nombre: 'Urea', stock_actual: 100, stock_minimo: 20 }
      const mockRecord = { id: 'item-2', ...inputData, hacienda: 'hac-123', version: 1 }

      const createMock = vi.fn().mockResolvedValue(mockRecord)
      pb.collection.mockReturnValue({ create: createMock })

      const store = useBodegaStore()
      const result = await store.crearItem(inputData)

      expect(createMock).toHaveBeenCalledWith({
        ...inputData,
        hacienda: 'hac-123',
        version: 1
      })
      expect(result).toEqual(mockRecord)
      expect(store.items).toContainEqual({ ...mockRecord, _isTemp: false })
      expect(tieredCache.invalidatePattern).toHaveBeenCalledWith('bodega_items:page:')
    })

    it('debe actualizar un insumo existente', async () => {
      const updateData = { stock_actual: 80 }
      const mockRecord = { id: 'item-1', nombre: 'Abono NPK', stock_actual: 80, stock_minimo: 10 }

      const updateMock = vi.fn().mockResolvedValue(mockRecord)
      pb.collection.mockReturnValue({ update: updateMock })

      const store = useBodegaStore()
      store.items = [{ id: 'item-1', nombre: 'Abono NPK', stock_actual: 50, stock_minimo: 10 }]

      const result = await store.updateItem('item-1', updateData)

      expect(updateMock).toHaveBeenCalledWith('item-1', updateData)
      expect(result).toEqual(mockRecord)
      expect(store.items.find(i => i.id === 'item-1').stock_actual).toBe(80)
      expect(tieredCache.invalidatePattern).toHaveBeenCalledWith('bodega_items:page:')
    })

    it('debe eliminar un insumo', async () => {
      const deleteMock = vi.fn().mockResolvedValue(true)
      pb.collection.mockReturnValue({ delete: deleteMock })

      const store = useBodegaStore()
      store.items = [{ id: 'item-1', nombre: 'Abono NPK' }]

      const result = await store.eliminarItem('item-1')

      expect(deleteMock).toHaveBeenCalledWith('item-1')
      expect(result).toBe(true)
      expect(store.items).toEqual([])
      expect(tieredCache.invalidatePattern).toHaveBeenCalledWith('bodega_items:page:')
    })
  })

  describe('Acciones CRUD - Offline (Optimistic Updates)', () => {
    it('debe crear un insumo temporalmente y encolar la operación', async () => {
      mockSyncStore.isOnline = false
      const inputData = { nombre: 'Semillas', stock_actual: 10, stock_minimo: 2 }

      const store = useBodegaStore()
      const result = await store.crearItem(inputData)

      expect(result.id).toBe('temp-insumo-123')
      expect(result._isTemp).toBe(true)
      expect(store.items).toContainEqual({ ...result, _isTemp: false })
      expect(mockSyncStore.queueOperation).toHaveBeenCalledWith({
        type: 'create',
        collection: 'bodega_items',
        data: {
          nombre: 'Semillas',
          stock_actual: 10,
          stock_minimo: 2,
          hacienda: 'hac-123',
          version: 1
        },
        tempId: 'temp-insumo-123'
      })
    })

    it('debe actualizar un insumo localmente y encolar la operación', async () => {
      mockSyncStore.isOnline = false
      const store = useBodegaStore()
      store.items = [{ id: 'item-1', nombre: 'Abono NPK', stock_actual: 50 }]

      const updateData = { stock_actual: 45 }
      const result = await store.updateItem('item-1', updateData)

      expect(result.stock_actual).toBe(45)
      expect(store.items.find(i => i.id === 'item-1').stock_actual).toBe(45)
      expect(mockSyncStore.queueOperation).toHaveBeenCalledWith({
        type: 'update',
        collection: 'bodega_items',
        id: 'item-1',
        data: updateData
      })
    })

    it('debe eliminar un insumo localmente y encolar la operación', async () => {
      mockSyncStore.isOnline = false
      const store = useBodegaStore()
      store.items = [{ id: 'item-1', nombre: 'Abono NPK' }]

      const result = await store.eliminarItem('item-1')

      expect(result).toBe(true)
      expect(store.items).toEqual([])
      expect(mockSyncStore.queueOperation).toHaveBeenCalledWith({
        type: 'delete',
        collection: 'bodega_items',
        id: 'item-1'
      })
    })
  })

  describe('Getters y LocalStorage', () => {
    it('debe identificar insumos con stock crítico', () => {
      const store = useBodegaStore()
      store.items = [
        { id: 'i1', nombre: 'NPK', stock_actual: 5, stock_minimo: 10 },
        { id: 'i2', nombre: 'Urea', stock_actual: 20, stock_minimo: 10 }
      ]

      expect(store.criticalItems.length).toBe(1)
      expect(store.criticalItems[0].id).toBe('i1')
    })

    it('debe inicializar el estado desde localStorage', async () => {
      const storedItems = [{ id: 'i-local', nombre: 'Local Item' }]
      mockSyncStore.loadFromLocalStorage.mockResolvedValue(storedItems)

      const store = useBodegaStore()
      await store.initFromLocalStorage()

      expect(mockSyncStore.loadFromLocalStorage).toHaveBeenCalledWith('bodega_items')
      expect(store.items).toEqual(storedItems)
    })
  })
})

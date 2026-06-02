import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSyncStore } from '@/stores/sync'

// Mock de IndexedDBStorage (nuevo en Hito 2)
vi.mock('@/utils/indexedDBStorage', () => {
  return {
    IndexedDBStorage: class MockIndexedDBStorage {
      constructor() {
        this.store = new Map()
      }
      async init() {}
      async getItem(key) { return this.store.get(key) || null }
      async setItem(key, value) { this.store.set(key, value) }
      async removeItem(key) { this.store.delete(key) }
      async clear() { this.store.clear() }
    }
  }
})

// Mocks de todos los stores dinámicos para evitar que falle el cargador de módulos de sync
vi.mock('@/stores/zonasStore', () => ({ useZonasStore: vi.fn(() => ({ init: vi.fn() })) }))
vi.mock('@/stores/siembrasStore', () => ({ useSiembrasStore: vi.fn(() => ({ init: vi.fn() })) }))
vi.mock('@/stores/actividadesStore', () => ({ useActividadesStore: vi.fn(() => ({ init: vi.fn() })) }))
vi.mock('@/stores/recordatoriosStore', () => ({ useRecordatoriosStore: vi.fn(() => ({ init: vi.fn() })) }))
vi.mock('@/stores/programaciones/programacionesStore', () => ({ useProgramacionesStore: vi.fn(() => ({ init: vi.fn() })) }))
vi.mock('@/stores/programaciones', () => ({ useProgramacionesStore: vi.fn(() => ({ init: vi.fn() })) }))
vi.mock('@/stores/bitacoraStore', () => ({ useBitacoraStore: vi.fn(() => ({ init: vi.fn() })) }))
vi.mock('@/stores/bodegaStore', () => ({ useBodegaStore: vi.fn(() => ({ init: vi.fn() })) }))
vi.mock('@/stores/bodegaMovimientosStore', () => ({ useBodegaMovimientosStore: vi.fn(() => ({ init: vi.fn() })) }))
vi.mock('@/stores/tarjasStore', () => ({ useTarjasStore: vi.fn(() => ({ init: vi.fn() })) }))
vi.mock('@/stores/uiFeedbackStore', () => ({ useUiFeedbackStore: vi.fn(() => ({ showSnackbar: vi.fn() })) }))

// Mock de PocketBase
vi.mock('@/utils/pocketbase', () => ({
  pb: {
    baseUrl: 'http://localhost'
  }
}))

// Mock de networkMonitor
vi.mock('./networkMonitor', () => ({
  initNetworkMonitor: vi.fn((callback) => {
    return {
      isOnline: { value: true },
      cleanup: vi.fn(),
      checkConnectivity: vi.fn().mockResolvedValue(true)
    }
  })
}))

// Mock de localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    })
  }
})()
vi.stubGlobal('localStorage', localStorageMock)

describe('useSyncStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('debe inicializar el store con valores por defecto', () => {
    const store = useSyncStore()
    expect(store.initialized).toBe(false)
    expect(store.queue).toEqual([])
    expect(store.syncStatus).toBe('idle')
    expect(store.isProcessing).toBe(false)
  })

  it('debe completar la inicialización con init()', async () => {
    const store = useSyncStore()
    await store.init()

    expect(store.initialized).toBe(true)
    expect(store.idMapper).toBeDefined()
    expect(store.syncConfig).toBeDefined()
    expect(store.conflictUI).toBeDefined()
    expect(store.processor).toBeDefined()
    expect(store.offline).toBeDefined()
  })

  it('debe restaurar la cola de sincronización desde localStorage durante init()', async () => {
    const mockQueue = [
      { id: '1', action: 'create', collection: 'zonas', payload: { name: 'Zona Test' } }
    ]
    localStorage.setItem('agri_syncQueue', JSON.stringify(mockQueue))

    const store = useSyncStore()
    await store.init()

    expect(store.queue).toEqual(mockQueue)
  })

  it('debe limpiar los listeners de red al llamar a dispose()', async () => {
    const store = useSyncStore()
    await store.init()

    store.dispose()
    expect(store.initialized).toBe(false)
    expect(store._networkCleanup).toBeNull()
    expect(store._checkConnectivity).toBeNull()
  })

  it('debe persistir el estado de la cola en localStorage', async () => {
    const store = useSyncStore()
    await store.init()

    const mockItem = { id: '2', action: 'update', collection: 'zonas', payload: { id: 'z1', name: 'Z1' } }
    store.queue.push(mockItem)
    store.persistQueueState()

    const storedQueue = JSON.parse(localStorage.getItem('agri_syncQueue'))
    expect(storedQueue).toEqual([mockItem])
  })

  it('debe generar ids temporales válidos', async () => {
    const store = useSyncStore()
    await store.init()

    const tempId = store.generateTempId()
    expect(tempId).toMatch(/^temp_/)
  })
})

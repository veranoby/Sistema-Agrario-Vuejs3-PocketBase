import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSyncStore } from '@/stores/sync'
import { pb } from '@/utils/pocketbase'

// --- MOCK DE GLOBALES (DEBEN ESTAR ANTES QUE NADA) ---
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

// Mock de navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  configurable: true,
  writable: true
})

// --- MOCK DE DEPENDENCIAS ---
vi.mock('@/utils/pocketbase', () => ({
  pb: {
    authStore: { isValid: true, token: 'mock_token' },
    collection: vi.fn(() => ({
      getList: vi.fn(),
      getOne: vi.fn()
    })),
    createBatch: vi.fn(() => ({
      collection: vi.fn(() => ({
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      })),
      send: vi.fn()
    })),
    baseUrl: 'http://localhost:8090'
  }
}))

vi.mock('@/stores/snackbarStore', () => ({
  useSnackbarStore: vi.fn(() => ({
    showSnackbar: vi.fn()
  }))
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user_123' },
    isLoggedIn: true,
    ensureAuthInitialized: vi.fn()
  }))
}))

// Mock de otros stores
vi.mock('@/stores/zonasStore', () => ({ useZonasStore: vi.fn(() => ({ items: [], $patch: vi.fn() })) }))
vi.mock('@/stores/siembrasStore', () => ({ useSiembrasStore: vi.fn(() => ({ items: [], $patch: vi.fn() })) }))
vi.mock('@/stores/actividadesStore', () => ({ useActividadesStore: vi.fn(() => ({ items: [], $patch: vi.fn() })) }))
vi.mock('@/stores/recordatoriosStore', () => ({ useRecordatoriosStore: vi.fn(() => ({ items: [], $patch: vi.fn() })) }))
vi.mock('@/stores/haciendaStore', () => ({ 
  useHaciendaStore: vi.fn(() => ({
    mi_hacienda: { id: 'hacienda_123' },
    init: vi.fn(),
    $patch: vi.fn()
  }))
}))
vi.mock('@/stores/programacionesStore', () => ({ useProgramacionesStore: vi.fn(() => ({ items: [], $patch: vi.fn() })) }))
vi.mock('@/stores/bitacoraStore', () => ({ useBitacoraStore: vi.fn(() => ({ items: [], $patch: vi.fn() })) }))

describe('SyncStore - Conflict Resolution (409)', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    navigator.onLine = true
    
    // Inicializar el store para que se asigne el callback de conflicto
    const syncStore = useSyncStore()
    await syncStore.init()
  })

  it('debe agregar un conflicto a la lista cuando SyncQueue detecta error 409', async () => {
    const syncStore = useSyncStore()
    
    const mockConflict = {
      id: 'op_123',
      tempId: 'temp_123',
      collection: 'siembras',
      type: 'update',
      local: { nombre: 'Siembra Local' },
      server: { id: 'op_123', nombre: 'Siembra Servidor' },
      timestamp: Date.now()
    }

    // Act: Simular que SyncQueue llama al callback de conflicto
    syncStore.addConflict(mockConflict)

    // Assert
    expect(syncStore.conflicts).toHaveLength(1)
    expect(syncStore.conflicts[0]).toMatchObject(mockConflict)
    expect(syncStore.conflictDialog).toBe(true)
  })

  it('debe prevenir duplicados en la lista de conflictos', () => {
    const syncStore = useSyncStore()
    const mockConflict = { id: 'op_123', tempId: 'temp_123', collection: 'siembras' }

    syncStore.addConflict(mockConflict)
    syncStore.addConflict(mockConflict)

    expect(syncStore.conflicts).toHaveLength(1)
  })

  it('debe resolver conflicto aceptando versión del servidor', () => {
    const syncStore = useSyncStore()
    const mockConflict = { id: 'op_1', tempId: 'temp_1', collection: 'siembras', server: { id: 'op_1', val: 'server' } }
    
    syncStore.addConflict(mockConflict)
    
    syncStore.resolveConflict('op_1', 'server', mockConflict.server)

    expect(syncStore.conflicts[0].resolved).toBe(true)
    expect(syncStore.conflicts[0].resolution).toBe('server')
  })

  it('debe resolver conflicto forzando versión local', () => {
    const syncStore = useSyncStore()
    const mockConflict = { id: 'op_1', tempId: 'temp_1', collection: 'siembras', local: { val: 'local' } }
    
    syncStore.addConflict(mockConflict)
    
    syncStore.resolveConflict('op_1', 'local')

    expect(syncStore.conflicts[0].resolved).toBe(true)
    expect(syncStore.conflicts[0].resolution).toBe('local')
  })

  describe('Procesamiento de Cola', () => {
    it('debe llamar a applySyncedCreate en el store correspondiente cuando se sincroniza una creación', async () => {
      const syncStore = useSyncStore()
      const mockSiembrasStore = { 
        applySyncedCreate: vi.fn(),
        $patch: vi.fn()
      }
      
      // Mock de getStoreByCollectionName
      vi.spyOn(syncStore, 'getStoreByCollectionName').mockReturnValue(mockSiembrasStore)
      
      const operation = {
        collection: 'siembras',
        type: 'create',
        data: { nombre: 'Nueva Siembra' }
      }
      
      // Mock de éxito en el servidor
      const mockCollection = {
        create: vi.fn().mockResolvedValue({ id: 'real_999', collectionName: 'siembras' })
      }
      pb.collection.mockReturnValue(mockCollection)
      
      await syncStore.queueOperation(operation)
      
      expect(mockSiembrasStore.applySyncedCreate).toHaveBeenCalledWith(expect.stringContaining('temp_'), expect.objectContaining({ id: 'real_999' }))
    })

    it('debe manejar cambios de conectividad correctamente', async () => {
      const syncStore = useSyncStore()
      const processSpy = vi.spyOn(syncStore, 'processPendingQueue').mockResolvedValue()
      
      // Simular offline
      syncStore.isOnline = false
      expect(syncStore.isOnline).toBe(false)
      
      // Agregar algo a la cola para que al volver online se procese
      syncStore.queue = [{ id: 'op_1', type: 'create', status: 'pending' }]
      
      // Simular online y disparar proceso
      syncStore.isOnline = true
      await syncStore.processPendingQueue()
      
      expect(syncStore.isOnline).toBe(true)
      expect(processSpy).toHaveBeenCalled()
    })
  })

  describe('Sincronización Selectiva', () => {
    it('debe permitir configurar sincronización selectiva', () => {
      const syncStore = useSyncStore()
      const config = { enabled: true, deferredSyncInterval: 5000 }
      
      syncStore.configureSelectiveSync(config)
      
      const currentConfig = syncStore.getSelectiveSyncConfig()
      expect(currentConfig.enabled).toBe(true)
      expect(currentConfig.deferredSyncInterval).toBe(5000)
    })
  })
})

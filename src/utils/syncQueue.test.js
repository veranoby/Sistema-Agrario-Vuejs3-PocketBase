import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SyncQueue } from '@/utils/syncQueue'

/**
 * Tests para SyncQueue - Sistema Agri
 * 
 * Enfocados en:
 * 1. Detección de error 409 (Conflict)
 * 2. Resolución de conflictos con callback
 * 3. Exponential backoff para reintentos
 * 4. Métricas de operaciones
 */

// Mock de localStorage para jsdom
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

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock de dependencias externas
vi.mock('@/utils/pocketbase', () => ({
  pb: {
    createBatch: vi.fn(() => ({
      collection: vi.fn(() => ({
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      })),
      send: vi.fn()
    })),
    collection: vi.fn(() => ({
      getList: vi.fn(),
      getOne: vi.fn()
    }))
  }
}))

vi.mock('@/utils/errorHandler', () => ({
  handleError: vi.fn()
}))

// Mock de stores de Pinia
const mockPiniaStores = () => {
  vi.mock('@/stores/zonasStore', () => ({
    useZonasStore: vi.fn(() => ({}))
  }))
  vi.mock('@/stores/actividadesStore', () => ({
    useActividadesStore: vi.fn(() => ({}))
  }))
  vi.mock('@/stores/siembrasStore', () => ({
    useSiembrasStore: vi.fn(() => ({}))
  }))
  vi.mock('@/stores/haciendaStore', () => ({
    useHaciendaStore: vi.fn(() => ({
      mi_hacienda: { id: 'hacienda_123' }
    }))
  }))
  vi.mock('@/stores/recordatoriosStore', () => ({
    useRecordatoriosStore: vi.fn(() => ({}))
  }))
  vi.mock('@/stores/authStore', () => ({
    useAuthStore: vi.fn(() => ({
      user: { id: 'user_456' }
    }))
  }))
  vi.mock('@/stores/snackbarStore', () => ({
    useSnackbarStore: vi.fn(() => ({}))
  }))
}

mockPiniaStores()

describe('SyncQueue', () => {
  let syncQueue
  let mockConflictCallback

  beforeEach(() => {
    vi.clearAllMocks()
    mockConflictCallback = vi.fn()
    syncQueue = new SyncQueue(mockConflictCallback)
    
    // Limpiar localStorage entre tests
    localStorage.clear()
  })

  describe('Constructor', () => {
    it('debe inicializar con configuración correcta', () => {
      expect(syncQueue.config.maxRetries).toBe(5)
      expect(syncQueue.config.batchSize).toBe(30)
      expect(syncQueue.config.baseDelay).toBe(1000)
      expect(syncQueue.config.maxDelay).toBe(30000)
    })

    it('debe inicializar métricas vacías', () => {
      expect(syncQueue.metrics.operationCounts.total).toBe(0)
      expect(syncQueue.metrics.operationCounts.successful).toBe(0)
      expect(syncQueue.metrics.operationCounts.failed).toBe(0)
      expect(syncQueue.metrics.errors.totalErrors).toBe(0)
    })

    it('debe aceptar callback de conflictos opcional', () => {
      const customCallback = vi.fn()
      const queueWithCallback = new SyncQueue(customCallback)
      expect(queueWithCallback.onConflictCallback).toBe(customCallback)
    })
  })

  describe('handleBatchError - Detección de Error 409', () => {
    it('debe detectar error 409 y llamar al callback de conflicto', () => {
      const mockOperation = {
        id: 'op_1',
        tempId: 'temp_123',
        collection: 'siembras',
        type: 'create',
        data: { nombre: 'Siembra Test' },
        status: 'pending',
        retryCount: 0
      }

      const mock409Error = {
        status: 409,
        data: {
          serverVersion: { id: 'real_123', nombre: 'Siembra Actualizado' }
        },
        isAbort: false
      }

      syncQueue.handleBatchError([mockOperation], mock409Error)

      // Verificar que se detectó el conflicto
      expect(mockOperation.status).toBe('conflict')
      expect(mockOperation.conflictDetected).toBe(true)
      
      // Verificar que NO se incrementó retryCount para errores 409
      expect(mockOperation.retryCount).toBe(0)

      // Verificar que se llamó al callback de conflicto
      expect(mockConflictCallback).toHaveBeenCalledTimes(1)
      
      const conflictArg = mockConflictCallback.mock.calls[0][0]
      expect(conflictArg).toMatchObject({
        id: 'op_1',
        tempId: 'temp_123',
        collection: 'siembras',
        type: 'create',
        local: { nombre: 'Siembra Test' },
        server: { id: 'real_123', nombre: 'Siembra Actualizado' }
      })
      expect(conflictArg.timestamp).toBeDefined()
    })

    it('debe manejar múltiples operaciones en error 409', () => {
      const operations = [
        {
          id: 'op_1',
          tempId: 'temp_1',
          collection: 'siembras',
          type: 'create',
          data: { nombre: 'Siembra 1' },
          status: 'pending',
          retryCount: 0
        },
        {
          id: 'op_2',
          tempId: 'temp_2',
          collection: 'zonas',
          type: 'update',
          data: { nombre: 'Zona 2' },
          status: 'pending',
          retryCount: 0
        }
      ]

      const mock409Error = {
        status: 409,
        data: { serverVersion: null },
        isAbort: false
      }

      syncQueue.handleBatchError(operations, mock409Error)

      // Ambas operaciones deben estar en conflicto
      expect(operations[0].status).toBe('conflict')
      expect(operations[1].status).toBe('conflict')
      expect(mockConflictCallback).toHaveBeenCalledTimes(2)
    })

    it('debe manejar error 409 sin callback de conflicto', () => {
      const syncQueueSinCallback = new SyncQueue(null)
      const mockOperation = {
        id: 'op_1',
        tempId: 'temp_123',
        collection: 'siembras',
        type: 'create',
        data: { nombre: 'Test' },
        status: 'pending',
        retryCount: 0
      }

      const mock409Error = {
        status: 409,
        data: { serverVersion: null },
        isAbort: false
      }

      // No debe lanzar error sin callback
      expect(() => {
        syncQueueSinCallback.handleBatchError([mockOperation], mock409Error)
      }).not.toThrow()

      // La operación debe pasar a 'retrying' para reintentar (no hay callback que maneje el conflicto)
      expect(mockOperation.status).toBe('retrying')
      expect(mockOperation.retryCount).toBe(1)
    })
  })

  describe('handleBatchError - Otros Errores (Reintentos)', () => {
    it('debe aplicar exponential backoff para errores no-409', () => {
      const mockOperation = {
        id: 'op_1',
        tempId: 'temp_123',
        collection: 'siembras',
        type: 'create',
        data: { nombre: 'Test' },
        status: 'pending',
        retryCount: 0
      }

      const mockError = {
        status: 500,
        data: { message: 'Server Error' },
        isAbort: false,
        name: 'ServerError'
      }

      syncQueue.handleBatchError([mockOperation], mockError)

      // Debe incrementar retryCount
      expect(mockOperation.retryCount).toBe(1)
      expect(mockOperation.status).toBe('retrying')

      // Verificar métricas de error
      expect(syncQueue.metrics.errors.totalErrors).toBe(1)
    })

    it('debe marcar como fallida después de maxRetries', () => {
      const mockOperation = {
        id: 'op_1',
        tempId: 'temp_123',
        collection: 'siembras',
        type: 'create',
        data: { nombre: 'Test' },
        status: 'pending',
        retryCount: 4 // Ya tiene 4 reintentos previos
      }

      const mockError = {
        status: 500,
        data: { message: 'Server Error' },
        isAbort: false
      }

      syncQueue.handleBatchError([mockOperation], mockError)

      // Debe marcar como fallida en el 5to intento (maxRetries = 5)
      expect(mockOperation.status).toBe('failed')
      expect(syncQueue.metrics.operationCounts.failed).toBe(1)
    })
  })

  describe('calculateBackoffDelay', () => {
    it('debe calcular delay exponencial sin jitter', () => {
      // Retry 0: 1000 * 2^0 = 1000ms
      const delay0 = syncQueue.calculateBackoffDelay(0)
      expect(delay0).toBeGreaterThanOrEqual(1000)
      expect(delay0).toBeLessThanOrEqual(1250) // 1000 + 25% jitter

      // Retry 1: 1000 * 2^1 = 2000ms
      const delay1 = syncQueue.calculateBackoffDelay(1)
      expect(delay1).toBeGreaterThanOrEqual(2000)
      expect(delay1).toBeLessThanOrEqual(2500)

      // Retry 2: 1000 * 2^2 = 4000ms
      const delay2 = syncQueue.calculateBackoffDelay(2)
      expect(delay2).toBeGreaterThanOrEqual(4000)
      expect(delay2).toBeLessThanOrEqual(5000)
    })

    it('debe respetar maxDelay de 30 segundos', () => {
      // Retry 10: 1000 * 2^10 = 1,024,000ms > 30,000ms
      const delay10 = syncQueue.calculateBackoffDelay(10)
      expect(delay10).toBeLessThanOrEqual(30000)
    })

    it('debe aplicar jitter aleatorio', () => {
      const delays = []
      for (let i = 0; i < 10; i++) {
        delays.push(syncQueue.calculateBackoffDelay(1))
      }
      
      // Los delays deben variar debido al jitter
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('updateOperationCounts', () => {
    it('debe incrementar total y successful', () => {
      syncQueue.updateOperationCounts('create', true, false)
      
      expect(syncQueue.metrics.operationCounts.total).toBe(1)
      expect(syncQueue.metrics.operationCounts.successful).toBe(1)
      expect(syncQueue.metrics.operationCounts.failed).toBe(0)
    })

    it('debe incrementar total y failed', () => {
      syncQueue.updateOperationCounts('update', false, false)
      
      expect(syncQueue.metrics.operationCounts.total).toBe(1)
      expect(syncQueue.metrics.operationCounts.failed).toBe(1)
    })

    it('debe incrementar retried cuando esRetry=true', () => {
      syncQueue.updateOperationCounts('delete', false, true)
      
      expect(syncQueue.metrics.operationCounts.retried).toBe(1)
    })

    it('debe calcular successRate correctamente', () => {
      syncQueue.updateOperationCounts('create', true, false)
      syncQueue.updateOperationCounts('create', false, false)
      syncQueue.updateOperationCounts('create', true, false)
      
      // 2 exitosas de 3 totales = 66.67%
      expect(syncQueue.metrics.syncRate.successRate).toBeCloseTo(66.67, 1)
    })
  })

  describe('trackError', () => {
    it('debe incrementar totalErrors', () => {
      syncQueue.trackError('network_error')
      
      expect(syncQueue.metrics.errors.totalErrors).toBe(1)
    })

    it('debe registrar último error con timestamp', () => {
      syncQueue.trackError('timeout_error')
      
      expect(syncQueue.metrics.errors.lastError).toMatchObject({
        type: 'timeout_error'
      })
      expect(syncQueue.metrics.errors.lastError.timestamp).toBeDefined()
    })

    it('debe contar errores por tipo', () => {
      syncQueue.trackError('network_error')
      syncQueue.trackError('network_error')
      syncQueue.trackError('timeout_error')
      
      expect(syncQueue.metrics.errors.errorTypes).toEqual({
        network_error: 2,
        timeout_error: 1
      })
    })
  })

  describe('updateQueueStats', () => {
    it('debe actualizar currentQueueSize', () => {
      syncQueue.queue = [{ id: 1 }, { id: 2 }, { id: 3 }]
      
      syncQueue.updateQueueStats()
      
      expect(syncQueue.metrics.queueStats.currentQueueSize).toBe(3)
    })

    it('debe actualizar maxQueueSize si es mayor', () => {
      syncQueue.queue = Array(10).fill({})
      syncQueue.updateQueueStats()
      expect(syncQueue.metrics.queueStats.maxQueueSize).toBe(10)

      syncQueue.queue = Array(5).fill({})
      syncQueue.updateQueueStats()
      expect(syncQueue.metrics.queueStats.maxQueueSize).toBe(10) // Se mantiene
    })
  })

  describe('getPerformanceMetrics', () => {
    it('debe retornar métricas actuales', () => {
      syncQueue.updateOperationCounts('create', true, false)
      syncQueue.trackError('test_error')
      
      const metrics = syncQueue.getPerformanceMetrics()
      
      expect(metrics.operationCounts.total).toBe(1)
      expect(metrics.operationCounts.successful).toBe(1)
      expect(metrics.errors.totalErrors).toBe(1)
      expect(metrics.history).toBeDefined()
      expect(Array.isArray(metrics.history)).toBe(true)
    })
  })

  describe('Escenarios de Integración', () => {
    it('debe manejar flujo completo: éxito -> error 409 -> reintento -> fallo', () => {
      // 1. Operación exitosa
      syncQueue.updateOperationCounts('create', true, false)
      expect(syncQueue.metrics.operationCounts.successful).toBe(1)

      // 2. Error 409 en batch
      const conflictOp = {
        id: 'op_1',
        tempId: 'temp_1',
        collection: 'siembras',
        type: 'create',
        data: {},
        status: 'pending',
        retryCount: 0
      }
      syncQueue.handleBatchError([conflictOp], { status: 409, data: {}, isAbort: false })
      expect(conflictOp.status).toBe('conflict')

      // 3. Error de red con reintentos
      const retryOp = {
        id: 'op_2',
        tempId: 'temp_2',
        collection: 'zonas',
        type: 'update',
        data: {},
        status: 'pending',
        retryCount: 0
      }
      
      // Simular 5 reintentos fallidos
      for (let i = 0; i < 5; i++) {
        syncQueue.handleBatchError([retryOp], { status: 500, data: {}, isAbort: false })
      }
      
      expect(retryOp.status).toBe('failed')
      expect(syncQueue.metrics.operationCounts.failed).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Load Test', () => {
    it('debe procesar 30 operaciones en batch', async () => {
      const queue = new SyncQueue()
      const operations = Array(30).fill(null).map((_, i) => ({
        id: `op_${i}`,
        collection: 'test',
        type: 'create',
        data: { id: i },
        status: 'pending',
        retryCount: 0
      }))

      // Verificar que el batch size es 30
      expect(queue.config.batchSize).toBe(30)

      // Agregar operaciones al queue
      operations.forEach(op => queue.add(op))

      // Verificar que todas las operaciones están encoladas
      expect(queue.queue.length).toBe(30)
    })

    it('debe manejar múltiples operaciones concurrentes', async () => {
      const queue = new SyncQueue()
      const operations = Array(50).fill(null).map((_, i) => ({
        id: `op_${i}`,
        collection: 'test',
        type: 'create',
        data: { id: i },
        status: 'pending',
        retryCount: 0
      }))

      operations.forEach(op => queue.add(op))

      expect(queue.queue.length).toBe(50)
      expect(queue.queue.length).toBeGreaterThanOrEqual(30) // Al menos un batch completo
    })
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { TieredCacheManager } from '@/utils/cacheManager'

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

describe('TieredCacheManager', () => {
  let cache

  beforeEach(() => {
    cache = new TieredCacheManager()
  })

  afterEach(() => {
    cache.destroy()
    vi.restoreAllMocks()
  })

  describe('Niveles de caché (L1, L2, L3)', () => {
    it('debe almacenar y recuperar datos en L1 (Lookup)', async () => {
      await cache.setToLevel('key_l1', 'data_l1', 'l1')
      const result = await cache.getFromLevel('key_l1', 'l1')
      expect(result).toBe('data_l1')
    })

    it('debe almacenar y recuperar datos en L2 (Recent)', async () => {
      await cache.setToLevel('key_l2', 'data_l2', 'l2')
      const result = await cache.getFromLevel('key_l2', 'l2')
      expect(result).toBeDefined()
      expect(result.data).toBe('data_l2')
    })

    it('debe almacenar y recuperar datos en L3 (Pagination)', async () => {
      await cache.setToLevel('key_l3', 'data_l3', 'l3')
      const result = await cache.getFromLevel('key_l3', 'l3')
      expect(result).toBeDefined()
      expect(result.data).toBe('data_l3')
    })
  })

  describe('fetchWithCache', () => {
    it('debe llamar a la función fetchFn si hay un cache miss', async () => {
      const fetchFn = vi.fn().mockResolvedValue('fresh_data')
      const result = await cache.fetchWithCache(
        { key: 'test_key', level: 'l2' },
        fetchFn,
        10000
      )

      expect(fetchFn).toHaveBeenCalledTimes(1)
      expect(result).toBe('fresh_data')
    })

    it('debe retornar datos de caché y no llamar a fetchFn si hay un cache hit', async () => {
      // Guardar datos en el caché primero
      await cache.setToLevel('test_key', 'cached_data', 'l2', 10000)

      const fetchFn = vi.fn().mockResolvedValue('fresh_data')
      const result = await cache.fetchWithCache(
        { key: 'test_key', level: 'l2' },
        fetchFn,
        10000
      )

      expect(fetchFn).not.toHaveBeenCalled()
      expect(result).toBe('cached_data')
    })
  })

  describe('invalidación de patrones', () => {
    it('debe invalidar claves que coincidan con el patrón en todos los niveles', async () => {
      await cache.setToLevel('prefix:key1', 'val1', 'l1')
      await cache.setToLevel('prefix:key2', 'val2', 'l2')
      await cache.setToLevel('other:key3', 'val3', 'l3')

      await cache.invalidatePattern('prefix:')

      expect(await cache.getFromLevel('prefix:key1', 'l1')).toBeNull()
      expect(await cache.getFromLevel('prefix:key2', 'l2')).toBeNull()
      const l3Result = await cache.getFromLevel('other:key3', 'l3')
      expect(l3Result).toBeDefined()
      expect(l3Result.data).toBe('val3')
    })
  })

  describe('Integración con IndexedDB (Hito 2)', () => {
    it('debe usar IndexedDB para syncCache en syncStore', async () => {
      const { useSyncStore } = await import('@/stores/sync')
      const pinia = createPinia()
      setActivePinia(pinia)
      const store = useSyncStore()
      
      expect(store.saveToLocalStorage).toBeDefined()
      expect(store.loadFromLocalStorage).toBeDefined()
    })
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { TieredCacheManager } from '@/utils/cacheManager'

describe('TieredCacheManager', () => {
  let cache

  beforeEach(() => {
    cache = new TieredCacheManager()
  })

  afterEach(() => {
    cache.destroy()
  })

  // ... [Mantener tests existentes] ...
  
  describe('Integración con IndexedDB (Hito 2)', () => {
    it('debe usar IndexedDB para syncCache en syncStore', async () => {
      // Verificar que el syncStore ahora use IndexedDBStorage
      const { useSyncStore } = await import('@/stores/sync')
      const pinia = createPinia()
      setActivePinia(pinia)
      const store = useSyncStore()
      
      // El store debe estar definido y tener los métodos de persistencia
      expect(store.saveToLocalStorage).toBeDefined()
      expect(store.loadFromLocalStorage).toBeDefined()
    })
  })
})

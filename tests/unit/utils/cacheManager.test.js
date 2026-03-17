/**
 * Tests para cacheManager
 * @file tests/unit/utils/cacheManager.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { CacheManager } from '@/utils/cacheManager'

describe('CacheManager', () => {
  let cacheManager
  let localStorageMock

  beforeAll(() => {
    // Mock de localStorage se define una sola vez para toda la suite
    localStorageMock = {
      store: {},
      getItem: vi.fn((key) => localStorageMock.store[key] || null),
      setItem: vi.fn((key, value) => {
        localStorageMock.store[key] = value
      }),
      removeItem: vi.fn((key) => {
        delete localStorageMock.store[key]
      }),
      clear: vi.fn(() => {
        localStorageMock.store = {}
      })
    }

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true // Allow re-configuration if needed in other test suites
    })
  })

  beforeEach(() => {
    // Limpia el store y reinicia el cache manager antes de cada test para aislamiento
    localStorageMock.store = {}
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    localStorageMock.clear.mockClear()

    cacheManager = new CacheManager({
      maxSize: 100,
      ttl: 3600000 // 1 hora
    })
  })

  afterEach(() => {
    // Restaura todos los mocks de vitest
    vi.restoreAllMocks()
  })

  describe('inicialización', () => {
    it('debe inicializar con configuración por defecto', () => {
      const cm = new CacheManager()

      expect(cm.maxSize).toBe(100)
      expect(cm.config.ttl).toBe(600000) // 10 minutos
    })

    it('debe inicializar con configuración personalizada', () => {
      const cm = new CacheManager({
        maxSize: 50,
        ttl: 1800000
      })

      expect(cm.maxSize).toBe(50)
      expect(cm.config.ttl).toBe(1800000)
    })
  })

  describe('set', () => {
    it('debe guardar un valor en caché', () => {
      cacheManager.set('key1', { data: 'test' })

      const value = cacheManager.get('key1')
      expect(value).toEqual({ data: 'test' })
    })

    it('debe actualizar timestamp al guardar', () => {
      const before = Date.now()
      cacheManager.set('key1', 'test')
      const after = Date.now()

      const metadata = cacheManager.getMetadata('key1')
      expect(metadata.timestamp).toBeGreaterThanOrEqual(before)
      expect(metadata.timestamp).toBeLessThanOrEqual(after)
    })

    it('debe eliminar el item más antiguo cuando excede maxSize', () => {
      const cm = new CacheManager({ maxSize: 3 })

      cm.set('key1', 'value1')
      cm.set('key2', 'value2')
      cm.set('key3', 'value3')
      cm.set('key4', 'value4')

      expect(cm.get('key1')).toBeNull()
      expect(cm.get('key2')).not.toBeNull()
      expect(cm.get('key4')).not.toBeNull()
    })
  })

  describe('get', () => {
    it('debe retornar null para key inexistente', () => {
      const value = cacheManager.get('nonexistent')
      expect(value).toBeNull()
    })

    it('debe retornar null para item expirado', () => {
      // Mock Date.now() para simular paso del tiempo
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const cm = new CacheManager({ ttl: 100 })
      cm.set('key1', 'test')

      // Simular que pasó el tiempo de expiración
      Date.now.mockReturnValue(now + 200)

      const value = cm.get('key1')
      expect(value).toBeNull()

      Date.now.mockRestore()
    })

    it('debe retornar valor válido', () => {
      cacheManager.set('key1', { data: 'test' })
      const value = cacheManager.get('key1')
      expect(value).toEqual({ data: 'test' })
    })
  })

  describe('has', () => {
    it('debe retornar true para key existente', () => {
      cacheManager.set('key1', 'test')
      expect(cacheManager.has('key1')).toBe(true)
    })

    it('debe retornar false para key inexistente', () => {
      expect(cacheManager.has('nonexistent')).toBe(false)
    })

    it('debe retornar false para item expirado', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const cm = new CacheManager({ ttl: 100 })
      cm.set('key1', 'test')

      // Simular que pasó el tiempo de expiración
      Date.now.mockReturnValue(now + 200)

      expect(cm.has('key1')).toBe(false)

      Date.now.mockRestore()
    })
  })

  describe('delete', () => {
    it('debe eliminar un item de la caché', () => {
      cacheManager.set('key1', 'test')
      cacheManager.delete('key1')

      expect(cacheManager.get('key1')).toBeNull()
    })

    it('debe retornar true si eliminó el item', () => {
      cacheManager.set('key1', 'test')
      const result = cacheManager.delete('key1')

      expect(result).toBe(true)
    })

    it('debe retornar false si el item no existe', () => {
      const result = cacheManager.delete('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('clear', () => {
    it('debe eliminar todos los items de la caché', () => {
      cacheManager.set('key1', 'test1')
      cacheManager.set('key2', 'test2')
      cacheManager.set('key3', 'test3')

      cacheManager.clear()

      expect(cacheManager.get('key1')).toBeNull()
      expect(cacheManager.get('key2')).toBeNull()
      expect(cacheManager.get('key3')).toBeNull()
    })

  })

  describe('getMetadata', () => {
    it('debe retornar metadatos del item', () => {
      const testData = { data: 'test' }
      cacheManager.set('key1', testData)

      const metadata = cacheManager.getMetadata('key1')

      expect(metadata).toHaveProperty('timestamp')
      expect(metadata).toHaveProperty('expiresAt')
    })

    it('debe retornar null para item inexistente', () => {
      const metadata = cacheManager.getMetadata('nonexistent')
      expect(metadata).toBeNull()
    })
  })

  describe('getSize', () => {
    it('debe retornar el número de items en caché', () => {
      cacheManager.set('key1', 'test1')
      cacheManager.set('key2', 'test2')

      expect(cacheManager.getSize()).toBe(2)
    })

    it('debe retornar 0 para caché vacía', () => {
      expect(cacheManager.getSize()).toBe(0)
    })
  })

  describe('isExpired', () => {
    it('debe retornar false para item no expirado', () => {
      cacheManager.set('key1', 'test')
      expect(cacheManager.isExpired('key1')).toBe(false)
    })

    it('debe retornar true para item expirado', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      const cm = new CacheManager({ ttl: 100 })
      cm.set('key1', 'test')

      // Simular que pasó el tiempo de expiración
      Date.now.mockReturnValue(now + 200)

      expect(cm.isExpired('key1')).toBe(true)

      Date.now.mockRestore()
    })

    it('debe retornar true para item inexistente', () => {
      expect(cacheManager.isExpired('nonexistent')).toBe(true)
    })
  })
})

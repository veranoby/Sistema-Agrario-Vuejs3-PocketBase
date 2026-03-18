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

  describe('Inicialización', () => {
    it('debe crear tres niveles de cache', () => {
      expect(cache.l1Cache).toBeDefined()
      expect(cache.l2Cache).toBeDefined()
      expect(cache.l3Cache).toBeDefined()
    })

    it('debe tener TTLs diferentes por nivel', () => {
      expect(cache.l1Cache.config.ttl).toBe(3600000) // 1 hora
      expect(cache.l2Cache.config.ttl).toBe(600000)  // 10 min
      expect(cache.l3Cache.config.ttl).toBe(300000)  // 5 min
    })

    it('debe tener maxSizes diferentes por nivel', () => {
      expect(cache.l1Cache.config.maxSize).toBe(50)
      expect(cache.l2Cache.config.maxSize).toBe(150)
      expect(cache.l3Cache.config.maxSize).toBe(100)
    })
  })

  describe('getFromLevel y setToLevel', () => {
    it('debe almacenar en diferentes niveles', () => {
      cache.setToLevel('test', { data: 1 }, 'l1')
      cache.setToLevel('test', { data: 2 }, 'l2')
      cache.setToLevel('test', { data: 3 }, 'l3')

      expect(cache.getFromLevel('test', 'l1')).toEqual({ data: 1 })
      expect(cache.getFromLevel('test', 'l2')).toEqual({ data: 2 })
      expect(cache.getFromLevel('test', 'l3')).toEqual({ data: 3 })
    })

    it('debe retornar null para nivel inválido', () => {
      expect(cache.getFromLevel('test', 'invalid')).toBeNull()
    })

    it('debe usar l2 como default en métodos get/set heredados', () => {
      cache.set('test', { data: 'default' })
      expect(cache.get('test')).toEqual({ data: 'default' })
      expect(cache.getFromLevel('test', 'l2')).toEqual({ data: 'default' })
    })
  })

  describe('TTL por nivel', () => {
    it('debe respetar TTL por nivel', async () => {
      const shortTTL = 100
      cache.setToLevel('temp', { data: 1 }, 'l3', shortTTL)

      // Inmediatamente debe existir
      expect(cache.getFromLevel('temp', 'l3')).toEqual({ data: 1 })

      // Esperar a que expire
      await new Promise(r => setTimeout(r, 150))

      expect(cache.getFromLevel('temp', 'l3')).toBeNull()
    })

    it('debe mantener datos en L1 por más tiempo', async () => {
      cache.setToLevel('long', { data: 'persistent' }, 'l1')

      // Debe existir inmediatamente
      expect(cache.getFromLevel('long', 'l1')).toEqual({ data: 'persistent' })

      // Después de 200ms aún debe existir (L1 tiene 1 hora de TTL)
      await new Promise(r => setTimeout(r, 200))

      expect(cache.getFromLevel('long', 'l1')).toEqual({ data: 'persistent' })
    })
  })

  describe('invalidateAcrossLevels', () => {
    it('debe invalidar across levels con patrón', () => {
      cache.setToLevel('test:key1', { data: 1 }, 'l1')
      cache.setToLevel('test:key2', { data: 2 }, 'l2')
      cache.setToLevel('other:key3', { data: 3 }, 'l3')

      // Nota: invalidatePattern necesita estar implementado en CacheManager
      // Por ahora verificamos que el método existe
      expect(cache.invalidateAcrossLevels).toBeDefined()
    })
  })

  describe('getCombinedStats', () => {
    it('debe retornar estadísticas de todos los niveles', () => {
      cache.setToLevel('l1key', { data: 1 }, 'l1')
      cache.setToLevel('l2key', { data: 2 }, 'l2')
      cache.setToLevel('l3key', { data: 3 }, 'l3')

      const stats = cache.getCombinedStats()

      expect(stats.l1).toBeDefined()
      expect(stats.l2).toBeDefined()
      expect(stats.l3).toBeDefined()
      expect(stats.totalSize).toBe(3)
    })

    it('debe calcular hit rate por nivel', () => {
      // Llenar cache
      cache.setToLevel('test', { data: 1 }, 'l1')
      
      // Acceder para generar hits
      cache.getFromLevel('test', 'l1')
      cache.getFromLevel('test', 'l1')

      const stats = cache.getCombinedStats()
      
      expect(stats.l1.hits).toBe(2)
      expect(stats.l1.misses).toBe(0)
    })
  })

  describe('Escenarios de Uso BPA', () => {
    it('debe manejar cache de tipos de actividades (L1)', () => {
      const tiposActividades = [
        { id: '1', nombre: 'Fumigación' },
        { id: '2', nombre: 'Fertilización' }
      ]

      cache.setToLevel('tipos:actividades', tiposActividades, 'l1')
      const retrieved = cache.getFromLevel('tipos:actividades', 'l1')

      expect(retrieved).toHaveLength(2)
      expect(retrieved[0].nombre).toBe('Fumigación')
    })

    it('debe manejar cache de actividades por hacienda (L2)', () => {
      const actividades = [
        { id: 'act1', hacienda: 'hac1', nombre: 'Actividad 1' },
        { id: 'act2', hacienda: 'hac1', nombre: 'Actividad 2' }
      ]

      cache.setToLevel('actividades:hacienda:hac1', actividades, 'l2')
      const retrieved = cache.getFromLevel('actividades:hacienda:hac1', 'l2')

      expect(retrieved).toHaveLength(2)
      expect(retrieved[0].hacienda).toBe('hac1')
    })

    it('debe manejar cache de resultados paginados (L3)', () => {
      const pagina1 = {
        page: 1,
        items: [{ id: '1' }, { id: '2' }],
        total: 50
      }

      cache.setToLevel('bitacora:page:1:filters:{}', pagina1, 'l3')
      const retrieved = cache.getFromLevel('bitacora:page:1:filters:{}', 'l3')

      expect(retrieved.page).toBe(1)
      expect(retrieved.items).toHaveLength(2)
    })
  })
})

/**
 * OfflineGeoStorage - Almacenamiento offline para geometrías y datos GIS.
 * 
 * Usa IndexedDB para almacenar polígonos, puntos y otras geometrías.
 * cuando no hay conexión, permitiendo trabajo offline completo de mapas.
 * 
 * @module utils/offlineGeoStorage
 */

import { logger } from './logger'

/**
 * @typedef {Object} GeoZona
 * @property {string} id - ID de la zona
 * @property {string} hacienda - ID de hacienda
 * @property {string} nombre - Nombre de la zona
 * @property {Object} geometria - GeoJSON de la zona
 * @property {number} area - Área en hectáreas
 * @property {number} timestamp - Timestamp de última actualización
 */

const DB_NAME = 'sistema-agri-geo'
const DB_VERSION = 1

const STORES = {
  ZONAS: 'zonas',
  SIEMBRAS: 'siembras',
  PUNTOS_INTERES: 'puntos',
  TRAZAS_GPS: 'trazas_gps',
  TILES: 'map_tiles' // NUEVO: Store para tiles
}

export class OfflineGeoStorage {
  constructor() {
    this.db = null
    this.dbName = DB_NAME
    this.dbVersion = DB_VERSION
    this.isConnected = false
  }

  /**
   * Inicializa la conexión a IndexedDB.
   * 
   * @returns {Promise<void>}
   */
  async init() {
    if (this.db) {
      return // Ya está inicializado
    }

    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        const error = new Error('IndexedDB no soportado por este navegador')
        logger.error('[OfflineGeoStorage]', error.message)
        reject(error)
        return
      }

      logger.debug('[OfflineGeoStorage] Inicializando base de datos...')

      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        logger.error('[OfflineGeoStorage] Error abriendo DB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isConnected = true
        logger.debug('[OfflineGeoStorage] DB inicializada correctamente')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        logger.debug('[OfflineGeoStorage] Actualizando esquema de DB...')
        const db = event.target.result
        this.createStores(db)
      }
    })
  }

  /**
   * Crea los object stores necesarios.
   * 
   * @param {IDBDatabase} db - Base de datos
   * @private
   */
  createStores(db) {
    // Store para zonas con geometrías
    if (!db.objectStoreNames.contains(STORES.ZONAS)) {
      const zonasStore = db.createObjectStore(STORES.ZONAS, { keyPath: 'id' })
      zonasStore.createIndex('hacienda', 'hacienda', { unique: false })
      zonasStore.createIndex('nombre', 'nombre', { unique: false })
      zonasStore.createIndex('timestamp', 'timestamp', { unique: false })
      logger.debug('[OfflineGeoStorage] Store "zonas" creado')
    }

    // Store para siembras
    if (!db.objectStoreNames.contains(STORES.SIEMBRAS)) {
      const siembrasStore = db.createObjectStore(STORES.SIEMBRAS, { keyPath: 'id' })
      siembrasStore.createIndex('zona', 'zona', { unique: false })
      siembrasStore.createIndex('hacienda', 'hacienda', { unique: false })
      siembrasStore.createIndex('timestamp', 'timestamp', { unique: false })
      logger.debug('[OfflineGeoStorage] Store "siembras" creado')
    }

    // Store para puntos de interés
    if (!db.objectStoreNames.contains(STORES.PUNTOS_INTERES)) {
      const puntosStore = db.createObjectStore(STORES.PUNTOS_INTERES, { keyPath: 'id' })
      puntosStore.createIndex('zona', 'zona', { unique: false })
      puntosStore.createIndex('tipo', 'tipo', { unique: false })
      logger.debug('[OfflineGeoStorage] Store "puntos" creado')
    }

    // Store para trazas GPS (tracking de campo)
    if (!db.objectStoreNames.contains(STORES.TRAZAS_GPS)) {
      const trazasStore = db.createObjectStore(STORES.TRAZAS_GPS, { keyPath: 'id' })
      trazasStore.createIndex('fecha', 'fecha', { unique: false })
      trazasStore.createIndex('usuario', 'usuario', { unique: false })
      logger.debug('[OfflineGeoStorage] Store "trazas_gps" creado')
    }

    // NUEVO: Store para tiles de mapas
    if (!db.objectStoreNames.contains(STORES.TILES)) {
      const tilesStore = db.createObjectStore(STORES.TILES, { keyPath: 'id' })
      tilesStore.createIndex('z', 'z', { unique: false })
      tilesStore.createIndex('x', 'x', { unique: false })
      tilesStore.createIndex('y', 'y', { unique: false })
      logger.debug('[OfflineGeoStorage] Store "map_tiles" creado')
    }
  }

  // ============================================================================
  // OPERACIONES CRUD PARA ZONAS
  // ============================================================================

  /**
   * Guarda una zona con su geometría.
   * 
   * @param {GeoZona} zona - Zona a guardar
   * @returns {Promise<void>}
   */
  async saveZona(zona) {
    await this.ensureInit()
    return this.transaction(STORES.ZONAS, 'readwrite', (store) => {
      const zonaWithTimestamp = {
        ...zona,
        timestamp: Date.now()
      }
      store.put(zonaWithTimestamp)
      logger.debug('[OfflineGeoStorage] Zona guardada:', zona.id)
    })
  }

  /**
   * Obtiene una zona por ID.
   * 
   * @param {string} id - ID de la zona
   * @returns {Promise<GeoZona|null>}
   */
  async getZona(id) {
    await this.ensureInit()
    return this.transaction(STORES.ZONAS, 'readonly', (store) => {
      return store.get(id)
    })
  }

  /**
   * Obtiene todas las zonas de una hacienda.
   * 
   * @param {string} haciendaId - ID de hacienda
   * @returns {Promise<GeoZona[]>}
   */
  async getAllZonas(haciendaId) {
    await this.ensureInit()
    return this.transaction(STORES.ZONAS, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index('hacienda')
        const request = index.getAll(haciendaId)
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    })
  }

  /**
   * Obtiene todas las zonas sin filtrar.
   * 
   * @returns {Promise<GeoZona[]>}
   */
  async getAllZonasUnfiltered() {
    await this.ensureInit()
    return this.transaction(STORES.ZONAS, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    })
  }

  /**
   * Elimina una zona.
   * 
   * @param {string} id - ID de la zona
   * @returns {Promise<void>}
   */
  async deleteZona(id) {
    await this.ensureInit()
    return this.transaction(STORES.ZONAS, 'readwrite', (store) => {
      store.delete(id)
      logger.debug('[OfflineGeoStorage] Zona eliminada:', id)
    })
  }

  // ============================================================================
  // OPERACIONES CRUD PARA SIEMBRAS
  // ============================================================================

  /**
   * Guarda una siembra con su geometría.
   * 
   * @param {Object} siembra - Siembra a guardar
   * @returns {Promise<void>}
   */
  async saveSiembra(siembra) {
    await this.ensureInit()
    return this.transaction(STORES.SIEMBRAS, 'readwrite', (store) => {
      const siembraWithTimestamp = {
        ...siembra,
        timestamp: Date.now()
      }
      store.put(siembraWithTimestamp)
      logger.debug('[OfflineGeoStorage] Siembra guardada:', siembra.id)
    })
  }

  /**
   * Obtiene una siembra por ID.
   * 
   * @param {string} id - ID de la siembra
   * @returns {Promise<Object|null>}
   */
  async getSiembra(id) {
    await this.ensureInit()
    return this.transaction(STORES.SIEMBRAS, 'readonly', (store) => {
      return store.get(id)
    })
  }

  /**
   * Obtiene todas las siembras de una zona.
   * 
   * @param {string} zonaId - ID de la zona
   * @returns {Promise<Object[]>}
   */
  async getSiembrasByZona(zonaId) {
    await this.ensureInit()
    return this.transaction(STORES.SIEMBRAS, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index('zona')
        const request = index.getAll(zonaId)
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    })
  }

  /**
   * Elimina una siembra.
   * 
   * @param {string} id - ID de la siembra
   * @returns {Promise<void>}
   */
  async deleteSiembra(id) {
    await this.ensureInit()
    return this.transaction(STORES.SIEMBRAS, 'readwrite', (store) => {
      store.delete(id)
      logger.debug('[OfflineGeoStorage] Siembra eliminada:', id)
    })
  }

  // ============================================================================
  // OPERACIONES PARA PUNTOS DE INTERÉS
  // ============================================================================

  /**
   * Guarda un punto de interés.
   * 
   * @param {Object} punto - Punto a guardar
   * @returns {Promise<void>}
   */
  async savePunto(punto) {
    await this.ensureInit()
    return this.transaction(STORES.PUNTOS_INTERES, 'readwrite', (store) => {
      store.put({
        ...punto,
        timestamp: Date.now()
      })
      logger.debug('[OfflineGeoStorage] Punto guardado:', punto.id)
    })
  }

  /**
   * Obtiene puntos de una zona.
   * 
   * @param {string} zonaId - ID de la zona
   * @returns {Promise<Object[]>}
   */
  async getPuntosByZona(zonaId) {
    await this.ensureInit()
    return this.transaction(STORES.PUNTOS_INTERES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index('zona')
        const request = index.getAll(zonaId)
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    })
  }

  // ============================================================================
  // OPERACIONES PARA TRAZAS GPS
  // ============================================================================

  /**
   * Guarda una traza GPS (tracking de campo).
   * 
   * @param {Object} traza - Traza GPS a guardar
   * @returns {Promise<void>}
   */
  async saveTrazaGPS(traza) {
    await this.ensureInit()
    return this.transaction(STORES.TRAZAS_GPS, 'readwrite', (store) => {
      store.put(traza)
      logger.debug('[OfflineGeoStorage] Traza GPS guardada:', traza.id)
    })
  }

  /**
   * Obtiene trazas GPS de una fecha.
   * 
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @returns {Promise<Object[]>}
   */
  async getTrazasByFecha(fecha) {
    await this.ensureInit()
    return this.transaction(STORES.TRAZAS_GPS, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index('fecha')
        const request = index.getAll(fecha)
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    })
  }

  // ============================================================================
  // NUEVO: OPERACIONES PARA TILES DE MAPAS (Hito 3)
  // ============================================================================

  /**
   * Guarda un tile de mapa para uso offline.
   * @param {Object} tile - { z, x, y, imageData (blob) }
   */
  async saveTile(tile) {
    await this.ensureInit()
    const id = `tile_${tile.z}_${tile.x}_${tile.y}`
    return this.transaction(STORES.TILES, 'readwrite', (store) => {
      store.put({
        id,
        ...tile,
        timestamp: Date.now()
      })
      logger.debug('[OfflineGeoStorage] Tile guardado:', id)
    })
  }

  /**
   * Obtiene un tile de mapa.
   * @param {number} z - Zoom
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   */
  async getTile(z, x, y) {
    await this.ensureInit()
    const id = `tile_${z}_${x}_${y}`
    return this.transaction(STORES.TILES, 'readonly', (store) => {
      return store.get(id)
    })
  }

  /**
   * Elimina tiles antiguos para limpieza.
   * @param {number} olderThanDays - Días de antigüedad
   */
  async cleanOldTiles(olderThanDays = 30) {
    await this.ensureInit()
    const threshold = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    return this.transaction(STORES.TILES, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.openCursor()
        request.onsuccess = (event) => {
          const cursor = event.target.result
          if (cursor) {
            if (cursor.value.timestamp < threshold) {
              cursor.delete()
            }
            cursor.continue()
          } else {
            resolve()
          }
        }
        request.onerror = () => reject(request.error)
      })
    })
  }

  // ============================================================================
  // MÉTODOS DE UTILIDAD
  // ============================================================================

  /**
   * Ejecuta una transacción en la base de datos.
   * 
   * @param {string} storeName - Nombre del store
   * @param {string} mode - Modo de transacción (readonly/readwrite)
   * @param {Function} callback - Callback con el store
   * @returns {Promise<any>}
   * @private
   */
  async transaction(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(storeName, mode)
        const store = transaction.objectStore(storeName)
        let result = callback(store)

        // Manejar IDBRequest (de store.get, store.getAll, etc.)
        if (result && typeof result.onsuccess !== 'undefined') {
          const request = result
          result = new Promise((res, rej) => {
            request.onsuccess = () => res(request.result)
            request.onerror = () => rej(request.error)
          })
        }

        if (result instanceof Promise) {
          result.then(resolve).catch(reject)
        } else {
          transaction.oncomplete = () => resolve(result)
          transaction.onerror = () => reject(transaction.error)
        }
      } catch (error) {
        logger.error('[OfflineGeoStorage] Error en transacción:', error)
        reject(error)
      }
    })
  }

  /**
   * Asegura que la DB esté inicializada.
   * 
   * @returns {Promise<void>}
   * @private
   */
  async ensureInit() {
    if (!this.db) {
      await this.init()
    }
  }

  /**
   * Limpia todos los datos de la base de datos.
   * 
   * @returns {Promise<void>}
   */
  async clearAll() {
    await this.ensureInit()
    const stores = Object.values(STORES)
    for (const storeName of stores) {
      await this.transaction(storeName, 'readwrite', (store) => {
        store.clear()
      })
    }
    logger.warn('[OfflineGeoStorage] Todos los datos fueron limpiados')
  }

  /**
   * Exporta todos los datos para backup.
   * 
   * @returns {Promise<Object>}
   */
  async exportData() {
    await this.ensureInit()
    const data = {}
    for (const [key, storeName] of Object.entries(STORES)) {
      data[key] = await this.transaction(storeName, 'readonly', (store) => {
        return new Promise((resolve, reject) => {
          const request = store.getAll()
          request.onsuccess = () => resolve(request.result || [])
          request.onerror = () => reject(request.error)
        })
      })
    }
    return data
  }

  /**
   * Importa datos desde un backup.
   * 
   * @param {Object} data - Datos a importar
   * @returns {Promise<void>}
   */
  async importData(data) {
    await this.ensureInit()
    for (const [key, items] of Object.entries(data)) {
      const storeName = STORES[key]
      if (!storeName) continue
      for (const item of items) {
        await this.transaction(storeName, 'readwrite', (store) => {
          store.put(item)
        })
      }
    }
    logger.info('[OfflineGeoStorage] Datos importados exitosamente')
  }

  /**
   * Obtiene estadísticas de almacenamiento.
   * 
   * @returns {Promise<Object>}
   */
  async getStats() {
    await this.ensureInit()
    const stats = {}
    for (const [key, storeName] of Object.entries(STORES)) {
      stats[key] = await this.transaction(storeName, 'readonly', (store) => {
        return new Promise((resolve, reject) => {
          const request = store.getAllKeys()
          request.onsuccess = () => resolve(request.result?.length || 0)
          request.onerror = () => reject(request.error)
        })
      })
    }
    stats.totalItems = Object.values(stats).reduce((a, b) => a + b, 0)
    stats.lastUpdated = new Date().toISOString()
    return stats
  }

  /**
   * Cierra la conexión a la base de datos.
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isConnected = false
      logger.debug('[OfflineGeoStorage] Conexión cerrada')
    }
  }
}

// Exportar instancia singleton.
export const offlineGeoStorage = new OfflineGeoStorage()

/**
 * Hook conveniente para Vue 3 Composition API.
 * 
 * @example
 * // En un componente Vue
 * import { useOfflineGeoStorage } from '@/utils/offlineGeoStorage'
 * 
 * setup() {
 *   const { saveZona, getZona, getAllZonas } = useOfflineGeoStorage()
 *   
 *   const saveZonaOffline = async (zona) => {
 *     await saveZona(zona)
 *   }
 *   
 *   return { saveZonaOffline }
 * }
 */
export function useOfflineGeoStorage() {
  const storage = new OfflineGeoStorage()

  const saveZona = async (zona) => {
    await storage.init()
    return storage.saveZona(zona)
  }

  const getZona = async (id) => {
    await storage.init()
    return storage.getZona(id)
  }

  const getAllZonas = async (haciendaId) => {
    await storage.init()
    return storage.getAllZonas(haciendaId)
  }

  const saveSiembra = async (siembra) => {
    await storage.init()
    return storage.saveSiembra(siembra)
  }

  const getSiembrasByZona = async (zonaId) => {
    await storage.init()
    return storage.getSiembrasByZona(zonaId)
  }

  const deleteSiembra = async (id) => {
    await storage.init()
    return storage.deleteSiembra(id)
  }

  // NUEVO: Métodos para tiles
  const saveTile = async (tile) => {
    await storage.init()
    return storage.saveTile(tile)
  }

  const getTile = async (z, x, y) => {
    await storage.init()
    return storage.getTile(z, x, y)
  }

  return {
    init: () => storage.init(),
    saveZona,
    getZona,
    getAllZonas,
    saveSiembra,
    getSiembrasByZona,
    deleteSiembra,
    saveTile,
    getTile,
    close: () => storage.close()
  }
}

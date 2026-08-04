/**
 * IndexedDB Storage Wrapper
 * Utilizado para migrar caché de localStorage a IndexedDB (Hito 2: Offline-First)
 */

export class IndexedDBStorage {
  constructor(dbName = 'agriSyncDB', storeName = 'syncCache') {
    this.dbName = dbName
    this.storeName = storeName
    this.db = null
    this.initPromise = null
    this.useFallback = false // Flag para usar localStorage si IndexedDB falla
  }

  async init() {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
      // Verificar si IndexedDB está disponible
      if (!('indexedDB' in window)) {
        this.useFallback = true
        console.warn('[IndexedDBStorage] IndexedDB no disponible, usando localStorage')
        resolve()
        return
      }

      const request = indexedDB.open(this.dbName, 1)
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName)
        }
      }
      
      request.onsuccess = (e) => {
        this.db = e.target.result
        resolve()
      }
      
      request.onerror = (e) => {
        console.error('[IndexedDBStorage] Error abriendo DB:', e.target.error)
        this.useFallback = true
        resolve() // Resolve even on error, usaremos fallback
      }
    })
    
    return this.initPromise
  }

  async getItem(key) {
    await this.init()
    
    // Fallback a localStorage si IndexedDB falló
    if (this.useFallback) {
      const item = localStorage.getItem(`idb_fallback_${key}`)
      return item ? JSON.parse(item) : null
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readonly')
        const store = tx.objectStore(this.storeName)
        const request = store.get(key)
        
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => {
          console.error('[IndexedDBStorage] Error en getItem:', request.error, 'key:', key)
          // Intentar fallback
          const item = localStorage.getItem(`idb_fallback_${key}`)
          resolve(item ? JSON.parse(item) : null)
        }
      } catch (error) {
        console.error('[IndexedDBStorage] Error en getItem (catch):', error, 'key:', key)
        const item = localStorage.getItem(`idb_fallback_${key}`)
        resolve(item ? JSON.parse(item) : null)
      }
    })
  }

  async setItem(key, value) {
    await this.init()
    
    // Fallback a localStorage si IndexedDB falló
    if (this.useFallback) {
      try {
        localStorage.setItem(`idb_fallback_${key}`, JSON.stringify(value))
        return
      } catch (e) {
        console.error('[IndexedDBStorage] Error en fallback localStorage:', e)
        return
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        // CORRECCIÓN: Sanitizar valor para evitar DataCloneError
        const sanitizedValue = JSON.parse(JSON.stringify(value))
        const request = store.put(sanitizedValue, key)
        
        request.onsuccess = () => resolve()
        request.onerror = () => {
          console.error('[IndexedDBStorage] Error en setItem:', request.error, 'key:', key)
          // Intentar fallback a localStorage
          try {
            localStorage.setItem(`idb_fallback_${key}`, JSON.stringify(sanitizedValue))
            this.useFallback = true
          } catch (e) {
            console.error('[IndexedDBStorage] Fallback a localStorage también falló:', e)
          }
          resolve() // Resolve para no romper la promesa
        }
      } catch (error) {
        console.error('[IndexedDBStorage] Error en setItem (catch):', error, 'key:', key)
        // Intentar fallback
        try {
          const sanitizedValue = JSON.parse(JSON.stringify(value))
          localStorage.setItem(`idb_fallback_${key}`, JSON.stringify(sanitizedValue))
          this.useFallback = true
        } catch (e) {
          console.error('[IndexedDBStorage] Fallback a localStorage también falló:', e)
        }
        resolve()
      }
    })
  }

  async removeItem(key) {
    await this.init()
    
    if (this.useFallback) {
      localStorage.removeItem(`idb_fallback_${key}`)
      return
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.delete(key)
        
        request.onsuccess = () => resolve()
        request.onerror = () => {
          console.error('[IndexedDBStorage] Error en removeItem:', request.error, 'key:', key)
          localStorage.removeItem(`idb_fallback_${key}`)
          resolve()
        }
      } catch (error) {
        console.error('[IndexedDBStorage] Error en removeItem (catch):', error, 'key:', key)
        localStorage.removeItem(`idb_fallback_${key}`)
        resolve()
      }
    })
  }

  async clear() {
    await this.init()
    
    if (this.useFallback) {
      // Limpiar solo las claves con prefijo
      Object.keys(localStorage)
        .filter(k => k.startsWith(`idb_fallback_`))
        .forEach(k => localStorage.removeItem(k))
      return
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.clear()
        
        request.onsuccess = () => resolve()
        request.onerror = () => {
          console.error('[IndexedDBStorage] Error en clear:', request.error)
          reject(request.error)
        }
      } catch (error) {
        console.error('[IndexedDBStorage] Error en clear (catch):', error)
        reject(error)
      }
    })
  }
}

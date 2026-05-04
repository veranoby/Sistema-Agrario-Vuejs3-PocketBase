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
  }

  async init() {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise((resolve, reject) => {
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
        console.error('[IndexedDBStorage] Error:', e.target.error)
        reject(e.target.error)
      }
    })
    
    return this.initPromise
  }

  async getItem(key) {
    await this.init()
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readonly')
        const store = tx.objectStore(this.storeName)
        const request = store.get(key)
        
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async setItem(key, value) {
    await this.init()
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.put(value, key)
        
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async removeItem(key) {
    await this.init()
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.delete(key)
        
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }

  async clear() {
    await this.init()
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(this.storeName, 'readwrite')
        const store = tx.objectStore(this.storeName)
        const request = store.clear()
        
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      } catch (error) {
        reject(error)
      }
    })
  }
}

import { defineStore } from 'pinia'
import { SyncQueue } from '@/utils/syncQueue'
import { useSnackbarStore } from './snackbarStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
// Assume these stores will be created later
import { useProgramacionesStore } from '@/stores/programacionesStore' 
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { useAuthStore } from '@/stores/authStore'
import { pb } from '@/utils/pocketbase'
import { debounce } from 'lodash'

export const useSyncStore = defineStore('sync', {
  state: () => ({
    isOnline: navigator.onLine,
    queue: new SyncQueue(),
    lastSyncTime: null,
    syncStatus: 'idle',
    errors: [],
    initialized: false,
    syncInProgress: false,
    // Mapeo de IDs temporales a reales
    tempToRealIdMap: {},
    debouncedHandleVisibilityChange: null
  }),

  actions: {
    getStoreByCollectionName(collectionName) {
      const storeMap = {
        zonas: useZonasStore,
        siembras: useSiembrasStore,
        actividades: useActividadesStore,
        recordatorios: useRecordatoriosStore,
        programaciones: useProgramacionesStore, // Assumed to be created
        bitacora: useBitacoraStore // Assumed to be created
        // ... add other stores as needed
      }
      const storeGetter = storeMap[collectionName]
      return storeGetter ? storeGetter() : null
    },

    async init() {
      if (this.initialized) return

      try {
        // Limpiar listeners previos para evitar duplicados
        window.removeEventListener('online', this.handleOnline)
        window.removeEventListener('offline', this.handleOffline)

        // Añadir listeners con bind para mantener el contexto
        window.addEventListener('online', this.handleOnline.bind(this))
        window.addEventListener('offline', this.handleOffline.bind(this))

        // Cargar cola guardada antes de intentar restaurar sesión
        const savedQueue = this.loadFromLocalStorage('syncQueue')
        if (savedQueue) {
          this.queue.queue = savedQueue
        }

        // Intentar restaurar la sesión solo al inicio si es necesario
        const authStore = useAuthStore(); // Ensure authStore is imported/available
        if (!pb.authStore.isValid) {
          await authStore.ensureAuthInitialized();
        }

        this.initialized = true

        // Verificar si hay operaciones pendientes y estamos online
        if (navigator.onLine && this.queue.queue.length > 0) {
          console.log('Procesando cola pendiente al inicializar')
          await this.processPendingQueue()
        }
      } catch (error) {
        this.handleSyncError(error, 'Error inicializando syncStore')
      }
    },

    async handleOnline() {
      console.log('Conexión restaurada, verificando cola pendiente')
      this.isOnline = true

      // Intentar restaurar la sesión antes de procesar la cola
      const authStore = useAuthStore(); // Ensure authStore is imported/available
      await authStore.ensureAuthInitialized();

      // Notificar al usuario
      useSnackbarStore().showSnackbar('Conexión restaurada, sincronizando datos...', 'info')

      // Procesar cola pendiente si hay elementos
      if (this.queue.queue.length > 0) {
        await this.processPendingQueue()
        // Refrescar los stores después de procesar la cola
        this.refreshAllStores()
      }
    },

    handleOffline() {
      this.isOnline = false
      useSnackbarStore().showSnackbar(
        'Modo sin conexión activado. Los cambios se sincronizarán cuando vuelva la conexión.',
        'warning'
      )
    },

    async queueOperation(operation) {
      try {
        // Validar operación
        if (!operation.type || !operation.collection) {
          throw new Error('Operación inválida: debe tener tipo y colección')
        }

        // Para creaciones, asegurar que tenga un ID temporal
        if (operation.type === 'create' && !operation.data?.id) {
          operation.data = operation.data || {}
          operation.data.id = this.generateConsistentTempId(operation.collection)
        }

        // Añadir a la cola con el userId actual
        const authStore = useAuthStore()
        const currentUserId = authStore.user?.id

        // Incluir el userId en la operación
        operation.userId = currentUserId || null

        const tempId = await this.queue.add(operation)
        this.persistQueueState()

        // Si estamos online, procesar inmediatamente
        if (this.isOnline && !this.syncInProgress) {
          await this.processPendingQueue()
        }

        return tempId
      } catch (error) {
        this.handleSyncError(error, 'Error encolando operación')
        return null
      }
    },

    async processPendingQueue() {
      // Evitar procesamiento simultáneo
      if (this.syncStatus === 'syncing' || this.syncInProgress) {
        console.log('Ya hay una sincronización en progreso, saltando...')
        return
      }

      this.syncStatus = 'syncing'
      this.syncInProgress = true

      try {
        // Verificar conexión
        if (!navigator.onLine) {
          throw new Error('No hay conexión a internet')
        }

        // Procesar cola
        const syncResults = await this.queue.process()

        if (!syncResults || typeof syncResults !== 'object') {
          console.error('processPendingQueue: syncResults no es válido o está indefinido.')
          // No lanzar error aquí para permitir que el finally se ejecute, 
          // pero sí registrarlo y evitar procesamiento adicional.
          this.handleSyncError(new Error('Resultados de sincronización inválidos.'), 'Error procesando cola de sincronización')
        } else {
          const { createdItems, updatedItems, deletedItems } = syncResults

          // Process Created Items
          if (createdItems && createdItems.length > 0) {
            for (const item of createdItems) {
              try {
                const collectionName = item.realItem.collectionName || item.realItem['@collectionName']
                if (!collectionName) {
                  console.warn('processPendingQueue: No se pudo determinar collectionName para el item creado:', item)
                  continue
                }
                const targetStore = this.getStoreByCollectionName(collectionName)
                if (targetStore && typeof targetStore.applySyncedCreate === 'function') {
                  await targetStore.applySyncedCreate(item.tempId, item.realItem)
                  // updateCrossStoreReferences se llama aquí para asegurar que el ID real está disponible
                  await this.updateCrossStoreReferences(item.tempId, item.realItem.id)
                } else {
                  console.warn(
                    `processPendingQueue: Store o método applySyncedCreate no encontrado para la colección '${collectionName}'.`
                  )
                }
              } catch (e) {
                console.error(`processPendingQueue: Error procesando item creado: ${item.tempId}`, e)
                this.handleSyncError(e, `Error procesando creación para ${item.tempId}`)
              }
            }
          }

          // Process Updated Items
          if (updatedItems && updatedItems.length > 0) {
            for (const item of updatedItems) {
              try {
                const collectionName = item.collection
                if (!collectionName) {
                  console.warn('processPendingQueue: No se pudo determinar collectionName para el item actualizado:', item)
                  continue
                }
                const targetStore = this.getStoreByCollectionName(collectionName)
                if (targetStore && typeof targetStore.applySyncedUpdate === 'function') {
                  await targetStore.applySyncedUpdate(item.id, item.updatedItem)
                } else {
                  console.warn(
                    `processPendingQueue: Store o método applySyncedUpdate no encontrado para la colección '${collectionName}'.`
                  )
                }
              } catch (e) {
                console.error(`processPendingQueue: Error procesando item actualizado: ${item.id}`, e)
                this.handleSyncError(e, `Error procesando actualización para ${item.id}`)
              }
            }
          }

          // Process Deleted Items
          if (deletedItems && deletedItems.length > 0) {
            for (const item of deletedItems) {
              try {
                const collectionName = item.collection
                if (!collectionName) {
                  console.warn('processPendingQueue: No se pudo determinar collectionName para el item eliminado:', item)
                  continue
                }
                const targetStore = this.getStoreByCollectionName(collectionName)
                if (targetStore && typeof targetStore.applySyncedDelete === 'function') {
                  await targetStore.applySyncedDelete(item.id)
                } else {
                  console.warn(
                    `processPendingQueue: Store o método applySyncedDelete no encontrado para la colección '${collectionName}'.`
                  )
                }
              } catch (e) {
                console.error(`processPendingQueue: Error procesando item eliminado: ${item.id}`, e)
                this.handleSyncError(e, `Error procesando eliminación para ${item.id}`)
              }
            }
          }
          this.lastSyncTime = Date.now()
          this.persistQueueState() // Persist after all items are processed
          useSnackbarStore().showSnackbar('Sincronización completada', 'success')
        }
      } catch (error) {
        // Este catch maneja errores del this.queue.process() si lanza una excepción
        // o errores no capturados dentro del bloque 'else'
        this.handleSyncError(error, 'Error procesando cola de sincronización')
      } finally {
        this.syncStatus = 'idle'
        this.syncInProgress = false
      }
    },

    // Método genérico para actualizar un elemento local
    updateLocalItem(collection, tempId, newItem, items) { // options parameter removed
      if (!tempId || !newItem || !newItem.id) {
        console.error('Datos insuficientes para actualizar elemento local', { tempId, newItem })
        return false
      }

      console.log(`Actualizando elemento local en ${collection}: ${tempId} -> ${newItem.id}`)

      // 1. Buscar el elemento por ID exacto
      let index = items.findIndex((item) => item.id === tempId)

      // 2. Si no se encuentra, buscar por timestamp similar en IDs temporales
      if (index === -1) {
        const tempTimestamp = this.queue.extractTempIdInfo(tempId)?.timestamp

        if (tempTimestamp) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (typeof item.id === 'string' && item.id.startsWith('temp_')) {
              const itemTimestamp = this.queue.extractTempIdInfo(item.id)?.timestamp

              if (itemTimestamp && Math.abs(itemTimestamp - tempTimestamp) < 5000) {
                index = i
                console.log(`Encontrada coincidencia por timestamp para ${tempId} -> ${item.id}`)
                break
              }
            }
          }
        }
      }

      // 3. Si aún no se encuentra, agregar como nuevo elemento
      if (index === -1) {
        console.log(
          `No se encontró elemento con ID ${tempId}, agregando como nuevo elemento con ID ${newItem.id}`
        )
        items.push({
          ...newItem,
          _isTemp: false
        })

        // Guardar mapeado de ID para futuras referencias
        this.queue.tempToRealIdMap[tempId] = newItem.id
        this.queue.saveTempToRealIdMap()

        // Actualizar localStorage
        this.saveToLocalStorage(collection, items)

        // Importante: actualizar referencias cruzadas
        this.updateCrossStoreReferences(tempId, newItem.id)
        return true
      }

      // 4. Si se encontró, actualizar el elemento
      const oldId = items[index].id

      // Mantener propiedades locales importantes que no vienen del servidor
      const updatedItem = {
        ...items[index],
        ...newItem,
        _isTemp: false
      }

      items[index] = updatedItem
      console.log(`Elemento actualizado en ${collection}: ${oldId} -> ${newItem.id}`)

      // 5. Actualizar mapeo de IDs si es necesario
      if (oldId.startsWith('temp_') && oldId !== newItem.id) {
        this.queue.tempToRealIdMap[oldId] = newItem.id
        this.queue.saveTempToRealIdMap()

        // Actualizar referencias en este store
        this.updateAllReferencesInStore(collection, oldId, newItem.id, items)

        // Actualizar referencias cruzadas
        this.updateCrossStoreReferences(oldId, newItem.id)
      }

      // 6. Actualizar localStorage
      this.saveToLocalStorage(collection, items)
      return true
    },

    // Nuevo método para actualizar todas las referencias en un store
    updateAllReferencesInStore(collection, oldId, newId, items) {
      if (!oldId || !newId || oldId === newId) return 0

      console.log(`Actualizando todas las referencias en ${collection} de ${oldId} a ${newId}`)
      let updatedCount = 0

      // Todos los posibles campos que podrían contener referencias
      const possibleRefFields = [
        'id',
        'siembra',
        'siembras',
        'zona',
        'zonas',
        'actividad',
        'actividades',
        'parent',
        'children',
        'relacionados',
        'recordatorio',
        'recordatorios'
      ]

      // Recorrer todos los elementos
      items.forEach((item) => {
        // Revisar cada propiedad del elemento
        Object.keys(item).forEach((key) => {
          const value = item[key]

          // Si es un array, buscar el oldId
          if (Array.isArray(value)) {
            let updated = false
            for (let i = 0; i < value.length; i++) {
              if (value[i] === oldId) {
                value[i] = newId
                updated = true
                updatedCount++
              }
            }
            if (updated) {
              console.log(`Actualizada referencia en array ${key} de ${item.id}`)
            }
          }
          // Si es una cadena y coincide con oldId
          else if (typeof value === 'string' && value === oldId) {
            item[key] = newId
            updatedCount++
            console.log(`Actualizada referencia en campo ${key} de ${item.id}`)
          }
        })
      })

      console.log(`Se actualizaron ${updatedCount} referencias en ${collection}`)
      return updatedCount
    },

    // Método genérico para actualizar referencias
    updateReferencesToItem(collection, tempId, realId, items, referenceFields) {
      if (!tempId || !realId) return 0

      let updatedCount = 0

      items.forEach((item) => {
        referenceFields.forEach((field) => {
          if (item[field]) {
            if (Array.isArray(item[field])) {
              // Actualizar en arrays
              item[field] = item[field].map((id) => {
                if (id === tempId || this.isRelatedTempId(id, tempId)) {
                  updatedCount++
                  return realId
                }
                return id
              })
            } else if (item[field] === tempId || this.isRelatedTempId(item[field], tempId)) {
              // Actualizar en campo simple
              item[field] = realId
              updatedCount++
            }
          }
        })
      })

      console.log(
        `Actualizadas ${updatedCount} referencias en ${collection} para ${tempId} -> ${realId}`
      )
      return updatedCount
    },

    // Método genérico para eliminar un elemento local
    removeLocalItem(collection, id, items) {
      if (!id) return false

      const initialLength = items.length
      items = items.filter((item) => item.id !== id)

      if (items.length < initialLength) {
        this.saveToLocalStorage(collection, items)
        return true
      }

      return false
    },

    // Método para verificar si dos IDs temporales están relacionados
    isRelatedTempId(id1, id2) {
      if (!id1 || !id2 || typeof id1 !== 'string' || typeof id2 !== 'string') return false
      if (!id1.startsWith('temp_') || !id2.startsWith('temp_')) return false

      // Delegar al método de la cola de sincronización para mantener consistencia
      const info1 = this.queue.extractTempIdInfo(id1)
      const info2 = this.queue.extractTempIdInfo(id2)

      return this.queue.areRelatedTempIds(info1, info2)
    },

    // Método auxiliar para normalizar nombres de colección
    normalizeCollectionName(prefix) {
      if (!prefix) return ''

      // Simplemente devolver el nombre de la colección en minúsculas
      // para asegurar consistencia
      return prefix.toLowerCase()
    },

    // Método para generar IDs temporales consistentes
    generateConsistentTempId(collection) {
      // Ya no usamos el nombre de la colección para los IDs temporales
      return this.queue.generateConsistentTempId()
    },

    // Helpers unificados
    persistQueueState() {
      this.saveToLocalStorage('syncQueue', this.queue.queue)
      this.queue.saveTempToRealIdMap()
    },

    handleSyncError(error, message) {
      console.error(message, error)
      this.errors.push({
        message: error.message,
        timestamp: Date.now(),
        context: message
      })

      // Limitar el número de errores almacenados
      if (this.errors.length > 50) {
        this.errors = this.errors.slice(-50)
      }

      useSnackbarStore().showSnackbar(`${message}: ${error.message}`, 'error')
    },

    // Métodos para localStorage
    loadFromLocalStorage(key) {
      try {
        const data = localStorage.getItem(key)
        return data ? JSON.parse(data) : null
      } catch (error) {
        this.handleSyncError(error, `Error cargando ${key} de localStorage`)
        return null
      }
    },

    saveToLocalStorage(key, value) { // persistent parameter removed
      try {
        // Siempre utilizar localStorage por defecto para evitar problemas de sincronización
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        this.handleSyncError(error, `Error guardando ${key} en localStorage`)
      }
    },

    removeFromLocalStorage(key) {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        this.handleSyncError(error, `Error eliminando ${key} de localStorage`)
      }
    },

    // Método público para generación de IDs temporales
    generateTempId() {
      // Ya no usamos el nombre de la colección para los IDs temporales
      return this.queue.generateConsistentTempId()
    },

    // Método para limpiar mapeos antiguos
    cleanupOldData() {
      try {
        this.queue.cleanupOldMappings()

        // Limpiar errores antiguos
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        this.errors = this.errors.filter((err) => err.timestamp > oneDayAgo)
      } catch (error) {
        console.error('Error limpiando datos antiguos:', error)
      }
    },

    // Método para actualizar todas las referencias entre stores
    async updateCrossStoreReferences(tempId, realId) {
      if (!tempId || !realId) return

      console.log(`Actualizando referencias entre stores: ${tempId} -> ${realId}`)

      const storeGetters = [
        useZonasStore,
        useSiembrasStore,
        useActividadesStore,
        useRecordatoriosStore,
        useProgramacionesStore, // Assumed
        useBitacoraStore // Assumed
      ];

      for (const useStore of storeGetters) {
        try {
          const store = useStore();
          // Determine collectionName from store ID or a specific property if available
          const collectionName = store.$id || store.collectionName || 'unknown_collection'; 
          
          let itemsKey = null;
          if (store[collectionName] && Array.isArray(store[collectionName])) { // e.g. zonasStore.zonas
             itemsKey = collectionName;
          } else if (store.items && Array.isArray(store.items)) { // a generic 'items' array
             itemsKey = 'items';
          } else {
            // Attempt to find a plausible items array by inspecting the store's state
            const stateKeys = Object.keys(store.$state || {});
            for (const key of stateKeys) {
              if (Array.isArray(store[key]) && store[key].length > 0 && typeof store[key][0] === 'object' && 'id' in store[key][0]) {
                itemsKey = key;
                break;
              } else if (Array.isArray(store[key]) && store[key].length === 0) { // Store empty array, potentially the one
                itemsKey = key;
                // Do not break, maybe a populated one is found later
              }
            }
          }
          
          if (itemsKey && store[itemsKey] && Array.isArray(store[itemsKey])) {
            const updatedCount = this.updateAllReferencesInStore(collectionName, tempId, realId, store[itemsKey]);
            if (updatedCount > 0) {
              // Persist changes if the store has a method for it, or use generic saveToLocalStorage
              if (typeof store.persistState === 'function') {
                await store.persistState(); // Assuming persistState might be async
              } else {
                // Fallback to direct localStorage saving if persistState is not available
                this.saveToLocalStorage(collectionName, store[itemsKey]); 
              }
              console.log(`UpdateCrossStoreReferences: Referencias actualizadas y persistidas para ${collectionName}.`);
            }
          } else {
             console.warn(`UpdateCrossStoreReferences: No se pudo determinar/encontrar el array de items para el store '${collectionName}'. ItemsKey: ${itemsKey}. Store state:`, store ? store.$state : 'Store no disponible');
          }
        } catch (e) {
          // Catch errors if a store isn't available (e.g. bitacoraStore not created yet or fails to init)
          console.warn(`UpdateCrossStoreReferences: Error accediendo/actualizando store: ${e.message}. Esto puede ser normal si el store aún no está definido.`);
        }
      }
    },
    
    refreshAllStores() {
      try {
        console.log('[SYNC_STORE] Refreshing all data stores from localStorage via initFromLocalStorage');
    
        const storesToRefresh = [
          useActividadesStore,
          useZonasStore,
          useSiembrasStore,
          useRecordatoriosStore,
          useProgramacionesStore, // Assumed
          useBitacoraStore // Assumed
        ];
    
        storesToRefresh.forEach(useStore => {
          try {
            const store = useStore(); // Initialize the store
            if (store && typeof store.initFromLocalStorage === 'function') {
              store.initFromLocalStorage();
            } else if (store) {
              console.warn(`[SYNC_STORE] Store ${store.$id || 'unknown'} no tiene método initFromLocalStorage.`);
            } else {
              // This case should ideally not happen if useStore() is successful
              console.warn(`[SYNC_STORE] No se pudo obtener una instancia del store.`);
            }
          } catch (e) {
            // This catch is important if a store (like bitacora) is imported but not yet created,
            // useStore() itself would throw an error.
            console.warn(`[SYNC_STORE] Error inicializando store (puede que aún no exista o haya un error en su inicialización): ${e.message}.`);
          }
        });
        
        console.log('[SYNC_STORE] All data stores refreshed from localStorage.');
      } catch (error) {
        console.error('Error al refrescar los stores:', error);
        this.handleSyncError(error, 'Error refrescando stores');
      }
    },

    // Removed restoreAuthSession method.

    // Nuevo método para manejar cambios de visibilidad - REMOVED as it was empty
    // async handleVisibilityChange() {}
  }
})

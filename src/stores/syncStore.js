import { defineStore } from 'pinia'
import { SyncQueue } from '@/utils/syncQueue'
import { useSnackbarStore } from './snackbarStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
// Assume these stores will be created later
import { useProgramacionesStore } from '@/stores/programacionesStore'
import { useBitacoraStore } from '@/stores/bitacoraStore'
import { useAuthStore } from '@/stores/authStore'
import { pb } from '@/utils/pocketbase'
import { debounce } from 'lodash'
import { logger, logP3, logSync, logError } from '@/utils/logger'

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
    debouncedHandleVisibilityChange: null,
    // Interval IDs para cleanup
    cleanupIntervalId: null,
    // FASE 2: Configuración de sincronización selectiva
    selectiveSyncConfig: {
      enabled: false,
      collections: {
        Haciendas: { enabled: true, priority: 'high', immediate: true },
        actividades: { enabled: true, priority: 'high', immediate: true },
        siembras: { enabled: true, priority: 'medium', immediate: true },
        zonas: { enabled: true, priority: 'medium', immediate: true },
        programaciones: { enabled: true, priority: 'low', immediate: false },
        bitacora: { enabled: true, priority: 'low', immediate: false },
        recordatorios: { enabled: false, priority: 'low', immediate: false }
      },
      deferredSyncInterval: 30000, // 30 segundos para datos no críticos
      lastDeferredSync: null
    },
    // FASE 4: Configuración para patrones offline avanzados
    offlineFeatures: {
      searchIndexEnabled: true,
      reportsEnabled: true,
      analyticsEnabled: true,
      cacheEnabled: true,
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      cacheExpiryTime: 24 * 60 * 60 * 1000, // 24 horas
      searchIndexLastUpdate: null,
      lastReportGeneration: null
    },
    // Cache inteligente para datos frecuentes
    intelligentCache: {
      frequentData: new Map(), // Cache de datos frecuentemente accedidos
      searchIndex: new Map(), // Índice de búsqueda offline
      reports: new Map(), // Cache de reportes generados
      analytics: {
        dailyStats: new Map(),
        weeklyStats: new Map(),
        monthlyStats: new Map()
      }
    }
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

        // FASE 2: Inicializar configuración selectiva
        this.initSelectiveSyncConfig()

        // FASE 4: Inicializar funcionalidades offline avanzadas
        this.initOfflineFeatures()

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

    // Nuevo método para manejar optimistic updates
    async optimisticOperation(operation, localUpdateFn) {
      try {
        // 1. Ejecutar actualización local inmediatamente
        const localResult = localUpdateFn()
        
        // 2. Encolar operación para sincronización
        const tempId = await this.queueOperation(operation)
        
        // 3. Retornar resultado con indicador de estado pendiente
        return { ...localResult, tempId, isPending: true }
      } catch (error) {
        this.handleSyncError(error, 'Error en operación optimista')
        throw error
      }
    },

    // Métodos para gestión de métricas de rendimiento
    // Estos métodos permiten obtener, resetear y monitorear las métricas de rendimiento

    // Obtener métricas de rendimiento actuales
    getPerformanceMetrics() {
      return this.queue.getPerformanceMetrics()
    },

    // Resetear métricas (para pruebas o reinicios periódicos)
    resetPerformanceMetrics() {
      this.queue.resetMetrics()
    },

    // Obtener historial de métricas para análisis de tendencias
    getMetricsHistory(limit = 10) {
      const history = this.queue.metricsHistory || []
      return history.slice(-limit)
    },

    // Verificar si hay alertas de rendimiento
    checkPerformanceAlerts() {
      const metrics = this.getPerformanceMetrics()
      const alerts = []

      // Alerta de tasa de éxito baja
      if (metrics.syncRate.successRate < 90) {
        alerts.push({
          type: 'LOW_SUCCESS_RATE',
          severity: 'WARNING',
          message: 'La tasa de éxito de sincronización está por debajo del 90%',
          currentValue: metrics.syncRate.successRate,
          threshold: 90
        })
      }

      // Alerta de cola grande
      if (metrics.queueStats.currentQueueSize > 50) {
        alerts.push({
          type: 'LARGE_QUEUE',
          severity: 'WARNING',
          message: `Hay ${metrics.queueStats.currentQueueSize} operaciones pendientes en la cola`,
          currentValue: metrics.queueStats.currentQueueSize,
          threshold: 50
        })
      }

      // Alerta de muchos errores
      if (metrics.errors.totalErrors > 10) {
        alerts.push({
          type: 'HIGH_ERROR_COUNT',
          severity: 'CRITICAL',
          message: `Se han registrado ${metrics.errors.totalErrors} errores`,
          currentValue: metrics.errors.totalErrors,
          threshold: 10
        })
      }

      return alerts
    },

    // FASE 2: Métodos para sincronización selectiva

    // Configurar sincronización selectiva
    configureSelectiveSync(config) {
      try {
        // Merge de configuración manteniendo defaults
        this.selectiveSyncConfig = {
          ...this.selectiveSyncConfig,
          ...config,
          collections: {
            ...this.selectiveSyncConfig.collections,
            ...(config.collections || {})
          }
        }

        // Guardar configuración en localStorage
        this.saveToLocalStorage('selectiveSyncConfig', this.selectiveSyncConfig)

        console.log('Configuración de sincronización selectiva actualizada:', this.selectiveSyncConfig)
        return true
      } catch (error) {
        console.error('Error configurando sincronización selectiva:', error)
        return false
      }
    },

    // Obtener configuración actual de sincronización selectiva
    getSelectiveSyncConfig() {
      return { ...this.selectiveSyncConfig }
    },

    // Verificar si una colección debe sincronizarse inmediatamente
    shouldSyncImmediately(collectionName) {
      if (!this.selectiveSyncConfig.enabled) return true

      const config = this.selectiveSyncConfig.collections[collectionName]
      return config ? config.enabled && config.immediate : true
    },

    // Obtener prioridad de una colección
    getCollectionPriority(collectionName) {
      if (!this.selectiveSyncConfig.enabled) return 'high'

      const config = this.selectiveSyncConfig.collections[collectionName]
      return config ? config.priority : 'medium'
    },

    // Verificar si una colección está habilitada para sincronización
    isCollectionSyncEnabled(collectionName) {
      if (!this.selectiveSyncConfig.enabled) return true

      const config = this.selectiveSyncConfig.collections[collectionName]
      return config ? config.enabled : true
    },

    // Procesar sincronización diferida
    async processDeferredSync() {
      if (!this.selectiveSyncConfig.enabled) return

      const now = Date.now()
      const lastSync = this.selectiveSyncConfig.lastDeferredSync || 0
      const interval = this.selectiveSyncConfig.deferredSyncInterval

      if (now - lastSync < interval) return

      try {
        console.log('Procesando sincronización diferida...')

        // Filtrar operaciones diferidas de la cola
        const deferredOperations = this.queue.queue.filter(op => {
          const config = this.selectiveSyncConfig.collections[op.collectionName]
          return config && config.enabled && !config.immediate
        })

        if (deferredOperations.length > 0) {
          console.log(`Procesando ${deferredOperations.length} operaciones diferidas`)
          // Procesar operaciones diferidas con prioridad baja
          await this.processPendingQueue()
        }

        this.selectiveSyncConfig.lastDeferredSync = now
        this.saveToLocalStorage('selectiveSyncConfig', this.selectiveSyncConfig)

      } catch (error) {
        console.error('Error en sincronización diferida:', error)
      }
    },

    // Inicializar configuración selectiva desde localStorage
    initSelectiveSyncConfig() {
      try {
        const saved = this.loadFromLocalStorage('selectiveSyncConfig')
        if (saved) {
          this.selectiveSyncConfig = {
            ...this.selectiveSyncConfig,
            ...saved,
            collections: {
              ...this.selectiveSyncConfig.collections,
              ...(saved.collections || {})
            }
          }
        }
      } catch (error) {
        console.error('Error cargando configuración selectiva:', error)
      }
    },

    // FASE 3: Métodos para gestión de historial de cambios y resolución de conflictos

    // Trackear cambio local en el historial
    trackLocalChange(entityId, collection, operation, oldData, newData) {
      try {
        return this.queue.trackLocalChange(entityId, collection, operation, oldData, newData)
      } catch (error) {
        console.error('Error tracking local change:', error)
        return null
      }
    },

    // Obtener historial de cambios para una entidad
    getChangeHistory(entityId, collection = null, limit = 50) {
      try {
        return this.queue.getChangeHistory(entityId, collection, limit)
      } catch (error) {
        console.error('Error getting change history:', error)
        return []
      }
    },

    // Resolver conflicto con contexto histórico
    resolveConflictWithContext(localData, remoteData, entityId, collection) {
      try {
        return this.queue.resolveConflictWithContext(localData, remoteData, entityId, collection)
      } catch (error) {
        console.error('Error resolving conflict with context:', error)
        // Fallback: devolver datos remotos
        return remoteData
      }
    },

    // Obtener historial de resoluciones de conflictos
    getConflictResolutionHistory(limit = 20) {
      try {
        const history = this.queue.changeHistory?.conflictResolutions || []
        return history
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)
      } catch (error) {
        console.error('Error getting conflict resolution history:', error)
        return []
      }
    },

    // Limpiar historial antiguo
    cleanupOldHistory(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
      try {
        this.queue.cleanupOldHistory(maxAgeMs)
      } catch (error) {
        console.error('Error cleaning up old history:', error)
      }
    },

    // Exportar historial completo para análisis
    exportChangeHistory() {
      try {
        const history = {
          changes: this.queue.changeHistory?.changes || [],
          conflictResolutions: this.queue.changeHistory?.conflictResolutions || [],
          exportedAt: Date.now(),
          version: '1.0'
        }

        const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const a = document.createElement('a')
        a.href = url
        a.download = `change-history-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        return true
      } catch (error) {
        console.error('Error exporting change history:', error)
        return false
      }
    },

    // FASE 4: Métodos para patrones offline avanzados

    // Habilitar/deshabilitar funcionalidades offline
    enableOfflineFeatures(features) {
      try {
        this.offlineFeatures = {
          ...this.offlineFeatures,
          ...features
        }

        // Guardar configuración
        this.saveToLocalStorage('offlineFeatures', this.offlineFeatures)

        // Inicializar funcionalidades habilitadas
        if (this.offlineFeatures.searchIndexEnabled) {
          this.buildSearchIndex()
        }

        if (this.offlineFeatures.analyticsEnabled) {
          this.initializeAnalytics()
        }

        console.log('Funcionalidades offline configuradas:', this.offlineFeatures)
        return true
      } catch (error) {
        console.error('Error habilitando funcionalidades offline:', error)
        return false
      }
    },

    // Búsqueda offline en todas las colecciones
    searchOffline(query, collections = null, options = {}) {
      if (!this.offlineFeatures.searchIndexEnabled) {
        console.warn('Búsqueda offline no habilitada')
        return []
      }

      try {
        const {
          limit = 50,
          fuzzy = true,
          fields = ['name', 'nombre', 'descripcion', 'observaciones']
        } = options

        const normalizedQuery = query.toLowerCase().trim()
        if (!normalizedQuery) return []

        const results = []
        const targetCollections = collections || Object.keys(this.intelligentCache.searchIndex)

        for (const collection of targetCollections) {
          const indexData = this.intelligentCache.searchIndex.get(collection) || []

          indexData.forEach(item => {
            let score = 0
            let matchedFields = []

            // Buscar en campos especificados
            fields.forEach(field => {
              const fieldValue = item[field]
              if (fieldValue && typeof fieldValue === 'string') {
                const normalizedValue = fieldValue.toLowerCase()

                // Coincidencia exacta
                if (normalizedValue.includes(normalizedQuery)) {
                  score += 10
                  matchedFields.push({ field, value: fieldValue, type: 'exact' })
                }
                // Coincidencia difusa (si está habilitada)
                else if (fuzzy && this.fuzzyMatch(normalizedQuery, normalizedValue)) {
                  score += 5
                  matchedFields.push({ field, value: fieldValue, type: 'fuzzy' })
                }
              }
            })

            if (score > 0) {
              results.push({
                ...item,
                collection,
                searchScore: score,
                matchedFields,
                searchTimestamp: Date.now()
              })
            }
          })
        }

        // Ordenar por score y limitar resultados
        return results
          .sort((a, b) => b.searchScore - a.searchScore)
          .slice(0, limit)

      } catch (error) {
        console.error('Error en búsqueda offline:', error)
        return []
      }
    },

    // Coincidencia difusa simple
    fuzzyMatch(query, text) {
      const distance = this.levenshteinDistance(query, text)
      const maxLength = Math.max(query.length, text.length)
      const similarity = (maxLength - distance) / maxLength
      return similarity > 0.6 // 60% de similitud mínima
    },

    // Distancia de Levenshtein para coincidencia difusa
    levenshteinDistance(str1, str2) {
      const matrix = []

      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i]
      }

      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j
      }

      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1]
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            )
          }
        }
      }

      return matrix[str2.length][str1.length]
    },

    // Construir índice de búsqueda offline
    async buildSearchIndex() {
      try {
        console.log('Construyendo índice de búsqueda offline...')

        const stores = [
          { name: 'Haciendas', store: useHaciendaStore },
          { name: 'actividades', store: useActividadesStore },
          { name: 'siembras', store: useSiembrasStore },
          { name: 'zonas', store: useZonasStore },
          { name: 'recordatorios', store: useRecordatoriosStore },
          { name: 'programaciones', store: useProgramacionesStore },
          { name: 'bitacora', store: useBitacoraStore }
        ]

        for (const { name, store } of stores) {
          try {
            const storeInstance = store()
            const items = storeInstance.items || storeInstance.list || []

            // Crear índice de búsqueda con datos relevantes
            const indexData = items.map(item => ({
              id: item.id,
              ...item,
              indexedAt: Date.now()
            }))

            this.intelligentCache.searchIndex.set(name, indexData)
            console.log(`Índice construido para ${name}: ${indexData.length} elementos`)

          } catch (storeError) {
            console.warn(`Error indexando ${name}:`, storeError)
          }
        }

        this.offlineFeatures.searchIndexLastUpdate = Date.now()
        this.saveToLocalStorage('offlineFeatures', this.offlineFeatures)

        console.log('Índice de búsqueda offline completado')

      } catch (error) {
        console.error('Error construyendo índice de búsqueda:', error)
      }
    },

    // Generar reportes offline
    generateOfflineReport(type, parameters = {}) {
      if (!this.offlineFeatures.reportsEnabled) {
        console.warn('Generación de reportes offline no habilitada')
        return null
      }

      try {
        const { dateFrom, dateTo, collections = ['actividades', 'bitacora'] } = parameters

        const reportId = `report_${type}_${Date.now()}`
        const report = {
          id: reportId,
          type,
          parameters,
          generatedAt: Date.now(),
          data: {},
          summary: {}
        }

        switch (type) {
          case 'bpa_compliance':
            report.data = this.generateBPAComplianceReport(collections, dateFrom, dateTo)
            break

          case 'activity_summary':
            report.data = this.generateActivitySummaryReport(collections, dateFrom, dateTo)
            break

          case 'productivity':
            report.data = this.generateProductivityReport(collections, dateFrom, dateTo)
            break

          default:
            console.warn('Tipo de reporte no soportado:', type)
            return null
        }

        // Calcular resumen
        report.summary = this.calculateReportSummary(report.data, type)

        // Guardar en cache
        this.intelligentCache.reports.set(reportId, report)
        this.offlineFeatures.lastReportGeneration = Date.now()

        console.log('Reporte offline generado:', reportId)
        return report

      } catch (error) {
        console.error('Error generando reporte offline:', error)
        return null
      }
    },

    // Generar reporte de cumplimiento BPA
    generateBPAComplianceReport(collections, dateFrom, dateTo) {
      const data = {
        haciendas: [],
        zonas: [],
        actividades: [],
        totalScore: 0,
        complianceLevel: 'Sin datos'
      }

      try {
        const zonasStore = useZonasStore()
        const zonas = zonasStore.items || []

        zonas.forEach(zona => {
          if (zona.datos_bpa) {
            const bpaScore = this.calculateBPAScore(zona.datos_bpa)
            data.zonas.push({
              id: zona.id,
              nombre: zona.nombre || 'Sin nombre',
              bpaScore,
              lastUpdate: zona.updated || zona.created
            })
          }
        })

        // Calcular score total
        if (data.zonas.length > 0) {
          data.totalScore = data.zonas.reduce((sum, zona) => sum + zona.bpaScore, 0) / data.zonas.length
        }

        // Determinar nivel de cumplimiento
        if (data.totalScore >= 90) data.complianceLevel = 'Excelente'
        else if (data.totalScore >= 75) data.complianceLevel = 'Bueno'
        else if (data.totalScore >= 60) data.complianceLevel = 'Regular'
        else data.complianceLevel = 'Deficiente'

      } catch (error) {
        console.error('Error generando reporte BPA:', error)
      }

      return data
    },

    // Calcular score BPA simplificado
    calculateBPAScore(datosBpa) {
      if (!datosBpa || typeof datosBpa !== 'object') return 0

      let totalPoints = 0
      let maxPoints = 0

      Object.values(datosBpa).forEach(value => {
        if (typeof value === 'number') {
          totalPoints += value
          maxPoints += 100 // Asumiendo máximo 100 por categoría
        }
      })

      return maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0
    },

    // Generar analytics básicos offline
    generateOfflineAnalytics(period = 'daily') {
      if (!this.offlineFeatures.analyticsEnabled) {
        console.warn('Analytics offline no habilitados')
        return null
      }

      try {
        const analytics = {
          period,
          generatedAt: Date.now(),
          operationsCount: 0,
          syncMetrics: {},
          userActivity: {},
          dataVolume: {}
        }

        // Obtener métricas de sincronización
        analytics.syncMetrics = this.getPerformanceMetrics()

        // Calcular estadísticas de operaciones
        const queueStats = this.queue.getPerformanceMetrics()
        analytics.operationsCount = queueStats.operationCounts.total

        // Calcular volumen de datos (aproximado)
        analytics.dataVolume = this.calculateDataVolume()

        // Guardar en cache de analytics
        const cacheKey = `${period}_${new Date().toISOString().split('T')[0]}`
        this.intelligentCache.analytics[`${period}Stats`].set(cacheKey, analytics)

        console.log('Analytics offline generados:', period)
        return analytics

      } catch (error) {
        console.error('Error generando analytics offline:', error)
        return null
      }
    },

    // Calcular volumen de datos aproximado
    calculateDataVolume() {
      try {
        const stores = ['Haciendas', 'actividades', 'siembras', 'zonas', 'recordatorios']
        let totalItems = 0
        let estimatedSize = 0

        stores.forEach(storeName => {
          const savedData = this.loadFromLocalStorage(storeName)
          if (savedData) {
            const itemCount = Array.isArray(savedData) ? savedData.length :
                             savedData.items ? savedData.items.length : 0
            totalItems += itemCount
            estimatedSize += new Blob([JSON.stringify(savedData)]).size
          }
        })

        return {
          totalItems,
          estimatedSize,
          estimatedSizeMB: Math.round(estimatedSize / (1024 * 1024) * 100) / 100
        }
      } catch (error) {
        console.error('Error calculando volumen de datos:', error)
        return { totalItems: 0, estimatedSize: 0, estimatedSizeMB: 0 }
      }
    },

    // Limpiar cache inteligente
    cleanupIntelligentCache() {
      try {
        const now = Date.now()
        const expiryTime = this.offlineFeatures.cacheExpiryTime

        // Limpiar cache de reportes antiguos
        for (const [key, report] of this.intelligentCache.reports.entries()) {
          if (now - report.generatedAt > expiryTime) {
            this.intelligentCache.reports.delete(key)
          }
        }

        // Limpiar analytics antiguos
        Object.values(this.intelligentCache.analytics).forEach(cache => {
          for (const [key, data] of cache.entries()) {
            if (now - data.generatedAt > expiryTime) {
              cache.delete(key)
            }
          }
        })

        console.log('Cache inteligente limpiado')

      } catch (error) {
        console.error('Error limpiando cache:', error)
      }
    },

    // Inicializar analytics
    initializeAnalytics() {
      try {
        // Generar analytics iniciales si no existen
        const today = new Date().toISOString().split('T')[0]

        if (!this.intelligentCache.analytics.dailyStats.has(`daily_${today}`)) {
          this.generateOfflineAnalytics('daily')
        }

        console.log('Analytics inicializados')

      } catch (error) {
        console.error('Error inicializando analytics:', error)
      }
    },

    // Inicializar funcionalidades offline
    initOfflineFeatures() {
      try {
        // Cargar configuración guardada
        const saved = this.loadFromLocalStorage('offlineFeatures')
        if (saved) {
          this.offlineFeatures = {
            ...this.offlineFeatures,
            ...saved
          }
        }

        // Inicializar funcionalidades habilitadas
        if (this.offlineFeatures.searchIndexEnabled) {
          // Construir índice de búsqueda en background
          setTimeout(() => this.buildSearchIndex(), 2000)
        }

        if (this.offlineFeatures.analyticsEnabled) {
          this.initializeAnalytics()
        }

        // Limpiar cache periódicamente y guardar ID para cleanup
        if (this.cleanupIntervalId) {
          clearInterval(this.cleanupIntervalId)
        }
        this.cleanupIntervalId = setInterval(() => this.cleanupIntelligentCache(), 60 * 60 * 1000) // Cada hora

        console.log('Funcionalidades offline inicializadas:', this.offlineFeatures)

      } catch (error) {
        console.error('Error inicializando funcionalidades offline:', error)
      }
    },

    // Agregar métodos faltantes para reportes
    generateActivitySummaryReport(collections, dateFrom, dateTo) {
      const data = {
        totalActivities: 0,
        completedActivities: 0,
        pendingActivities: 0,
        byCategory: {},
        timeRange: { from: dateFrom, to: dateTo }
      }

      try {
        const actividadesStore = useActividadesStore()
        const actividades = actividadesStore.items || []

        actividades.forEach(actividad => {
          data.totalActivities++

          // Categorizar por estado (ejemplo simplificado)
          if (actividad.estado === 'completado') {
            data.completedActivities++
          } else {
            data.pendingActivities++
          }

          // Agrupar por categoría
          const categoria = actividad.categoria || 'Sin categoría'
          data.byCategory[categoria] = (data.byCategory[categoria] || 0) + 1
        })

      } catch (error) {
        console.error('Error generando reporte de actividades:', error)
      }

      return data
    },

    generateProductivityReport(collections, dateFrom, dateTo) {
      const data = {
        totalHours: 0,
        averageEfficiency: 0,
        topPerformers: [],
        productivityTrend: []
      }

      try {
        const bitacoraStore = useBitacoraStore()
        const bitacora = bitacoraStore.items || []

        // Análisis simplificado de productividad
        bitacora.forEach(entrada => {
          if (entrada.tiempo_dedicado) {
            data.totalHours += entrada.tiempo_dedicado
          }
        })

      } catch (error) {
        console.error('Error generando reporte de productividad:', error)
      }

      return data
    },

    calculateReportSummary(reportData, type) {
      const summary = {
        totalRecords: 0,
        keyMetrics: {},
        recommendations: []
      }

      try {
        switch (type) {
          case 'bpa_compliance':
            summary.totalRecords = reportData.zonas?.length || 0
            summary.keyMetrics = {
              averageScore: reportData.totalScore || 0,
              complianceLevel: reportData.complianceLevel || 'Sin datos'
            }
            if (reportData.totalScore < 75) {
              summary.recommendations.push('Mejorar prácticas de BPA en zonas con bajo puntaje')
            }
            break

          case 'activity_summary':
            summary.totalRecords = reportData.totalActivities || 0
            summary.keyMetrics = {
              completionRate: reportData.totalActivities > 0
                ? Math.round((reportData.completedActivities / reportData.totalActivities) * 100)
                : 0
            }
            break

          case 'productivity':
            summary.totalRecords = 1
            summary.keyMetrics = {
              totalHours: reportData.totalHours || 0,
              efficiency: reportData.averageEfficiency || 0
            }
            break
        }

      } catch (error) {
        console.error('Error calculando resumen de reporte:', error)
      }

      return summary
    },

    // Nuevo método para manejar cambios de visibilidad - REMOVED as it was empty
    // async handleVisibilityChange() {}

    // P3.1: OPTIMIZACIÓN - Carga optimizada con requests paralelos (ÚNICO MÉTODO)

    // P3.1: OPTIMIZACIÓN - Carga optimizada con requests paralelos (dos fases)
    async loadDashboardWithParallelRequests() {
      const startTime = performance.now()

      try {
        // FASE 1: Cargar hacienda primero (prerequisito)
        const haciendaStore = useHaciendaStore()
        let haciendaId = haciendaStore.mi_hacienda?.id

        // Si no hay hacienda cargada, cargarla primero
        if (!haciendaId) {
          await haciendaStore.init()
          haciendaId = haciendaStore.mi_hacienda?.id
        }

        if (!haciendaId) {
          throw new Error('No se pudo cargar la hacienda')
        }

        // FASE 2: Cargar resto de colecciones en paralelo con filtros y expansiones correctas
        const promises = [
          pb.collection('recordatorios').getList(1, 500, {
            skipTotal: true,
            filter: `hacienda="${haciendaId}"`,
            expand: 'actividades.tipo_actividades,zonas.tipos_zonas'
          })
            .then(result => ({ collection: 'recordatorios', data: result.items || [] }))
            .catch(error => ({ collection: 'recordatorios', data: [], error: error.message })),

          pb.collection('siembras').getList(1, 500, {
            skipTotal: true,
            filter: `hacienda="${haciendaId}"`
            // Las siembras no necesitan expand según el store original
          })
            .then(result => ({ collection: 'siembras', data: result.items || [] }))
            .catch(error => ({ collection: 'siembras', data: [], error: error.message })),

          pb.collection('actividades').getList(1, 500, {
            skipTotal: true,
            filter: `hacienda="${haciendaId}"`,
            expand: 'tipo_actividades,siembras'
          })
            .then(result => ({ collection: 'actividades', data: result.items || [] }))
            .catch(error => ({ collection: 'actividades', data: [], error: error.message })),

          pb.collection('zonas').getList(1, 500, {
            skipTotal: true,
            filter: `hacienda="${haciendaId}"`,
            expand: 'tipos_zonas'
          })
            .then(result => ({ collection: 'zonas', data: result.items || [] }))
            .catch(error => ({ collection: 'zonas', data: [], error: error.message }))
        ]

        const results = await Promise.all(promises)
        const duration = performance.now() - startTime

        // Procesar resultados
        const collections = {}
        let totalRecords = 0
        let successfulCollections = 1 // Contar hacienda como exitosa

        // Agregar hacienda al resultado (ya cargada en fase 1)
        collections['Haciendas'] = haciendaStore.mi_hacienda ? [haciendaStore.mi_hacienda] : []
        totalRecords += collections['Haciendas'].length

        // Procesar resultados de fase 2
        results.forEach(result => {
          if (result.error) {
            collections[result.collection] = []
          } else {
            collections[result.collection] = result.data
            totalRecords += result.data.length
            successfulCollections++
          }
        })

        const metrics = {
          duration: Math.round(duration),
          collectionsLoaded: successfulCollections,
          recordsLoaded: totalRecords,
          recordsPerSecond: Math.round(totalRecords / (duration / 1000))
        }

        return {
          success: successfulCollections > 0,
          collections,
          metrics
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          collections: {},
          metrics: { duration: Math.round(performance.now() - startTime), collectionsLoaded: 0, recordsLoaded: 0 }
        }
      }
    },

    // P3.1: HELPER - Procesar resultados de batch API
    processBatchResults(batchData) {
      const collections = {}

      if (Array.isArray(batchData)) {
        const collectionNames = ['Haciendas', 'recordatorios', 'siembras', 'actividades', 'zonas']

        batchData.forEach((result, index) => {
          const collectionName = collectionNames[index] || `collection_${index}`

          if (result.status === 200 && result.body?.items) {
            collections[collectionName] = result.body.items
            console.log(`✅ Batch result - ${collectionName}: ${result.body.items.length} registros`)
          } else {
            collections[collectionName] = []
            console.warn(`⚠️ Batch result - ${collectionName}: Error ${result.status}`)
          }
        })
      }

      return collections
    },

    // P3.1: Batch processing para Dashboard y carga inicial
    async batchInitializeDashboard() {
      try {
        logP3('Iniciando batch processing para Dashboard...', 'batch_start')
        const startTime = performance.now()

        // Verificar autenticación antes de continuar
        const authStore = useAuthStore()
        if (!authStore.isLoggedIn || !pb.authStore.isValid) {
          console.warn('P3.1: Usuario no autenticado, cancelando batch processing')
          return {
            success: false,
            error: 'Usuario no autenticado',
            collections: {},
            metrics: { duration: 0, collectionsLoaded: 0, recordsLoaded: 0 }
          }
        }

        // 🧪 ESTRATEGIA DE DEBUG: Probar methods step by step
        console.log('🧪 P3.1: Ejecutando tests diagnósticos...')

        // Paso 0: Verificar capacidades del servidor
        const serverCapabilities = await this.testServerCapabilities()
        console.log('🧪 Server capabilities:', serverCapabilities)

        // Paso 1: Probar requests individuales
        const individualResults = await this.testIndividualRequests()
        console.log('🧪 Individual results:', individualResults)

        // Paso 2: Probar batch simple
        const simpleBatchResult = await this.testSimpleBatch()
        console.log('🧪 Simple batch result:', simpleBatchResult)

        // Paso 2.5: Si batch simple falla, probar con límites de PocketBase
        if (!simpleBatchResult.success) {
          console.log('🧪 Probando batch respetando configuraciones PocketBase...')
          const batchWithLimitsResult = await this.testBatchWithLimits()
          console.log('🧪 Batch with limits result:', batchWithLimitsResult)

          // Si funciona con límites, usar ese enfoque
          if (batchWithLimitsResult.success) {
            console.log('✅ P3.1: Batch funciona respetando límites PocketBase!')
            return {
              success: true,
              collections: this.processBatchResults(batchWithLimitsResult.data),
              metrics: {
                ...batchWithLimitsResult.metrics,
                method: 'batch_with_limits'
              }
            }
          }
        }

        // Si el batch simple falla, usar parallel requests optimizado
        if (!simpleBatchResult.success) {
          console.warn('🚨 P3.1: Batch API no disponible, usando parallel requests optimizado')

          // Usar método parallel requests como optimización P3.1
          const parallelResult = await this.loadDashboardWithParallelRequests()

          if (parallelResult.success) {
            console.log('✅ P3.1: Parallel requests exitoso como alternativa al batch')
            return {
              success: true,
              collections: parallelResult.collections,
              metrics: {
                ...parallelResult.metrics,
                method: 'parallel_requests_fallback'
              },
              diagnostics: { individualResults, simpleBatchResult, parallelResult }
            }
          }

          return {
            success: false,
            error: 'Todas las optimizaciones P3.1 fallaron',
            collections: {},
            metrics: { duration: performance.now() - startTime, collectionsLoaded: 0, recordsLoaded: 0 },
            diagnostics: { individualResults, simpleBatchResult, parallelResult }
          }
        }

        // Si llegamos aquí, procedemos con el batch completo pero con logging mejorado
        const collections = ['Haciendas', 'recordatorios', 'siembras', 'actividades', 'zonas']

        // Crear array de requests SIN headers por request (usar solo headers globales)
        const batchPayload = {
          requests: collections.map(collection => ({
            method: 'GET',
            url: `/api/collections/${collection}/records?page=1&perPage=500&skipTotal=1`
            // ✅ NO incluir headers por request - usar headers globales en fetch
          }))
        }

        // 🔍 DEBUG: Log del payload optimizado
        console.log('P3.1 DEBUG: Batch payload optimizado:', JSON.stringify(batchPayload, null, 2))
        console.log('P3.1 DEBUG: PocketBase baseUrl:', pb.baseUrl)
        console.log('P3.1 DEBUG: Auth token present:', !!pb.authStore.token)

        // Ejecutar batch request manual con headers globales únicamente
        console.log('P3.1: Ejecutando batch request optimizado para', collections.length, 'colecciones...')

        const response = await fetch(`${pb.baseUrl}/api/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : ''
          },
          body: JSON.stringify(batchPayload)
        })

        // 🔍 DEBUG: Log de la respuesta
        console.log('P3.1 DEBUG: Response status:', response.status)
        console.log('P3.1 DEBUG: Response headers:', Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
          // 🔍 DEBUG: Log detallado del error
          const errorText = await response.text()
          console.error('P3.1 DEBUG: Error response body:', errorText)
          try {
            const errorJson = JSON.parse(errorText)
            console.error('P3.1 DEBUG: Error JSON:', JSON.stringify(errorJson, null, 2))
          } catch (parseError) {
            console.error('P3.1 DEBUG: Error body is not JSON')
          }
          throw new Error(`Batch request failed: ${response.status} ${response.statusText}`)
        }

        const batchResponse = await response.json()

        // 🔍 DEBUG: Log de la respuesta exitosa
        console.log('P3.1 DEBUG: Batch response received:', JSON.stringify(batchResponse, null, 2))
        // La respuesta de batch es un array con {status, body} para cada request
        const results = batchResponse.map(item => {
          if (item.status >= 200 && item.status < 300) {
            return item.body?.items || item.body || []
          } else {
            console.warn('P3.1: Error en request batch:', item.status, item.body)
            return []
          }
        })

        // Procesar resultados
        const processedResults = {}
        let totalRecords = 0

        results.forEach((result, index) => {
          const collectionName = collections[index]
          if (result && Array.isArray(result)) {
            processedResults[collectionName] = result
            totalRecords += result.length
            console.log(`P3.1: ${collectionName} cargada:`, result.length, 'registros')
          } else {
            console.warn(`P3.1: Error cargando ${collectionName}:`, result)
            processedResults[collectionName] = []
          }
        })

        const endTime = performance.now()
        const duration = endTime - startTime

        // Métricas de performance
        const metrics = {
          duration: Math.round(duration),
          collectionsLoaded: Object.keys(processedResults).length,
          recordsLoaded: totalRecords,
          averageTimePerCollection: Math.round(duration / collections.length),
          recordsPerSecond: Math.round(totalRecords / (duration / 1000))
        }

        console.log('P3.1: Batch processing completado:', metrics)

        return {
          success: true,
          collections: processedResults,
          metrics
        }

      } catch (error) {
        console.error('P3.1: Error en batch processing Dashboard:', error)
        return {
          success: false,
          error: error.message,
          collections: {},
          metrics: { duration: 0, collectionsLoaded: 0, recordsLoaded: 0 }
        }
      }
    },

    // P3.1: Método auxiliar para aplicar datos batch a stores específicos
    async applyBatchDataToStores(batchData) {
      try {
        if (!batchData.success || !batchData.collections) {
          console.warn('P3.1: Datos batch inválidos para aplicar a stores')
          return false
        }

        const { collections } = batchData
        let storesUpdated = 0

        // Mapeo de collections a stores
        const storeMap = {
          'Haciendas': useHaciendaStore,
          'recordatorios': useRecordatoriosStore,
          'siembras': useSiembrasStore,
          'actividades': useActividadesStore,
          'zonas': useZonasStore
        }

        // Aplicar datos a cada store
        for (const [collectionName, storeGetter] of Object.entries(storeMap)) {
          try {
            const data = collections[collectionName]
            if (data && Array.isArray(data)) {
              const store = storeGetter()

              // Aplicar datos al store según su estructura
              if (typeof store.applyBatchData === 'function') {
                await store.applyBatchData(data)
              } else {
                // Mapear la estructura correcta para cada store
                switch (collectionName) {
                  case 'Haciendas':
                    // Hacienda ya fue cargada en fase 1, no sobrescribir
                    if (!store.mi_hacienda && data.length > 0) {
                      store.mi_hacienda = data[0]
                    }
                    break
                  case 'siembras':
                    store.siembras = data
                    break
                  case 'actividades':
                    store.actividades = data
                    break
                  case 'recordatorios':
                    store.recordatorios = data
                    break
                  case 'zonas':
                    store.zonas = data
                    break
                  default:
                    // Fallback genérico
                    if (store.items) {
                      store.items = data
                    }
                }

                // Persistir en localStorage
                this.saveToLocalStorage(collectionName, data)
              }

              console.log(`P3.1: Store ${collectionName} actualizado con`, data.length, 'registros')
              storesUpdated++
            }
          } catch (storeError) {
            console.warn(`P3.1: Error aplicando datos a store ${collectionName}:`, storeError)
          }
        }

        console.log(`P3.1: ${storesUpdated} stores actualizados exitosamente`)
        return storesUpdated > 0

      } catch (error) {
        console.error('P3.1: Error aplicando datos batch a stores:', error)
        return false
      }
    },

    // P3.1: Método principal que combina batch loading y aplicación a stores
    async initializeDashboardWithBatch() {
      try {
        console.log('P3.1: Iniciando inicialización Dashboard con batch processing...')

        // 1. Ejecutar batch request
        const batchResult = await this.batchInitializeDashboard()

        if (batchResult.success) {
          // 2. Aplicar datos a stores
          const appliedToStores = await this.applyBatchDataToStores(batchResult)

          // 3. Retornar resultado combinado
          return {
            ...batchResult,
            storesUpdated: appliedToStores,
            method: 'batch_processing'
          }
        } else {
          // Fallback: método tradicional si batch falla
          console.warn('P3.1: Batch processing falló, usando método tradicional como fallback')
          return {
            success: false,
            error: batchResult.error,
            fallbackAvailable: true,
            method: 'batch_processing_failed'
          }
        }

      } catch (error) {
        console.error('P3.1: Error en inicialización Dashboard con batch:', error)
        return {
          success: false,
          error: error.message,
          method: 'batch_processing_error'
        }
      }
    },

    // Método para limpiar recursos y prevenir memory leaks
    cleanup() {
      try {
        // Limpiar interval de cleanup
        if (this.cleanupIntervalId) {
          clearInterval(this.cleanupIntervalId)
          this.cleanupIntervalId = null
        }

        // Limpiar event listeners
        window.removeEventListener('online', this.handleOnline)
        window.removeEventListener('offline', this.handleOffline)

        console.log('SyncStore cleanup completado')
      } catch (error) {
        console.error('Error en syncStore cleanup:', error)
      }
    }
  }
})

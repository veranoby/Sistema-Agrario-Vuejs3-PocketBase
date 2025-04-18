import { defineStore } from 'pinia'
import { SyncQueue } from '@/utils/syncQueue'
import { useSnackbarStore } from './snackbarStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSiembrasStore } from '@/stores/siembrasStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
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
        if (!pb.authStore.isValid) {
          await this.restoreAuthSession()
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
      await this.restoreAuthSession()

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
        await this.queue.process()

        // Actualizar estado
        this.lastSyncTime = Date.now()
        this.persistQueueState()
        useSnackbarStore().showSnackbar('Sincronización completada', 'success')
      } catch (error) {
        this.handleSyncError(error, 'Error procesando cola')
      } finally {
        this.syncStatus = 'idle'
        this.syncInProgress = false
      }
    },

    // Método genérico para actualizar un elemento local
    updateLocalItem(collection, tempId, newItem, items, options = {}) {
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

    saveToLocalStorage(key, value, persistent = false) {
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
    updateCrossStoreReferences(tempId, realId) {
      if (!tempId || !realId) return

      console.log(`Actualizando referencias entre stores: ${tempId} -> ${realId}`)

      // Lista de stores y sus colecciones
      const storeCollections = [
        { store: useZonasStore(), collection: 'zonas', items: 'zonas' },
        { store: useSiembrasStore(), collection: 'siembras', items: 'siembras' },
        { store: useActividadesStore(), collection: 'actividades', items: 'actividades' },
        { store: useRecordatoriosStore(), collection: 'recordatorios', items: 'recordatorios' }
      ]

      // Actualizar referencias en cada store
      storeCollections.forEach(({ store, collection, items }) => {
        if (store && store[items]) {
          this.updateAllReferencesInStore(collection, tempId, realId, store[items])
          this.saveToLocalStorage(collection, store[items])
        }
      })
    },

    // Método para actualizar todas las referencias entre stores
    refreshAllStores() {
      try {
        console.log('Refrescando todos los stores desde localStorage')

        // Lista de stores y sus colecciones
        const storeCollections = [
          { store: useZonasStore(), collection: 'zonas', items: 'zonas' },
          { store: useSiembrasStore(), collection: 'siembras', items: 'siembras' },
          { store: useActividadesStore(), collection: 'actividades', items: 'actividades' },
          { store: useRecordatoriosStore(), collection: 'recordatorios', items: 'recordatorios' }
        ]

        // Actualizar cada store desde localStorage
        storeCollections.forEach(({ store, collection, items }) => {
          const data = this.loadFromLocalStorage(collection)
          if (data && Array.isArray(data) && store[items]) {
            // Conservar los elementos que no están en localStorage (por ejemplo, los recién creados)
            const currentIds = data.map((item) => item.id)
            const newItems = store[items].filter((item) => !currentIds.includes(item.id))

            // Combinar los datos de localStorage con los nuevos elementos
            store[items] = [...data, ...newItems]
            console.log(
              `Store ${collection} actualizado con ${data.length} elementos de localStorage y ${newItems.length} nuevos elementos`
            )
          }
        })
      } catch (error) {
        console.error('Error al refrescar los stores:', error)
      }
    },

    // Nuevo método para restaurar la sesión de autenticación
    async restoreAuthSession() {
      console.log('[SYNC] Iniciando restoreAuthSession')

      if (pb.authStore.isValid) {
        console.log('[SYNC] Sesión ya válida, no necesita restauración')
        return true
      }

      try {
        const authData = this.loadFromLocalStorage('pocketbase_auth')
        const rememberMe = this.loadFromLocalStorage('rememberMe')
        console.log(
          '[SYNC] Datos cargados de localStorage - authData:',
          authData,
          'rememberMe:',
          rememberMe
        )

        // Validación más robusta de authData
        const isValidAuthData =
          authData &&
          typeof authData === 'object' &&
          authData.token &&
          authData.record &&
          typeof authData.record === 'object'

        if (!isValidAuthData) {
          console.warn('[SYNC] authData inválido:', authData)
          return false
        }

        if (!rememberMe) {
          console.log('[SYNC] No hay rememberMe, omitiendo restauración')
          return false
        }

        const lastRestoreAttempt = this.loadFromLocalStorage('last_restore_attempt') || 0
        const now = Date.now()

        if (now - lastRestoreAttempt < 60000) {
          console.log('[SYNC] Demasiados intentos recientes, esperando...')
          return false
        }

        this.saveToLocalStorage('last_restore_attempt', now)
        console.log('[SYNC] Intentando restaurar sesión...')

        try {
          pb.authStore.save(authData.token, authData)
          console.log('[SYNC] Token guardado en pb.authStore, isValid:', pb.authStore.isValid)

          if (pb.authStore.isValid) {
            console.log('[SYNC] Sesión restaurada exitosamente')
            const authStore = useAuthStore()
            authStore.setSession({ record: authData })

            if (rememberMe) {
              console.log('[SYNC] Iniciando timer de refresh por rememberMe')
              authStore.startRefreshTimer()
            }
            return true
          }
        } catch (error) {
          console.error('[SYNC] Error al restaurar token localmente:', error)
        }

        // Solo intentamos refresh si hace más de 10 minutos del último intento fallido
        const lastFailedRefresh = this.loadFromLocalStorage('last_failed_refresh') || 0
        if (now - lastFailedRefresh > 600000) {
          // 10 minutos
          try {
            console.log('Intentando refrescar sesión con el servidor...')
            const freshAuthData = await pb.collection('users').authRefresh()

            if (pb.authStore.isValid) {
              console.log('Sesión refrescada exitosamente')
              this.saveToLocalStorage('last_auth_success', now)
              authStore.setSession(freshAuthData)

              // Iniciar timer de refresh
              if (rememberMe) {
                authStore.startRefreshTimer()
              }

              return true
            }
          } catch (error) {
            // Guardar timestamp del intento fallido
            this.saveToLocalStorage('last_failed_refresh', now)
            console.log('Error al refrescar sesión:', error)
          }
        } else {
          console.log('Omitiendo refresh con servidor por intento reciente fallido')
        }

        console.log('No se pudo restaurar la sesión')
        return false
      } catch (error) {
        console.error('[SYNC] Error crítico al restaurar sesión:', error)
        return false
      }
    },

    // Nuevo método para manejar cambios de visibilidad
    async handleVisibilityChange() {}
  }
})

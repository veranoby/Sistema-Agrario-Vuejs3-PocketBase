import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { handleError } from '@/utils/errorHandler'
import { useSyncStore } from '@/stores/sync/index'
import { useHaciendaStore } from './haciendaStore'
import { useBodegaStore } from './bodegaStore'
import { logger } from '@/utils/logger'
import { tieredCache, CacheKeys } from '@/utils/cacheManager'

export const useBodegaMovimientosStore = defineStore('bodegaMovimientos', {
  state: () => ({
    movimientos: [],
    loading: false,
    error: null,
    version: 1
  }),

  persist: {
    key: 'bodega_movimientos',
    storage: localStorage,
    paths: ['movimientos']
  },

  sync: {
    collectionName: 'bodega_movimientos',
    stateProp: 'movimientos'
  },

  getters: {
    getMovimientoById: (state) => (id) => {
      return state.movimientos.find((m) => m.id === id)
    },
    getMovimientosByItem: (state) => (itemId) => {
      return state.movimientos.filter((m) => m.item === itemId)
    }
  },

  actions: {
    async init() {
      try {
        await this.cargarMovimientos()
        return true
      } catch (error) {
        handleError(error, 'Error al inicializar movimientos de bodega')
        return false
      }
    },

    async cargarMovimientos() {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.loading = true

      try {
        if (this.movimientos.length > 0 && !syncStore.isOnline) {
          this.loading = false
          return this.movimientos
        }

        if (!syncStore.isOnline) {
          this.movimientos = []
          return []
        }

        const cacheConfig = CacheKeys.paginatedResult('bodega_movimientos', 1, { hacienda: haciendaStore.mi_hacienda?.id })
        
        const resultList = await tieredCache.fetchWithCache(cacheConfig, async () => {
          return await pb.collection('bodega_movimientos').getList(1, 200, {
            filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
            sort: '-created',
            expand: 'item,bitacora'
          })
        })

        this.movimientos = resultList.items

        // Sanitizar y guardar en IndexedDB
        syncStore.saveToLocalStorage('bodega_movimientos', JSON.parse(JSON.stringify(this.movimientos)))
        return this.movimientos
      } catch (error) {
        handleError(error, 'Error al cargar movimientos de inventario')
        throw error
      } finally {
        this.loading = false
      }
    },

    async registrarMovimiento(movimientoData) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      const bodegaStore = useBodegaStore()
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      const enrichedData = {
        ...movimientoData,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version
      }

      // Mutación local optimista del stock en el store de bodega
      const item = bodegaStore.getItemById(movimientoData.item)
      let nuevoStock = item ? item.stock_actual : 0
      let costoPromedioAnterior = item ? (item.costo_promedio_ponderado || item.costo_adquisicion || 0) : 0
      let nuevoCostoPromedio = costoPromedioAnterior

      if (item) {
        const cantidad = Number(movimientoData.cantidad) || 0
        if (movimientoData.tipo === 'egreso') {
          nuevoStock -= cantidad
          enrichedData.costo_unitario_aplicado = item.costo_promedio_ponderado || item.costo_adquisicion || 0
        } else if (movimientoData.tipo === 'ingreso') {
          const costoUnitario = Number(movimientoData.costo_unitario) || 0
          const totalValorAnterior = item.stock_actual * costoPromedioAnterior
          const valorIngreso = cantidad * costoUnitario
          nuevoStock += cantidad
          if (nuevoStock > 0) {
            nuevoCostoPromedio = (totalValorAnterior + valorIngreso) / nuevoStock
          }
          enrichedData.costo_unitario_aplicado = costoUnitario
        }
        
        // Aplicar mutación síncrona en el estado de bodega inmediatamente
        bodegaStore.applySyncedUpdate(item.id, { 
          stock_actual: nuevoStock,
          costo_promedio_ponderado: nuevoCostoPromedio 
        })
      }

      if (!syncStore.isOnline) {
        const tempId = syncStore.generateTempId()

        const tempMovimiento = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true
        }

        // Registrar movimiento de forma local
        this.applySyncedCreate(tempId, tempMovimiento)

        // Encolar creación del movimiento
        await syncStore.queueOperation({
          type: 'create',
          collection: 'bodega_movimientos',
          data: enrichedData,
          tempId
        })

        // Encolar también la actualización del stock en el item de bodega
        if (item) {
          await syncStore.queueOperation({
            type: 'update',
            collection: 'bodega_items',
            id: item.id,
            data: { 
              stock_actual: nuevoStock,
              costo_promedio_ponderado: nuevoCostoPromedio 
            }
          })
        }

        uiFeedbackStore.hideLoading()
        return tempMovimiento
      }

      try {
        const record = await pb.collection('bodega_movimientos').create(enrichedData)
        this.applySyncedCreate(record.id, record)

        if (item) {
          // Actualizar el costo_promedio_ponderado en DB explícitamente si es necesario
          await pb.collection('bodega_items').update(item.id, { 
            costo_promedio_ponderado: nuevoCostoPromedio 
          }).catch(e => console.warn('JSVM might handle stock, but manual cost update failed', e))
        }
        
        // Invalidar cachés
        tieredCache.invalidatePattern('bodega_movimientos:page:')
        tieredCache.invalidatePattern('bodega_items:page:')

        // En modo online, el Hook JSVM del servidor recalcula el stock.
        // Recargar los items de bodega en background para asegurar consistencia absoluta con el servidor
        await bodegaStore.cargarItems().catch(e => {
          logger.warn('[BODEGA_MOVIMIENTOS_STORE] Error recargando items en modo online:', e)
        })

        useUiFeedbackStore().showSnackbar('Movimiento de inventario registrado con éxito')
        return record
      } catch (error) {
        // Revertir mutación local optimista si falló de inmediato
        if (item) {
          const cantidad = Number(movimientoData.cantidad) || 0
          let stockRevertido = item.stock_actual
          if (movimientoData.tipo === 'egreso') {
            stockRevertido += cantidad
          } else if (movimientoData.tipo === 'ingreso') {
            stockRevertido -= cantidad
          }
          bodegaStore.applySyncedUpdate(item.id, { 
            stock_actual: stockRevertido,
            costo_promedio_ponderado: costoPromedioAnterior 
          })
        }
        handleError(error, 'Error al registrar movimiento de bodega')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async initFromLocalStorage() {
      const syncStore = useSyncStore()
      const localMovimientos = await syncStore.loadFromLocalStorage('bodega_movimientos')
      this.movimientos = (localMovimientos && Array.isArray(localMovimientos)) ? localMovimientos : []
      logger.info(`[BODEGA_MOVIMIENTOS_STORE] Initialized from localStorage. Movimientos: ${this.movimientos.length}`)
    }
  }
})

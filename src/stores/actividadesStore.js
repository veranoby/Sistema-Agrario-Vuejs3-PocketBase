import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { pb } from '@/utils/pocketbase'
import { useSyncStore } from './syncStore'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore'
import { useAlertStore } from './alertStore'
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '@/constants/pagination'

export const useActividadesStore = defineStore('actividades', {
  state: () => ({
    actividades: [],
    tiposActividades: [],
    loading: false,
    loadingTipos: false, // Flag específico para prevenir requests duplicadas
    error: null,
    version: 1,
    lastSync: null,
    // OPTIMIZACIÓN: Lookup Map para acceso O(1)
    activityLookupMap: new Map(),
    // Pagination state
    currentPage: 1,
    perPage: 20,
    totalItems: 0,
    totalPages: 0
  }),

  persist: {
    key: 'actividades',
    storage: localStorage,
    paths: ['actividades', 'tiposActividades']
  },

  getters: {
    promedioBpaEstado() {
      const haciendaStore = useHaciendaStore()
      const actividadesHacienda = this.actividades.filter(
        (a) => a.hacienda === haciendaStore.mi_hacienda?.id
      )

      if (!actividadesHacienda.length) return 0

      const totalBpa = actividadesHacienda.reduce((acc, a) => acc + (a.bpa_estado || 0), 0)
      return Math.round(totalBpa / actividadesHacienda.length)
    },

    getActividadTipo: (state) => (tipoId) => {
      const tipo = state.tiposActividades.find((t) => t.id === tipoId)
      return tipo?.nombre || 'Desconocido'
    },

    getNombreActividad: (state) => (id) => {
      const actividad = state.actividades.find((a) => a.id === id)
      return actividad?.nombre || 'Actividad no encontrada'
    },

    getTiposActividades: (state) => {
      return state.tiposActividades
    },

    // Pagination getters
    hasNextPage: (state) => state.currentPage < state.totalPages,
    hasPrevPage: (state) => state.currentPage > 1
  },

  actions: {
    async init() {
      const syncStore = useSyncStore()
      this.loading = true

      try {
        await this.cargarTiposActividades()

        await this.cargarActividades() // Cargar zonas desde el servidor
      } catch (error) {
        handleError(error, 'Error al inicializar actividades')
      } finally {
        this.loading = false
      }
    },

    async cargarActividades() {
      // Local storage loading is now handled by initFromLocalStorage.
      // This method maintains backward compatibility by loading all items.
      return this.fetchPage(1, MAX_PAGE_SIZE)
    },

    async fetchPage(page = 1, perPage = 20) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.error = null
      this.loading = true

      // If activities are already populated (e.g., by initFromLocalStorage), consider not re-fetching unless necessary.
      // For now, we'll keep the original behavior of fetching if local data wasn't sufficient (though it's loaded elsewhere).
      // This part might be redundant if initFromLocalStorage always runs first via refreshAllStores.
      if (this.actividades.length > 0 && !navigator.onLine) { // Example: only fetch if online and empty
          this.loading = false;
          return this.actividades;
      }

      // If online, proceed to fetch from server.
      // The original logic to check 'actividadesLocal' first is removed as initFromLocalStorage handles it.

      try {
        const resultList = await pb.collection('actividades').getList(page, perPage, {
          sort: 'nombre',
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          expand: 'tipo_actividades,siembras'
        })

        // EFICIENCIA: Solo rebuild si el array cambió realmente
        const previousLength = this.actividades.length
        this.actividades = resultList.items
        this.totalItems = resultList.totalItems
        this.currentPage = page
        this.totalPages = resultList.totalPages
        this.lastSync = Date.now()

        // Solo rebuild si el tamaño cambió (evitar rebuilds innecesarios)
        if (previousLength !== resultList.items.length) {
          this.buildActivityLookup()
        }

        syncStore.saveToLocalStorage('actividades', resultList.items)
        return resultList
      } catch (error) {
        handleError(error, 'Error al cargar actividades')
        throw error
      } finally {
        this.loading = false
      }
    },

    nextPage() {
      if (this.hasNextPage) {
        return this.fetchPage(this.currentPage + 1, this.perPage)
      }
    },

    prevPage() {
      if (this.hasPrevPage) {
        return this.fetchPage(this.currentPage - 1, this.perPage)
      }
    },

    async crearActividad(actividadData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      // Usar la función unificada para generar ID temporal
      const tempId = syncStore.generateTempId()

      // Asegurarse de que siembras sea un array
      const siembras = Array.isArray(actividadData.siembras)
        ? actividadData.siembras
        : actividadData.siembra
          ? [actividadData.siembra]
          : []

      // Enriquecer datos con contexto de hacienda
      const enrichedData = {
        ...actividadData,
        nombre: actividadData.nombre.toUpperCase(),
        tipo_actividades: actividadData.tipo_actividades,
        hacienda: haciendaStore.mi_hacienda?.id,
        siembras: siembras,
        zonas: actividadData.zonas || [],
        bpa_estado: this.calcularBpaEstado(actividadData.datos_bpa),
        activa: true,
        version: this.version,
        datos_bpa: actividadData.datos_bpa || [],
        metricas: actividadData.metricas || {}
      }

      if (!syncStore.isOnline) {
        const tempActividad = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true
        }

        this.actividades.unshift(tempActividad)
        // EFICIENCIA: Actualización incremental del lookup map en lugar de rebuild O(n)
        this.activityLookupMap.set(tempId, tempActividad)
        syncStore.saveToLocalStorage('actividades', this.actividades)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'actividades',
          data: enrichedData,
          tempId
        })

        snackbarStore.hideLoading()
        return tempActividad
      }

      // Online flow
      try {
        const record = await pb.collection('actividades').create(enrichedData)
        this.actividades.push(record)
        // EFICIENCIA: Actualización incremental del lookup map
        this.activityLookupMap.set(record.id, record)
        syncStore.saveToLocalStorage('actividades', this.actividades)
        
        // Trigger alerta si es crítica
        if (actividadData.prioridad === 'alta') {
          try {
            const alertStore = useAlertStore()
            await alertStore.triggerCriticalActivityAlert(record)
          } catch (alertError) {
            // No fallar la creación si la alerta falla
            console.error('[ACTIVIDADES] Error enviando alerta crítica:', alertError)
          }
        }
        
        return record
      } catch (error) {
        handleError(error, 'Error al crear actividad')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateActividad(id, updateData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de actividad no proporcionado para actualización')
      }

      // OPTIMIZACIÓN: Usar lookup map O(1) en lugar de find() O(n)
      const actividad = this.activityLookupMap.get(id)
      if (!actividad) {
        snackbarStore.hideLoading()
        throw new Error(`No se encontró actividad con ID: ${id}`)
      }

      const enrichedData = {
        ...updateData,
        tipo_actividades: updateData.tipo_actividades || actividad?.tipo_actividades,
        metricas: updateData.metricas || actividad?.metricas || {},
        datos_bpa: updateData.datos_bpa || actividad?.datos_bpa || [],
        siembras: Array.isArray(updateData.siembras)
          ? updateData.siembras
          : actividad?.siembras || [],
        zonas: Array.isArray(updateData.zonas) ? updateData.zonas : actividad?.zonas || [],
        bpa_estado: this.calcularBpaEstado(updateData.datos_bpa || actividad?.datos_bpa || []),
        version: this.version
      }

      if (!syncStore.isOnline) {
        const index = this.actividades.findIndex((a) => a.id === id)
        if (index !== -1) {
          // Actualizar localmente
          this.actividades[index] = {
            ...this.actividades[index],
            ...enrichedData,
            updated: new Date().toISOString()
          }

          // Encolar la operación
          await syncStore.queueOperation({
            type: 'update',
            collection: 'actividades',
            id: id, // Usar el ID original (puede ser real o temporal)
            data: enrichedData
          })

          // EFICIENCIA: Actualizar lookup map incremental en lugar de rebuild O(n)
          this.activityLookupMap.set(id, this.actividades[index])
          syncStore.saveToLocalStorage('actividades', this.actividades)
          snackbarStore.hideLoading()
          return this.actividades[index]
        }
        snackbarStore.hideLoading()
        throw new Error('Actividad no encontrada')
      }

      // Online flow
      try {
        const record = await pb.collection('actividades').update(id, enrichedData, {
          expand: 'tipo_actividades'
        })
        const index = this.actividades.findIndex((a) => a.id === id)
        if (index !== -1) {
          this.actividades[index] = record
          syncStore.saveToLocalStorage('actividades', this.actividades)
        }
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar actividad')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async deleteActividad(id) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de actividad no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        // EFICIENCIA: Usar lookup map O(1) para verificar existencia
        const actividadExiste = this.activityLookupMap.has(id)
        if (!actividadExiste) {
          snackbarStore.hideLoading()
          throw new Error(`No se encontró actividad con ID: ${id}`)
        }

        this.actividades = this.actividades.filter((a) => a.id !== id)
        // EFICIENCIA: Eliminar del lookup map en lugar de rebuild O(n)
        this.activityLookupMap.delete(id)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'actividades',
          id
        })
        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('actividades', this.actividades)

        return true
      }

      try {
        await pb.collection('actividades').delete(id)
        this.actividades = this.actividades.filter((a) => a.id !== id)
        // EFICIENCIA: Eliminar del lookup map en lugar de rebuild O(n)
        this.activityLookupMap.delete(id)
        syncStore.saveToLocalStorage('actividades', this.actividades)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar actividad')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async fetchActividadById(id, options = {}) {
      if (!id) {
        throw new Error('ID de actividad no proporcionado')
      }

      try {
        // OPTIMIZACIÓN: Usar lookup Map O(1) en lugar de find() O(n)
        let actividad = this.activityLookupMap.get(id)

        if (actividad) {
          // Asegurar que todas las propiedades necesarias existan
          const actividadCompleta = {
            ...actividad,
            datos_bpa: actividad.datos_bpa || [],
            metricas: actividad.metricas || {},
            siembras: actividad.siembras || [],
            zonas: actividad.zonas || [],
            expand: actividad.expand || {}
          }

          return actividadCompleta
        }

        // Si estamos online y no se encontró en el store, intentar buscar en el servidor
        const syncStore = useSyncStore()
        if (syncStore.isOnline) {
          const record = await pb.collection('actividades').getOne(id, options)

          // Actualizar el store y el lookup map incrementalmente
          const actividadIndex = this.actividades.findIndex((a) => a.id === id)
          if (actividadIndex !== -1) {
            this.actividades[actividadIndex] = record
          } else {
            this.actividades.push(record)
          }

          // EFICIENCIA: Actualización incremental del lookup map
          this.activityLookupMap.set(id, record)

          // Guardar en localStorage
          syncStore.saveToLocalStorage('actividades', this.actividades)

          return record
        }

        throw new Error('Actividad no encontrada')
      } catch (error) {
        console.error('Error al obtener actividad:', error)
        throw new Error('Actividad no encontrada')
      }
    },

    /**
     * OPTIMIZACIÓN: Construye lookup Map para acceso O(1)
     * Debe llamarse cada vez que se modifica el array de actividades
     */
    buildActivityLookup() {
      this.activityLookupMap.clear()
      this.actividades.forEach(actividad => {
        this.activityLookupMap.set(actividad.id, actividad)
      })
    },

    // Método para actualizar un elemento local
    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('actividades', tempId, newItem, this.actividades, {
        referenceFields: ['actividad', 'actividades'],
        bpaFields: ['datos_bpa']
      })
    },

    // Método para actualizar referencias
    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem(
        'actividades',
        tempId,
        realId,
        this.actividades,
        ['actividad', 'actividades']
      )
    },

    // Método para eliminar un elemento local
    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('actividades', id, this.actividades)
    },

    // Nuevo método para calcular bpa_estado
    calcularBpaEstado(datosBpa) {
      if (!datosBpa || datosBpa.length === 0) return 0

      const puntosObtenidos = datosBpa.reduce((acc, pregunta) => {
        if (
          pregunta.respuesta === 'Implementado' ||
          pregunta.respuesta === 'Implementados' ||
          pregunta.respuesta === 'Implementadas' ||
          pregunta.respuesta === 'Implementada' ||
          pregunta.respuesta === 'Disponibles' ||
          pregunta.respuesta === 'Realizado' ||
          pregunta.respuesta === 'Utilizadas' ||
          pregunta.respuesta === 'Realizados' ||
          pregunta.respuesta === 'Cumplido' ||
          pregunta.respuesta === 'Disponible'
        )
          return acc + 100
        if (pregunta.respuesta === 'En proceso') return acc + 50
        return acc
      }, 0)

      return Math.round((puntosObtenidos / (datosBpa.length * 100)) * 100)
    },

    async cargarTiposActividades() {
      // Prevenir requests duplicadas
      if (this.loadingTipos) {
        console.log('[ACTIVIDADES] Ya hay una carga de tipos en progreso, esperando...')
        return this.tiposActividades
      }

      // Si ya tenemos datos y estamos offline, usar cache
      if (this.tiposActividades.length > 0 && !navigator.onLine) {
        return this.tiposActividades
      }

      // Si ya tenemos datos y estamos online, solo refresh si es necesario
      if (this.tiposActividades.length > 0) {
        return this.tiposActividades
      }

      const syncStore = useSyncStore()
      this.loadingTipos = true

      try {
        const records = await pb.collection('tipo_actividades').getFullList({
          sort: 'nombre',
          expand: 'metricas,datos_bpa'
        })
        // markRaw: lookup data doesn't need deep reactivity
        this.tiposActividades = markRaw(records.map((record) => ({
          id: record.id,
          nombre: record.nombre,
          descripcion: record.descripcion,
          datos_bpa: record.datos_bpa,
          metricas: record.metricas
        })))
        useSyncStore().saveToLocalStorage('tiposActividades', this.tiposActividades)
      } catch (error) {
        handleError(error, 'Error al cargar tipos de actividades')
      } finally {
        this.loadingTipos = false
      }
    },

    initFromLocalStorage() {
      const syncStore = useSyncStore();
      const localActividades = syncStore.loadFromLocalStorage('actividades');
      this.actividades = localActividades || [];
      // EFICIENCIA: Solo construir lookup map si hay datos y está vacío
      if (this.actividades.length > 0 && this.activityLookupMap.size === 0) {
        this.buildActivityLookup();
      }
      const localTiposActividades = syncStore.loadFromLocalStorage('tiposActividades');
      this.tiposActividades = localTiposActividades ? markRaw(localTiposActividades) : [];
      console.log('[ACT_STORE] Initialized from localStorage. Actividades:', this.actividades.length, 'Tipos:', this.tiposActividades.length);
    },

    // Standard sync methods
    applySyncedCreate(tempId, realItem) {
      const syncStore = useSyncStore();
      console.log(`[ACTIVIDADES_STORE] Applying synced create: tempId ${tempId} -> realId ${realItem.id}`);
      const index = this.actividades.findIndex(a => a.id === tempId && a._isTemp);
      if (index !== -1) {
        this.actividades[index] = { ...realItem, _isTemp: false };
      } else {
        if (!this.actividades.some(a => a.id === realItem.id)) {
            this.actividades.unshift({ ...realItem, _isTemp: false }); 
            console.log('[ACTIVIDADES_STORE] Synced item added as new (was not found by tempId).');
        } else {
            console.log('[ACTIVIDADES_STORE] Synced item already exists by realId.');
        }
      }
      syncStore.saveToLocalStorage('actividades', this.actividades);
      console.log('[ACTIVIDADES_STORE] Synced create applied, localStorage updated.');
    },

    applySyncedUpdate(id, updatedItemData) {
      const syncStore = useSyncStore();
      console.log(`[ACTIVIDADES_STORE] Applying synced update for id: ${id}`);
      const index = this.actividades.findIndex(a => a.id === id);
      if (index !== -1) {
        this.actividades[index] = { ...this.actividades[index], ...updatedItemData, _isTemp: false };
        syncStore.saveToLocalStorage('actividades', this.actividades);
        console.log('[ACTIVIDADES_STORE] Synced update applied, localStorage updated.');
      } else {
         console.warn(`[ACTIVIDADES_STORE] Could not find item with id ${id} to apply update.`);
      }
    },

    applySyncedDelete(id) {
      const syncStore = useSyncStore();
      console.log(`[ACTIVIDADES_STORE] Applying synced delete for id: ${id}`);
      const initialLength = this.actividades.length;
      this.actividades = this.actividades.filter(a => a.id !== id);
      if (this.actividades.length < initialLength) {
        syncStore.saveToLocalStorage('actividades', this.actividades);
        console.log('[ACTIVIDADES_STORE] Synced delete applied, localStorage updated.');
      } else {
        console.warn(`[ACTIVIDADES_STORE] Could not find item with id ${id} to apply delete.`);
      }
    }
  }
})

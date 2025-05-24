import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSyncStore } from './syncStore'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore'

export const useZonasStore = defineStore('zonas', {
  state: () => ({
    zonas: [],
    tiposZonas: [],
    loading: false,
    error: null,
    version: 1,
    lastSync: null
  }),

  persist: {
    key: 'zonas',
    storage: sessionStorage,
    paths: ['zonas', 'tiposZonas']
  },

  getters: {
    promedioBpaEstado() {
      const haciendaStore = useHaciendaStore()
      const zonasHacienda = this.zonas.filter(
        (zona) => zona.hacienda === haciendaStore.mi_hacienda?.id
      )
      const totalBpaEstado = zonasHacienda.reduce((acc, zona) => acc + (zona.bpa_estado || 0), 0)
      return zonasHacienda.length ? Math.round(totalBpaEstado / zonasHacienda.length) : 0
    },
    getZonaById: (state) => (id) => {
      return state.zonas.find((z) => z.id === id)
    }
  },

  actions: {
    async init() {
      this.loading = true

      try {
        await this.cargarTiposZonas()

        await this.cargarZonas() // Cargar zonas desde el servidor
      } catch (error) {
        handleError(error, 'Error al inicializar zonas')
      } finally {
        this.loading = false
      }
    },

    async cargarZonas() {
      // Local storage loading is now handled by initFromLocalStorage.
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.error = null
      this.loading = true

      // If data already populated by initFromLocalStorage, and offline, return.
      if (this.zonas.length > 0 && !navigator.onLine) {
        this.loading = false;
        return this.zonas;
      }

      try {
        // Obtener solo las zonas de la hacienda actual
        const records = await pb.collection('zonas').getFullList({
          sort: 'nombre',
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          expand: 'tipos_zonas'
        })
        this.zonas = records
        this.lastSync = Date.now()

        // Guardar zonas en localStorage para uso offline
        syncStore.saveToLocalStorage('zonas', records)
      } catch (error) {
        handleError(error, 'Error al sincronizar zonas')
      } finally {
        this.loading = false
      }
    },

    async crearZona(zonaData) {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      // Enriquecer datos con contexto de hacienda
      const enrichedData = {
        ...zonaData,
        hacienda: haciendaStore.mi_hacienda?.id,
        version: this.version,
        bpa_estado: this.calcularBpaEstado(zonaData.datos_bpa || [])
      }

      if (!syncStore.isOnline) {
        // Usar la función unificada para generar ID temporal
        const tempId = syncStore.generateTempId()

        const tempZona = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true
        }

        this.zonas.unshift(tempZona)
        syncStore.saveToLocalStorage('zonas', this.zonas)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'zonas',
          data: enrichedData,
          tempId
        })

        snackbarStore.hideLoading()
        return tempZona
      }

      // Online flow
      try {
        const record = await pb.collection('zonas').create(enrichedData, {
          expand: 'tipos_zonas'
        })
        this.zonas.push(record)
        syncStore.saveToLocalStorage('zonas', this.zonas)
        return record
      } catch (error) {
        handleError(error, 'Error al crear zona')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateZona(id, updateData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      const zona = this.getZonaById(id)
      const enrichedData = {
        ...updateData,
        bpa_estado: this.calcularBpaEstado(updateData.datos_bpa),
        datos_bpa: updateData.datos_bpa || zona?.datos_bpa || [],
        metricas: updateData.metricas || zona?.metricas || {},
        version: this.version
      }

      if (!syncStore.isOnline) {
        const index = this.zonas.findIndex((z) => z.id === id)
        if (index !== -1) {
          this.zonas[index] = {
            ...this.zonas[index],
            ...enrichedData,
            updated: new Date().toISOString()
          }
        }

        // Usar la función unificada para generar ID temporal
        const tempId = syncStore.generateTempId()
        await syncStore.queueOperation({
          type: 'update',
          collection: 'zonas',
          id,
          data: enrichedData,
          tempId
        })

        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('zonas', this.zonas)
        return this.zonas[index]
      }

      // Online flow
      try {
        const record = await pb.collection('zonas').update(id, enrichedData, {
          expand: 'tipos_zonas'
        })
        const index = this.zonas.findIndex((z) => z.id === id)
        if (index !== -1) {
          this.zonas[index] = record
        }
        syncStore.saveToLocalStorage('zonas', this.zonas)
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar zona')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async eliminarZona(id) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de zona no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        // Verificar si la zona existe antes de eliminarla
        const zonaExiste = this.zonas.some((z) => z.id === id)
        if (!zonaExiste) {
          snackbarStore.hideLoading()
          throw new Error(`No se encontró zona con ID: ${id}`)
        }

        this.zonas = this.zonas.filter((z) => z.id !== id)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'zonas',
          id
        })
        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('zonas', this.zonas)
        return true
      }

      try {
        await pb.collection('zonas').delete(id)
        this.zonas = this.zonas.filter((z) => z.id !== id)
        syncStore.saveToLocalStorage('zonas', this.zonas)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar zona')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

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

    async cargarTiposZonas() {
      // Local storage loading is now handled by initFromLocalStorage.
      const syncStore = useSyncStore(); // Keep for saving later.

      if (this.tiposZonas.length > 0 && !navigator.onLine) {
        return this.tiposZonas;
      }

      try {
        const records = await pb.collection('tipos_zonas').getFullList({
          sort: 'nombre'
        })
        this.tiposZonas = records
        // Guardar zonas en localStorage para uso offline
        useSyncStore().saveToLocalStorage('tiposZonas', records)
      } catch (error) {
        handleError(error, 'Error al cargar tipos de zonas')
      }
    },

    async cargarZonasPorSiembras(siembraIds) {
      // const zonasStore = useZonasStore()
      this.loading = true

      try {
        // Usar directamente el store de zonas para obtener las zonas filtradas
        return this.zonas.filter((zona) => siembraIds.includes(zona.siembra))
      } catch (error) {
        handleError(error, 'Error al cargar zonas por siembras')
        return []
      } finally {
        this.loading = false
      }
    },

    async cargarZonasPrecargadas() {
      // const zonasStore = useZonasStore()
      this.loading = true

      try {
        // Filtrar zonas que no pertenecen a siembras
        const zonasFiltradas = this.zonas.filter(
          (zona) => !zona.siembra // Asegúrate de que la propiedad siembra esté configurada
        )

        return zonasFiltradas // Retornar las zonas precargadas
      } catch (error) {
        handleError(error, 'Error al cargar zonas precargadas')
        return []
      } finally {
        this.loading = false
      }
    },

    async updateZonaAvatar(zonaId, avatarFile) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      try {
        const formData = new FormData()
        formData.append('avatar', avatarFile)

        const updatedZona = await pb.collection('zonas').update(zonaId, formData, {
          expand: 'tipos_zonas'
        })
        const index = this.zonas.findIndex((z) => z.id === updatedZona.id)
        if (index !== -1) {
          this.zonas[index] = updatedZona
        }
        return updatedZona
      } catch (error) {
        handleError(error, 'Error al actualizar el avatar de la zona')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('zonas', tempId, newItem, this.zonas, {
        referenceFields: ['zona', 'zonas'],
        metricFields: ['metricas']
      })
    },

    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem('zonas', tempId, realId, this.zonas, [
        'zona',
        'zonas'
      ])
    },

    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('zonas', id, this.zonas)
    },

    initFromLocalStorage() {
      const syncStore = useSyncStore();
      const localZonas = syncStore.loadFromLocalStorage('zonas');
      this.zonas = localZonas || [];
      const localTiposZonas = syncStore.loadFromLocalStorage('tiposZonas');
      this.tiposZonas = localTiposZonas || [];
      console.log('[ZONAS_STORE] Initialized from localStorage. Zonas:', this.zonas.length, 'Tipos:', this.tiposZonas.length);
    }
  }
})

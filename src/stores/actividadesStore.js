import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSyncStore } from './syncStore'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore'

export const useActividadesStore = defineStore('actividades', {
  state: () => ({
    actividades: [],
    tiposActividades: [],
    loading: false,
    error: null,
    version: 1,
    lastSync: null
  }),

  persist: {
    key: 'actividades',
    storage: sessionStorage,
    paths: ['actividades', 'tiposActividades']
  },

  getters: {
    promedioBpaEstado() {
      const haciendaStore = useHaciendaStore()
      const actividadesHacienda = this.actividades.filter(
        (actividad) => actividad.hacienda === haciendaStore.mi_hacienda?.id
      )
      const totalBpaEstado = actividadesHacienda.reduce(
        (acc, actividad) => acc + (actividad.bpa_estado || 0),
        0
      )
      return actividadesHacienda.length
        ? Math.round(totalBpaEstado / actividadesHacienda.length)
        : 0
    },

    getActividadTipo: (state) => (tipoId) => {
      const tipoActividad = state.tiposActividades.find((tipo) => tipo.id === tipoId)
      return tipoActividad ? tipoActividad.nombre : 'Desconocido'
    },

    getNombreActividad: (state) => (actividadId) => {
      const actividad = state.actividades.find((a) => a.id === actividadId)
      return actividad?.nombre || 'Actividad no encontrada'
    },

    getTiposActividades: (state) => {
      return state.tiposActividades
    }
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
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.error = null
      this.loading = true

      const actividadesLocal = useSyncStore().loadFromLocalStorage('actividades')
      if (actividadesLocal) {
        this.actividades = actividadesLocal
        this.loading = false
        return this.actividades
      }

      try {
        const records = await pb.collection('actividades').getFullList({
          sort: 'nombre',
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          expand: 'tipo_actividades,siembras'
        })
        this.actividades = records
        this.lastSync = Date.now()

        syncStore.saveToLocalStorage('actividades', records)
      } catch (error) {
        handleError(error, 'Error al cargar actividades')
      } finally {
        this.loading = false
      }
    },

    async crearActividad(actividadData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      // Enriquecer datos con contexto de hacienda
      const enrichedData = {
        ...actividadData,
        tipo_actividades: actividadData.tipo_actividades,
        hacienda: haciendaStore.mi_hacienda?.id,
        bpa_estado: this.calcularBpaEstado(actividadData.datos_bpa),
        activa: true,
        version: this.version
      }

      if (!syncStore.isOnline) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const tempActividad = {
          ...enrichedData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          _isTemp: true
        }

        this.actividades.push(tempActividad)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'actividades',
          data: enrichedData,
          tempId
        })

        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('actividades', this.actividades)

        return tempActividad
      }

      // Online flow
      try {
        const record = await pb.collection('actividades').create(enrichedData)
        this.actividades.push(record)
        syncStore.saveToLocalStorage('actividades', this.actividades)
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

      const enrichedData = {
        ...updateData,
        tipo_actividades: updateData.tipo_actividades,
        metricas: updateData.metricas || {},
        bpa_estado: this.calcularBpaEstado(updateData.datos_bpa),
        version: this.version
      }

      if (!syncStore.isOnline) {
        const index = this.actividades.findIndex((a) => a.id === id)
        if (index !== -1) {
          this.actividades[index] = { ...this.actividades[index], ...enrichedData }
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'actividades',
          id,
          data: enrichedData
        })

        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('actividades', this.actividades)

        return this.actividades[index]
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

      if (!syncStore.isOnline) {
        this.actividades = this.actividades.filter((a) => a.id !== id)

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
        syncStore.saveToLocalStorage('actividades', this.actividades)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar actividad')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    // Nuevo método para calcular bpa_estado
    calcularBpaEstado(datosBpa) {
      if (!datosBpa || datosBpa.length === 0) return 0

      const puntosObtenidos = datosBpa.reduce((acc, pregunta) => {
        if (pregunta.respuesta === 'Cumplido' || pregunta.respuesta === 'Disponible')
          return acc + 100
        if (pregunta.respuesta === 'En proceso') return acc + 50
        return acc
      }, 0)

      return Math.round((puntosObtenidos / (datosBpa.length * 100)) * 100)
    },

    async cargarTiposActividades() {
      const tiposActividadesLocal = useSyncStore().loadFromLocalStorage('tiposActividades')
      if (tiposActividadesLocal) {
        this.tiposActividades = tiposActividadesLocal
        return this.tiposActividades
      }

      try {
        const records = await pb.collection('tipo_actividades').getFullList({
          sort: 'nombre',
          expand: 'metricas,datos_bpa'
        })
        this.tiposActividades = records.map((record) => ({
          id: record.id,
          nombre: record.nombre,
          descripcion: record.descripcion,
          datos_bpa: record.datos_bpa,
          metricas: record.metricas
        }))
        useSyncStore().saveToLocalStorage('tiposActividades', this.tiposActividades)
      } catch (error) {
        handleError(error, 'Error al cargar tipos de actividades')
      }
    },

    async fetchActividadById(id) {
      const index = this.actividades.findIndex((s) => s.id === id)
      if (index !== -1) {
        return this.actividades[index] // Retorna la actividad encontrada
      } else {
        throw new Error('Actividad no encontrada') // Manejo de error si no se encuentra
      }
    }
  }
})

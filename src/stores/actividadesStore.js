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

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de actividad no proporcionado para actualización')
      }

      // Obtener la actividad actual para preservar datos importantes
      const actividad = this.actividades.find((a) => a.id === id)
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
        // Verificar si la actividad existe antes de eliminarla
        const actividadExiste = this.actividades.some((a) => a.id === id)
        if (!actividadExiste) {
          snackbarStore.hideLoading()
          throw new Error(`No se encontró actividad con ID: ${id}`)
        }

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

    async fetchActividadById(id, options = {}) {
      if (!id) {
        throw new Error('ID de actividad no proporcionado')
      }

      try {
        // Primero buscar en el store local
        const index = this.actividades.findIndex((s) => s.id === id)

        if (index !== -1) {
          const actividad = this.actividades[index]

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

          // Actualizar el store con la información obtenida
          const actividadIndex = this.actividades.findIndex((a) => a.id === id)
          if (actividadIndex !== -1) {
            this.actividades[actividadIndex] = record
          } else {
            this.actividades.push(record)
          }

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
    }
  }
})

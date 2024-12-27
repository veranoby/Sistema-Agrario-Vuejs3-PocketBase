import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useSyncStore } from './syncStore'
import { useHaciendaStore } from './haciendaStore'
import { localStorageManager } from '@/utils/localStorageUtils'

export const useActividadesStore = defineStore('actividades', {
  state: () => ({
    actividades: localStorageManager.load('actividades') || [],
    tiposActividades: localStorageManager.load('tiposActividades') || [],
    loading: false,
    error: null,
    version: 1
  }),

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
    }
  },

  actions: {
    async cargarActividades() {
      this.loading = true
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      try {
        if (syncStore.isOnline) {
          const records = await pb.collection('actividades').getFullList({
            sort: 'nombre',
            filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`
          })
          this.actividades = records
          localStorageManager.save('actividades', records)
        } else {
          this.actividades = localStorageManager.load('actividades') || []
        }
      } catch (error) {
        handleError(error, 'Error al cargar actividades')
      } finally {
        this.loading = false
      }
    },

    async crearActividad(actividadData) {
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        const tempId = `temp_${Date.now()}`
        const tempActividad = {
          ...actividadData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }

        this.actividades.push(tempActividad)
        localStorageManager.save('actividades', this.actividades)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'actividades',
          data: actividadData,
          tempId
        })

        return tempActividad
      }

      try {
        const record = await pb.collection('actividades').create(actividadData)
        this.actividades.push(record)
        localStorageManager.save('actividades', this.actividades)
        return record
      } catch (error) {
        handleError(error, 'Error al crear actividad')
        throw error
      }
    },

    async updateActividad(id, updateData) {
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        const index = this.actividades.findIndex((a) => a.id === id)
        if (index !== -1) {
          this.actividades[index] = { ...this.actividades[index], ...updateData }
          localStorageManager.save('actividades', this.actividades)
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'actividades',
          id,
          data: updateData
        })

        return this.actividades[index]
      }

      try {
        const record = await pb.collection('actividades').update(id, updateData)
        const index = this.actividades.findIndex((a) => a.id === id)
        if (index !== -1) {
          this.actividades[index] = record
          localStorageManager.save('actividades', this.actividades)
        }
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar actividad')
        throw error
      }
    },

    async deleteActividad(id) {
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        this.actividades = this.actividades.filter((a) => a.id !== id)
        localStorageManager.save('actividades', this.actividades)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'actividades',
          id
        })

        return true
      }

      try {
        await pb.collection('actividades').delete(id)
        this.actividades = this.actividades.filter((a) => a.id !== id)
        localStorageManager.save('actividades', this.actividades)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar actividad')
        throw error
      }
    },

    async fetchActividadesBySiembraId(siembraId) {
      this.loading = true
      this.error = null
      try {
        const records = await pb.collection('actividades').getFullList({
          filter: `siembra="${siembraId}"`,
          sort: 'nombre'
        })
        this.actividades = records
        return records
      } catch (error) {
        console.error('Error fetching actividades:', error)
        this.error = 'Failed to fetch actividades'
        useSnackbarStore().showError('Error al cargar las actividades')
        throw error
      } finally {
        this.loading = false
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
      // Verificar si los tipos de actividades están en localStorage
      const tiposActividadesLocal = localStorage.getItem('tiposActividades')
      if (tiposActividadesLocal) {
        this.tiposActividades = JSON.parse(tiposActividadesLocal)
        console.log('Cargado desde localStorage:', this.tiposActividades)
        return this.tiposActividades
      }

      try {
        const records = await pb.collection('tipo_actividades').getFullList({
          sort: 'nombre'
        })
        this.tiposActividades = records
        // Guardar en localStorage
        localStorage.setItem('tiposActividades', JSON.stringify(records))
        console.log('tiposActividades:', this.tiposActividades)
      } catch (error) {
        console.error('Error al cargar tipos de actividades:', error)
        handleError(error, 'Error al cargar tipos de actividades')
      }
    },

    async updateActividadAvatar(actividadId, avatarFile) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      try {
        const formData = new FormData()
        formData.append('avatar', avatarFile)

        const updatedActividad = await pb.collection('actividades').update(actividadId, formData)

        // Update the actividad in the state
        const index = this.actividades.findIndex((z) => z.id === updatedActividad.id)
        if (index !== -1) {
          this.actividades[index] = updatedActividad
        }
        return updatedActividad
      } catch (error) {
        handleError(error, 'Error al actualizar el avatar de la actividad')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async fetchActividad(id) {
      try {
        const actividad = await pb.collection('actividades').getOne(id)
        return actividad
      } catch (error) {
        handleError(error, 'Error al obtener la actividad')
        throw error
      }
    },

    // Mejorar la función shouldUpdateFromServer
    shouldUpdateFromServer(lastUpdated, entityData) {
      if (!lastUpdated) return true

      // Verificar conflictos de versión
      if (entityData.version !== this.version) return true

      const currentTime = new Date().getTime()
      const lastUpdateTime = new Date(lastUpdated).getTime()
      const timeDifference = currentTime - lastUpdateTime

      return timeDifference > this.syncInterval
    }
  }
})

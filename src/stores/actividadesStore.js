import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore' // Añadir esta importación

export const useActividadesStore = defineStore('actividades', {
  state: () => ({
    actividades: [],
    tiposActividades: [],
    loading: false,
    error: null
  }),

  getters: {
    // Nuevo getter para calcular el promedio de bpa_estado
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

    async updateActividad(id, updateData) {
      this.loading = true
      this.error = null
      try {
        // Validación básica
        if (!updateData.nombre) throw new Error('El nombre es requerido')

        if (updateData.nombre) {
          updateData.nombre = updateData.nombre.toUpperCase()
        }

        if (updateData.datos_bpa) {
          updateData.bpa_estado = this.calcularBpaEstado(updateData.datos_bpa)
        }

        const record = await pb.collection('actividades').update(id, updateData)
        const index = this.actividades.findIndex((z) => z.id === id)
        if (index !== -1) {
          this.actividades[index] = { ...this.actividades[index], ...record }
        }

        // Actualizar localStorage solo si se actualiza la actividad
        localStorage.setItem('actividades', JSON.stringify(this.actividades))
        console.log('Actividades actualizadas en localStorage:', this.actividades)

        useSnackbarStore().showSnackbar('Actividad actualizada exitosamente')
        return record
      } catch (error) {
        console.error('Error updating actividad:', error)
        this.error = 'Failed to update actividad'
        handleError(error, 'Error al actualizar la actividad')
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

    // Añadimos esta nueva función
    async cargarActividades() {
      const actividadesLocal = localStorage.getItem('actividades')
      if (actividadesLocal) {
        this.actividades = JSON.parse(actividadesLocal)
        console.log('Cargado desde localStorage:', this.actividades)
        return
      }

      // Lógica para cargar desde el servidor
      this.loading = true
      this.error = null
      try {
        const records = await pb.collection('actividades').getFullList({
          sort: 'nombre'
        })
        this.actividades = records
        localStorage.setItem('actividades', JSON.stringify(records))
        console.log('Actividades actualizadas en localStorage:', this.actividades)
      } catch (error) {
        console.error('Error cargando actividades:', error)
        this.error = 'Error al cargar actividades'
        useSnackbarStore().showError('Error al cargar las actividades')
      } finally {
        this.loading = false
      }
    },

    async crearActividad(actividadData) {
      this.loading = true
      this.error = null
      try {
        // Validación básica
        if (!actividadData.nombre) throw new Error('El nombre es requerido')

        actividadData.nombre = actividadData.nombre.toUpperCase()
        actividadData.bpa_estado = this.calcularBpaEstado(actividadData.datos_bpa)

        const record = await pb.collection('actividades').create(actividadData)
        this.actividades.push(record)

        // Actualizar localStorage
        localStorage.setItem('actividades', JSON.stringify(this.actividades))
        console.log('Actividades actualizadas en localStorage:', this.actividades)

        useSnackbarStore().showSnackbar('Actividad agregada exitosamente')
        return record
      } catch (error) {
        console.error('Error adding actividad:', error)
        this.error = 'Failed to add actividad'
        handleError(error, 'Error al agregar la actividad')
        throw error
      } finally {
        this.loading = false
      }
    },

    async eliminarActividad(id) {
      this.loading = true
      this.error = null
      try {
        await pb.collection('actividades').delete(id)
        this.actividades = this.actividades.filter((z) => z.id !== id)

        // Actualizar localStorage
        localStorage.setItem('actividades', JSON.stringify(this.actividades))
        console.log('Actividades actualizadas en localStorage:', this.actividades)

        useSnackbarStore().showSnackbar('Actividad eliminada exitosamente')
      } catch (error) {
        console.error('Error deleting actividad:', error)
        this.error = 'Failed to delete actividad'
        useSnackbarStore().showError('Error al eliminar la actividad')
        throw error
      } finally {
        this.loading = false
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

    // Método para determinar si se debe actualizar desde el servidor
    shouldUpdateFromServer(lastUpdated) {
      // Implementar lógica para determinar si los datos están desactualizados
      // Por ejemplo, comparar timestamps o un flag de actualización
      const currentTime = new Date().getTime()
      const lastUpdateTime = new Date(lastUpdated).getTime()
      const timeDifference = currentTime - lastUpdateTime

      // Definir un intervalo (por ejemplo, 5 minutos) para considerar los datos como desactualizados
      const updateInterval = 5 * 60 * 1000 // 5 minutos en milisegundos
      return timeDifference > updateInterval
    }
  }
})

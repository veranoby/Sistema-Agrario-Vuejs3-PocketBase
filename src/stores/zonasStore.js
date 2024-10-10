import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore' // Añadir esta importación

export const useZonasStore = defineStore('zonas', {
  state: () => ({
    zonas: [],
    tiposZonas: [],
    loading: false,
    error: null
  }),

  getters: {
    // Nuevo getter para calcular el promedio de bpa_estado
    promedioBpaEstado() {
      const haciendaStore = useHaciendaStore()
      const zonasHacienda = this.zonas.filter(
        (zona) => zona.hacienda === haciendaStore.mi_hacienda?.id
      )
      const totalBpaEstado = zonasHacienda.reduce((acc, zona) => acc + (zona.bpa_estado || 0), 0)
      return zonasHacienda.length ? Math.round(totalBpaEstado / zonasHacienda.length) : 0
    }
  },

  actions: {
    async fetchZonasBySiembraId(siembraId) {
      this.loading = true
      this.error = null
      try {
        const records = await pb.collection('zonas').getFullList({
          filter: `siembra="${siembraId}"`,
          sort: 'nombre'
        })
        this.zonas = records
        return records
      } catch (error) {
        console.error('Error fetching zonas:', error)
        this.error = 'Failed to fetch zonas'
        useSnackbarStore().showError('Error al cargar las zonas')
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateZona(id, updateData) {
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

        const record = await pb.collection('zonas').update(id, updateData)
        const index = this.zonas.findIndex((z) => z.id === id)
        if (index !== -1) {
          this.zonas[index] = { ...this.zonas[index], ...record }
        }
        useSnackbarStore().showSnackbar('Zona actualizada exitosamente')
        return record
      } catch (error) {
        console.error('Error updating zona:', error)
        this.error = 'Failed to update zona'
        handleError(error, 'Error al actualizar la zona')
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

    async cargarTiposZonas() {
      try {
        const records = await pb.collection('tipos_zonas').getFullList({
          sort: 'nombre'
        })
        this.tiposZonas = records
        console.log('tiposZonas:', this.tiposZonas)
      } catch (error) {
        console.error('Error al cargar tipos de zonas:', error)
        handleError(error, 'Error al cargar tipos de zonas')
      }
    },

    // Añadimos esta nueva función
    async cargarZonas() {
      this.loading = true
      this.error = null
      try {
        const records = await pb.collection('zonas').getFullList({
          sort: 'nombre'
        })
        this.zonas = records
        return records
      } catch (error) {
        console.error('Error cargando zonas:', error)
        this.error = 'Error al cargar zonas'
        useSnackbarStore().showError('Error al cargar las zonas')
        throw error
      } finally {
        this.loading = false
      }
    },

    async crearZona(zonaData) {
      this.loading = true
      this.error = null
      try {
        // Validación básica
        if (!zonaData.nombre) throw new Error('El nombre es requerido')

        zonaData.nombre = zonaData.nombre.toUpperCase()
        zonaData.bpa_estado = this.calcularBpaEstado(zonaData.datos_bpa)

        const record = await pb.collection('zonas').create(zonaData)
        this.zonas.push(record)
        useSnackbarStore().showSnackbar('Zona agregada exitosamente')
        return record
      } catch (error) {
        console.error('Error adding zona:', error)
        this.error = 'Failed to add zona'
        handleError(error, 'Error al agregar la zona')
        throw error
      } finally {
        this.loading = false
      }
    },

    async eliminarZona(id) {
      this.loading = true
      this.error = null
      try {
        await pb.collection('zonas').delete(id)
        this.zonas = this.zonas.filter((z) => z.id !== id)
        useSnackbarStore().showSnackbar('Zona eliminada exitosamente')
      } catch (error) {
        console.error('Error deleting zona:', error)
        this.error = 'Failed to delete zona'
        useSnackbarStore().showError('Error al eliminar la zona')
        throw error
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

        const updatedZona = await pb.collection('zonas').update(zonaId, formData)

        // Update the zona in the state
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

    async fetchZona(id) {
      try {
        const zona = await pb.collection('zonas').getOne(id)
        return zona
      } catch (error) {
        handleError(error, 'Error al obtener la zona')
        throw error
      }
    }
  }
})

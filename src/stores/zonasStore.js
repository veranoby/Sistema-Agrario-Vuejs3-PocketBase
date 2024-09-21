import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'

export const useZonasStore = defineStore('zonas', {
  state: () => ({
    zonas: [],
    tiposZonas: [],
    loading: false,
    error: null
  }),

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

    async addZona(zonaData) {
      this.loading = true
      this.error = null
      try {
        // Convertimos el nombre a mayúsculas
        zonaData.nombre = zonaData.nombre.toUpperCase()
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

    async updateZona(id, updateData) {
      this.loading = true
      this.error = null
      try {
        // Convertimos el nombre a mayúsculas si está presente en updateData
        if (updateData.nombre) {
          updateData.nombre = updateData.nombre.toUpperCase()
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

    async deleteZona(id) {
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

    async cargarTiposZonas() {
      try {
        const records = await pb.collection('tipos_zonas').getFullList({
          sort: 'nombre'
        })
        this.tiposZonas = records
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
      return this.addZona(zonaData)
    },

    async actualizarZona(id, updateData) {
      return this.updateZona(id, updateData)
    },

    async eliminarZona(id) {
      return this.deleteZona(id)
    }
  }
})
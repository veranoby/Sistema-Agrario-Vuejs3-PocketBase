import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import placeholderSiembras from '@/assets/placeholder-siembras.png'

export const useSiembrasStore = defineStore('siembras', {
  state: () => ({
    siembras: [],
    zonas: [],
    actividades: [],
    loading: false,
    error: null,
    cache: {}
  }),

  getters: {
    getSiembraById: (state) => (id) => {
      return state.siembras.find((siembra) => siembra.id === id)
    },
    activeSiembras: (state) => {
      return state.siembras.filter((siembra) => siembra.estado !== 'finalizada')
    },

    getSiembraAvatarUrl: () => (siembra) => {
      if (siembra && siembra.avatar) {
        return pb.getFileUrl(siembra, siembra.avatar)
      }
      return placeholderSiembras
    }
  },

  actions: {
    async fetchSiembras() {
      this.loading = true
      this.error = null
      try {
        const records = await pb.collection('siembras').getFullList({
          sort: '-created',
          expand: 'zona,hacienda'
        })
        this.siembras = records
      } catch (error) {
        console.error('Error fetching siembras:', error)
        this.error = 'Failed to fetch siembras'
        useSnackbarStore().showError('Error al cargar las siembras')
      } finally {
        this.loading = false
      }
    },

    async createSiembra(siembraData) {
      this.loading = true
      this.error = null
      try {
        if (!siembraData.nombre || !siembraData.estado || !siembraData.fecha_inicio) {
          throw new Error('Nombre, estado y fecha de inicio son campos requeridos')
        }

        const record = await pb.collection('siembras').create(siembraData)
        this.siembras.unshift(record)
        useSnackbarStore().showSnackbar('Siembra creada exitosamente')
        return record
      } catch (error) {
        console.error('Error creating siembra:', error)
        this.error = 'Failed to create siembra'
        handleError(error, 'Error al crear la siembra')
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateSiembra(id, updateData) {
      this.loading = true
      this.error = null
      try {
        if (updateData.nombre === '') {
          throw new Error('El nombre no puede estar vacío')
        }

        const record = await pb.collection('siembras').update(id, updateData)
        const index = this.siembras.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.siembras[index] = { ...this.siembras[index], ...record }
        }
        useSnackbarStore().showSnackbar('Siembra actualizada exitosamente')
        return record
      } catch (error) {
        console.error('Error updating siembra:', error)
        this.error = 'Failed to update siembra'
        handleError(error, 'Error al actualizar la siembra')
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateSiembraAvatar(siembraId, file) {
      this.loading = true
      this.error = null
      try {
        const formData = new FormData()
        formData.append('avatar', file)

        const updatedSiembra = await pb.collection('siembras').update(siembraId, formData)
        const index = this.siembras.findIndex((s) => s.id === siembraId)
        if (index !== -1) {
          this.siembras[index] = { ...this.siembras[index], ...updatedSiembra }
        }
        useSnackbarStore().showSnackbar('Avatar de siembra actualizado con éxito', 'success')
        return updatedSiembra
      } catch (error) {
        console.error('Error updating siembra avatar:', error)
        this.error = 'Failed to update siembra avatar'
        handleError(error, 'Error al actualizar el avatar de la siembra')
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteSiembra(id) {
      this.loading = true
      this.error = null
      try {
        await pb.collection('siembras').delete(id)
        this.siembras = this.siembras.filter((s) => s.id !== id)
        useSnackbarStore().showSnackbar('Siembra eliminada exitosamente')
      } catch (error) {
        console.error('Error deleting siembra:', error)
        this.error = 'Failed to delete siembra'
        useSnackbarStore().showError('Error al eliminar la siembra')
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchSiembraById(id) {
      this.loading = true
      this.error = null
      try {
        const record = await pb.collection('siembras').getOne(id, {
          expand: 'zona,hacienda'
        })

        // Asegúrate de que el avatar esté incluido en el registro
        if (record.avatar) {
          record.avatarUrl = this.getSiembraAvatarUrl(record)
        } else {
          record.avatarUrl = placeholderSiembras
        }

        const index = this.siembras.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.siembras[index] = record
        } else {
          this.siembras.push(record)
        }

        // Actualizar caché
        this.cache[id] = {
          data: record,
          timestamp: Date.now()
        }

        return record
      } catch (error) {
        console.error('Error fetching siembra:', error)
        this.error = 'Failed to fetch siembra'
        useSnackbarStore().showError('Error al cargar la siembra')
        throw error
      } finally {
        this.loading = false
      }
    },

    updateSiembraInStore(siembra) {
      const index = this.siembras.findIndex((s) => s.id === siembra.id)
      if (index !== -1) {
        this.siembras[index] = siembra
      } else {
        this.siembras.push(siembra)
      }
    },

    async fetchActividadesByHaciendaId(haciendaId) {
      this.loading = true
      this.error = null
      try {
        const records = await pb.collection('actividades').getFullList({
          filter: `hacienda="${haciendaId}"`,
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
    }
  }
})

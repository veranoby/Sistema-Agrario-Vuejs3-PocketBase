import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useSyncStore } from './syncStore'
import { useHaciendaStore } from './haciendaStore'
//import { useAvatarStore } from './avatarStore'

export const useSiembrasStore = defineStore('siembras', {
  state: () => ({
    siembras: [],
    zonas: [],
    actividades: [],
    loading: false,
    error: null,
    version: 1
  }),

  getters: {
    getSiembraById: (state) => (id) => {
      return state.siembras.find((siembra) => siembra.id === id)
    },

    activeSiembras: (state) => {
      return state.siembras.filter((siembra) => siembra.estado !== 'finalizada')
    }
  },

  actions: {
    async cargarSiembras() {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.loading = true

      const siembrasLocal = useSyncStore().loadFromLocalStorage('siembras')
      if (siembrasLocal) {
        this.siembras = siembrasLocal
        return this.siembras
      }

      try {
        if (syncStore.isOnline) {
          const records = await pb.collection('siembras').getFullList({
            filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`
          })
          this.siembras = records
          syncStore.saveToLocalStorage('siembras', records)
        } else {
          this.siembras = syncStore.loadFromLocalStorage('siembras') || []
        }
      } catch (error) {
        handleError(error, 'Error al cargar siembras')
      } finally {
        this.loading = false
      }
    },

    async crearSiembra(siembraData) {
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        const tempId = `temp_${Date.now()}`
        const tempSiembra = {
          ...siembraData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }

        this.siembras.unshift(tempSiembra)
        syncStore.saveToLocalStorage('siembras', this.siembras)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'siembras',
          data: siembraData,
          tempId
        })

        return tempSiembra
      }

      try {
        const record = await pb.collection('siembras').create(siembraData)
        this.siembras.unshift(record)
        syncStore.saveToLocalStorage('siembras', this.siembras)
        useSnackbarStore().showSnackbar('Siembra creada exitosamente')
        return record
      } catch (error) {
        handleError(error, 'Error al crear la siembra')
        throw error
      }
    },

    async updateSiembra(id, updateData) {
      const syncStore = useSyncStore()

      const siembra = this.getSiembraById(id)
      const dataToUpdate = {
        ...updateData,
        avatar: updateData.avatar || siembra?.avatar
      }

      if (!syncStore.isOnline) {
        const index = this.siembras.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.siembras[index] = { ...this.siembras[index], ...dataToUpdate }
          syncStore.saveToLocalStorage('siembras', this.siembras)
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'siembras',
          id,
          data: dataToUpdate
        })

        return this.siembras[index]
      }

      try {
        const record = await pb.collection('siembras').update(id, dataToUpdate)
        const index = this.siembras.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.siembras[index] = { ...this.siembras[index], ...record }
        }
        syncStore.saveToLocalStorage('siembras', this.siembras)
        useSnackbarStore().showSnackbar('Siembra actualizada exitosamente')
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar la siembra')
        throw error
      }
    },

    async eliminarSiembra(id) {
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        this.siembras = this.siembras.filter((s) => s.id !== id)
        syncStore.saveToLocalStorage('siembras', this.siembras)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'siembras',
          id
        })

        return true
      }

      try {
        await pb.collection('siembras').delete(id)
        this.siembras = this.siembras.filter((s) => s.id !== id)
        syncStore.saveToLocalStorage('siembras', this.siembras)
        useSnackbarStore().showSnackbar('Siembra eliminada exitosamente')
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar la siembra')
        throw error
      }
    },

    /*  async fetchSiembraById(id) {
      const syncStore = useSyncStore()

      this.loading = true
      try {
        const record = await pb.collection('siembras').getOne(id, {
          expand: 'zona,hacienda'
        })

        const avatarStore = useAvatarStore()
        record.avatarUrl = avatarStore.getAvatarUrl({ ...record, type: 'siembra' }, 'Siembras')

        const index = this.siembras.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.siembras[index] = record
        } else {
          this.siembras.push(record)
        }

        syncStore.saveToLocalStorage('siembras', this.siembras)
        return record
      } catch (error) {
        handleError(error, 'Error al obtener la siembra')
        throw error
      } finally {
        this.loading = false
      }
    } */

    async fetchSiembraById(id) {
      console.log('entrando a fetchSiembraById: id=', id)
      const index = this.siembras.findIndex((s) => s.id === id)
      if (index !== -1) {
        return this.siembras[index] // Retorna la actividad encontrada
      } else {
        throw new Error('Actividad no encontrada') // Manejo de error si no se encuentra
      }
    }
  }
})

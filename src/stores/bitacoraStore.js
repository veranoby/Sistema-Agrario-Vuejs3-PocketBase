import { defineStore } from 'pinia'

import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'

export const useBitacoraStore = defineStore('bitacora', {
  state: () => ({
    bitacoraEntries: [],
    isLoading: false
  }),

  actions: {
    async fetchBitacoraBySiembraId(siembraId) {
      this.isLoading = true
      try {
        const records = await pb.collection('bitacora').getList(1, 50, {
          filter: `siembra="${siembraId}"`,
          sort: '-fecha',
          expand: 'actividad,zona,responsable'
        })
        this.bitacoraEntries = records.items
        return this.bitacoraEntries
      } catch (error) {
        handleError(error, 'Error al cargar la bitácora')
        return []
      } finally {
        this.isLoading = false
      }
    },

    async addBitacoraEntry(entry) {
      this.isLoading = true
      try {
        const record = await pb.collection('bitacora').create(entry)
        this.bitacoraEntries.unshift(record)
        return record
      } catch (error) {
        handleError(error, 'Error al agregar entrada a la bitácora')
        return null
      } finally {
        this.isLoading = false
      }
    },

    async updateBitacoraEntry(id, updates) {
      this.isLoading = true
      try {
        const record = await pb.collection('bitacora').update(id, updates)
        const index = this.bitacoraEntries.findIndex((entry) => entry.id === id)
        if (index !== -1) {
          this.bitacoraEntries[index] = { ...this.bitacoraEntries[index], ...record }
        }
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar entrada de la bitácora')
        return null
      } finally {
        this.isLoading = false
      }
    },

    async deleteBitacoraEntry(id) {
      this.isLoading = true
      try {
        await pb.collection('bitacora').delete(id)
        this.bitacoraEntries = this.bitacoraEntries.filter((entry) => entry.id !== id)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar entrada de la bitácora')
        return false
      } finally {
        this.isLoading = false
      }
    }
  }
})

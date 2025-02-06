import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSyncStore } from './syncStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSnackbarStore } from './snackbarStore'

export const useRecordatoriosStore = defineStore('recordatorios', {
  state: () => ({
    recordatorios: [],
    loading: false,
    error: null,
    version: 1,
    lastSync: null
  }),

  persist: {
    key: 'recordatorios',
    storage: sessionStorage,
    paths: ['recordatorios']
  },

  actions: {
    async cargarRecordatorios() {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.error = null
      this.loading = true

      // Cargar datos locales primero
      const recordatoriosLocal = syncStore.loadFromLocalStorage('recordatorios')
      if (recordatoriosLocal) {
        this.recordatorios = recordatoriosLocal
        this.loading = false
        return this.recordatorios
      }

      try {
        const result = await pb.collection('recordatorios').getFullList({
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          sort: '-fecha_recordatorio',
          expand: 'actividades'
        })
        this.recordatorios = result
        this.lastSync = Date.now()

        // Guardar recordatorios en localStorage para uso offline
        syncStore.saveToLocalStorage('recordatorios', result)

        return result
      } catch (error) {
        handleError(error, 'Error al cargar recordatorios')
      } finally {
        this.loading = false
      }
    },

    async crearRecordatorio(recordatorioData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      // Enriquecer datos con contexto de hacienda
      const fechaAjustada = recordatorioData.fecha_recordatorio.includes('T')
        ? recordatorioData.fecha_recordatorio
        : `${recordatorioData.fecha_recordatorio}T00:00:00.000Z`

      const enrichedData = {
        ...recordatorioData,
        estado: 'pendiente',
        version: this.version,
        hacienda: haciendaStore.mi_hacienda?.id,
        fecha_recordatorio: fechaAjustada
      }

      if (!syncStore.isOnline) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const tempRecordatorio = {
          ...enrichedData,
          id: tempId,
          _isTemp: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }

        this.recordatorios.push(tempRecordatorio)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'recordatorios',
          data: enrichedData,
          tempId
        })
        snackbarStore.hideLoading()

        syncStore.saveToLocalStorage('recordatorios', this.recordatorios)

        return tempRecordatorio
      }

      try {
        const record = await pb.collection('recordatorios').create(enrichedData)
        this.recordatorios.push(record)
        syncStore.saveToLocalStorage('recordatorios', this.recordatorios)
        return record
      } catch (error) {
        handleError(error, 'Error al crear recordatorio')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async actualizarRecordatorio(id, newData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      const enrichedData = {
        ...newData,
        version: this.version
      }

      if (!syncStore.isOnline) {
        const index = this.recordatorios.findIndex((r) => r.id === id)
        if (index !== -1) {
          this.recordatorios[index] = { ...this.recordatorios[index], ...enrichedData }
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'recordatorios',
          id,
          data: enrichedData
        })
        snackbarStore.hideLoading()
        syncStore.saveToLocalStorage('recordatorios', this.recordatorios)
        return this.recordatorios[index]
      }

      // Online flow
      try {
        // Actualizar con expand
        const updatedRecordatorio = await pb.collection('recordatorios').update(id, enrichedData, {
          expand: 'actividades'
        })

        const index = this.recordatorios.findIndex((r) => r.id === id)
        if (index !== -1) {
          this.recordatorios[index] = updatedRecordatorio
        }

        syncStore.saveToLocalStorage('recordatorios', this.recordatorios)
        return updatedRecordatorio
      } catch (error) {
        handleError(error, 'Error al actualizar recordatorio')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async eliminarRecordatorio(id) {
      if (confirm('¿Estás seguro de eliminar este recordatorio?')) {
        const snackbarStore = useSnackbarStore()
        snackbarStore.showLoading()
        const syncStore = useSyncStore()

        if (!syncStore.isOnline) {
          this.recordatorios = this.recordatorios.filter((recordatorio) => recordatorio.id !== id)

          await syncStore.queueOperation({
            type: 'delete',
            collection: 'recordatorios',
            id
          })

          snackbarStore.hideLoading()
          syncStore.saveToLocalStorage('recordatorios', this.recordatorios)

          return true
        }

        try {
          await pb.collection('recordatorios').delete(id)
          this.recordatorios = this.recordatorios.filter((recordatorio) => recordatorio.id !== id)
          syncStore.saveToLocalStorage('recordatorios', this.recordatorios)

          return true
        } catch (error) {
          handleError(error, 'Error al eliminar recordatorio')
          throw error
        } finally {
          snackbarStore.hideLoading()
        }
      }
    },

    async actualizarEstado(id, nuevoEstado) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        await this.actualizarRecordatorio(id, { estado: nuevoEstado })
        snackbarStore.showSnackbar('Estado actualizado')
      } catch (error) {
        handleError(error, 'Error al cambiar estado')
      } finally {
        snackbarStore.hideLoading()
      }
    }

    /*  async editarRecordatorio(id) {
      const recordatorio = this.recordatorios.find((r) => r.id === id)
      if (recordatorio) {
        editando.value = true
        recordatorioEdit.value = {
          ...recordatorio,
          siembras: recordatorio.siembras || [],
          actividades: recordatorio.actividades || [],
          zonas: recordatorio.zonas || []
        }
        dialog.value = true
      }
    } */
  }
})

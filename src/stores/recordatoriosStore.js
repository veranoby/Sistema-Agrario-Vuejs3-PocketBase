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
    lastSync: null,
    dialog: false,
    editando: false,
    recordatorioEdit: null
  }),

  getters: {
    recordatoriosPorActividad: (state) => (actividadId) => {
      return (state.recordatorios || []).filter((r) => r.actividades?.includes(actividadId))
    },

    recordatoriosPendientes:
      (state) =>
      (actividadId = null) => {
        const filtered = state.recordatorios.filter((r) => r.estado === 'pendiente')
        return actividadId
          ? filtered.filter((r) => r.actividades && r.actividades.includes(actividadId))
          : filtered
      },

    recordatoriosEnProgreso:
      (state) =>
      (actividadId = null) => {
        const filtered = state.recordatorios.filter((r) => r.estado === 'en_progreso')
        return actividadId
          ? filtered.filter((r) => r.actividades && r.actividades.includes(actividadId))
          : filtered
      },

    recordatoriosCompletados:
      (state) =>
      (actividadId = null) => {
        const filtered = state.recordatorios.filter((r) => r.estado === 'completado')
        return actividadId ? filtered.filter((r) => r.actividades?.includes(actividadId)) : filtered
      }
  },

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
        const records = await pb.collection('recordatorios').getFullList({
          sort: '-created',
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`,
          expand: 'actividades.tipo_actividades,zonas.tipos_zonas'
        })
        this.recordatorios = records
        this.lastSync = Date.now()

        // Guardar recordatorios en localStorage para uso offline
        syncStore.saveToLocalStorage('recordatorios', records)

        return records
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
        const record = await pb.collection('recordatorios').create(enrichedData, {
          expand: 'actividades.tipo_actividades,zonas.tipos_zonas'
        })
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
        const record = await pb.collection('recordatorios').update(id, enrichedData, {
          expand: 'actividades.tipo_actividades,zonas.tipos_zonas'
        })

        const index = this.recordatorios.findIndex((r) => r.id === id)
        if (index !== -1) {
          this.recordatorios[index] = record
        }

        syncStore.saveToLocalStorage('recordatorios', this.recordatorios)
        return record
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
    },

    crearRecordatorioVacio(actividadId = null) {
      return {
        titulo: '',
        descripcion: '',
        fecha_recordatorio: new Date().toISOString().substr(0, 10),
        prioridad: 'media',
        estado: 'pendiente',
        siembras: [],
        actividades: actividadId ? [actividadId] : [],
        zonas: []
      }
    },

    abrirNuevoRecordatorio(actividadId = null) {
      this.editando = false
      this.recordatorioEdit = this.crearRecordatorioVacio(actividadId)
      this.dialog = true
    },

    async editarRecordatorio(id) {
      const recordatorio = this.recordatorios.find((r) => r.id === id)
      if (recordatorio) {
        this.editando = true
        this.recordatorioEdit = {
          ...recordatorio,
          siembras: recordatorio.siembras || [],
          actividades: recordatorio.actividades || [],
          zonas: recordatorio.zonas || []
        }
        this.dialog = true
      }
    }
  }
})

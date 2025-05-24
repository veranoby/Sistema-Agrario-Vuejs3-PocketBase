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
    async init() {
      try {
        await this.cargarRecordatorios()
        return true
      } catch (error) {
        handleError(error, 'Error al inicializar recordatorios')
        return false
      }
    },

    async cargarRecordatorios() {
      // Local storage loading is now handled by initFromLocalStorage.
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.error = null
      this.loading = true

      // If data already populated by initFromLocalStorage, and offline, return.
      if (this.recordatorios.length > 0 && !navigator.onLine) {
        this.loading = false;
        return this.recordatorios;
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
        const tempId = syncStore.generateTempId()
        const tempRecordatorio = {
          ...enrichedData,
          id: tempId,
          _isTemp: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        }

        this.recordatorios.unshift(tempRecordatorio)
        syncStore.saveToLocalStorage('recordatorios', this.recordatorios)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'recordatorios',
          data: enrichedData,
          tempId
        })
        snackbarStore.hideLoading()

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

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de recordatorio no proporcionado para actualización')
      }

      const recordatorio = this.recordatorios.find((r) => r.id === id)
      if (!recordatorio) {
        snackbarStore.hideLoading()
        throw new Error(`No se encontró recordatorio con ID: ${id}`)
      }

      const enrichedData = {
        ...newData,
        actividades: newData.actividades || recordatorio?.actividades || [],
        zonas: newData.zonas || recordatorio?.zonas || [],
        siembras: newData.siembras || recordatorio?.siembras || [],
        version: this.version
      }

      if (!syncStore.isOnline) {
        const index = this.recordatorios.findIndex((r) => r.id === id)
        if (index !== -1) {
          this.recordatorios[index] = {
            ...this.recordatorios[index],
            ...enrichedData,
            updated: new Date().toISOString()
          }
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
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      // Verificar que el ID existe
      if (!id) {
        snackbarStore.hideLoading()
        throw new Error('ID de recordatorio no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        // Verificar si el recordatorio existe antes de eliminarlo
        const recordatorioExiste = this.recordatorios.some(r => r.id === id)
        if (!recordatorioExiste) {
          snackbarStore.hideLoading()
          throw new Error(`No se encontró recordatorio con ID: ${id}`)
        }

        this.recordatorios = this.recordatorios.filter((r) => r.id !== id)

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
        this.recordatorios = this.recordatorios.filter((r) => r.id !== id)
        syncStore.saveToLocalStorage('recordatorios', this.recordatorios)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar recordatorio')
        throw error
      } finally {
        snackbarStore.hideLoading()
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

    editarRecordatorio(id) {
      const recordatorio = this.recordatorios.find((r) => r.id === id)
      if (recordatorio) {
        this.recordatorioEdit = { ...recordatorio }
        this.dialog = true
        this.editando = true
      }
    },

    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem(
        'recordatorios',
        tempId,
        newItem,
        this.recordatorios,
        {
          referenceFields: ['recordatorio', 'recordatorios']
        }
      )
    },

    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem(
        'recordatorios',
        tempId,
        realId,
        this.recordatorios,
        ['recordatorio', 'recordatorios']
      )
    },

    removeLocalItem(id) {
      return useSyncStore().removeLocalItem(
        'recordatorios',
        id,
        this.recordatorios
      )
    },

    initFromLocalStorage() {
      const syncStore = useSyncStore();
      const localRecordatorios = syncStore.loadFromLocalStorage('recordatorios');
      this.recordatorios = localRecordatorios || [];
      console.log('[REC_STORE] Initialized from localStorage. Recordatorios:', this.recordatorios.length);
    }
  }
})

import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import { pb } from '@/utils/pocketbase'
import { useSyncStore } from '@/stores/sync/index'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { logger } from '@/utils/logger'

export const useRecordatoriosStore = defineStore('recordatorios', {
  state: () => ({
    recordatorios: [],
    loading: false,
    error: null,
    version: 1,
    lastSync: null,
    dialog: false,
    editando: false,
    recordatorioEdit: {
      titulo: '',
      descripcion: '',
      fecha_recordatorio: new Date().toISOString().substr(0, 10),
      prioridad: 'media',
      estado: 'pendiente',
      siembras: [],
      actividades: [],
      zonas: []
    }
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
    storage: localStorage,
    paths: ['recordatorios']
  },

  sync: {
    collectionName: 'recordatorios',
    stateProp: 'recordatorios'
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
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.error = null
      this.loading = true

      if (this.recordatorios.length > 0 && !navigator.onLine) {
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

        // CORRECTO: Sanitizar con JSON.parse(JSON.stringify()) para IndexedDB
        syncStore.saveToLocalStorage('recordatorios', JSON.parse(JSON.stringify(toRaw(this.recordatorios))));

        return records
      } catch (error) {
        handleError(error, 'Error al cargar recordatorios')
      } finally {
        this.loading = false
      }
    },

    async crearRecordatorio(recordatorioData) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      let fechaAjustada = null
      if (recordatorioData.fecha_recordatorio) {
        fechaAjustada = recordatorioData.fecha_recordatorio.includes('T')
          ? recordatorioData.fecha_recordatorio
          : `${recordatorioData.fecha_recordatorio}T00:00:00.000Z`
      }

      const enrichedData = {
        ...recordatorioData,
        actividades: recordatorioData.actividades || [],
        zonas: recordatorioData.zonas || [],
        siembras: recordatorioData.siembras || [],
        estado: 'pendiente',
        version: this.version,
        hacienda: haciendaStore.mi_hacienda?.id,
        fecha_recordatorio: fechaAjustada,
        fecha_creacion: new Date().toISOString()
      }

      if (!syncStore.isOnline) {
        const tempId = syncStore.generateTempId()
        const tempRecordatorio = {
          ...enrichedData,
          id: tempId,
          _isTemp: true,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          fecha_creacion: new Date().toISOString()
        }

        this.recordatorios.unshift(tempRecordatorio)
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('recordatorios', JSON.parse(JSON.stringify(toRaw(this.recordatorios))));

        await syncStore.queueOperation({
          type: 'create',
          collection: 'recordatorios',
          data: enrichedData,
          tempId
        })
        uiFeedbackStore.hideLoading()

        return tempRecordatorio
      }

      try {
        const record = await pb.collection('recordatorios').create(enrichedData, {
          expand: 'actividades.tipo_actividades,zonas.tipos_zonas'
        })
        this.recordatorios.push(record)
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('recordatorios', JSON.parse(JSON.stringify(toRaw(this.recordatorios))));
        return record
      } catch (error) {
        handleError(error, 'Error al crear recordatorio')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async actualizarRecordatorio(id, newData) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID de recordatorio no proporcionado para actualización')
      }

      const recordatorio = this.recordatorios.find((r) => r.id === id)
      if (!recordatorio) {
        uiFeedbackStore.hideLoading()
        throw new Error(`No se encontró recordatorio con ID: ${id}`)
      }

      const enrichedData = {
        ...newData,
        actividades: newData.actividades || recordatorio?.actividades || [],
        zonas: newData.zonas || recordatorio?.zonas || [],
        siembras: newData.siembras || recordatorio?.siembras || [],
        version: this.version
      }

      if (newData.fechaActualizar) {
        enrichedData['fecha_creacion'] = new Date().toISOString()
      }

      delete enrichedData.fechaActualizar

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

        uiFeedbackStore.hideLoading()
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('recordatorios', JSON.parse(JSON.stringify(toRaw(this.recordatorios))));
        return this.recordatorios[index]
      }

      try {
        const record = await pb.collection('recordatorios').update(id, enrichedData, {
          expand: 'actividades.tipo_actividades,zonas.tipos_zonas'
        })

        const index = this.recordatorios.findIndex((r) => r.id === id)
        if (index !== -1) {
          this.recordatorios[index] = record
        }
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('recordatorios', JSON.parse(JSON.stringify(toRaw(this.recordatorios))));
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar recordatorio')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async eliminarRecordatorio(id) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()
      const syncStore = useSyncStore()

      if (!id) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID de recordatorio no proporcionado para eliminación')
      }

      if (!syncStore.isOnline) {
        const recordatorioExiste = this.recordatorios.some((r) => r.id === id)
        if (!recordatorioExiste) {
          uiFeedbackStore.hideLoading()
          throw new Error(`No se encontró recordatorio con ID: ${id}`)
        }

        this.recordatorios = this.recordatorios.filter((r) => r.id !== id)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'recordatorios',
          id
        })
        uiFeedbackStore.hideLoading()
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('recordatorios', JSON.parse(JSON.stringify(toRaw(this.recordatorios))));
        return true
      }

      try {
        await pb.collection('recordatorios').delete(id)
        this.recordatorios = this.recordatorios.filter((r) => r.id !== id)
        // CORRECTO: Sanitizar para IndexedDB
        syncStore.saveToLocalStorage('recordatorios', JSON.parse(JSON.stringify(toRaw(this.recordatorios))));
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar recordatorio')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async actualizarEstado(id, nuevoEstado) {
      const uiFeedbackStore = useUiFeedbackStore()
      uiFeedbackStore.showLoading()

      try {
        await this.actualizarRecordatorio(id, { estado: nuevoEstado })
        uiFeedbackStore.showSnackbar('Estado actualizado')
      } catch (error) {
        handleError(error, 'Error al cambiar estado')
      } finally {
        uiFeedbackStore.hideLoading()
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
      return useSyncStore().updateLocalItem('recordatorios', tempId, newItem, this.recordatorios, {
        referenceFields: ['recordatorio', 'recordatorios']
      })
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
      return useSyncStore().removeLocalItem('recordatorios', id, this.recordatorios)
    },

    async initFromLocalStorage() {
      const syncStore = useSyncStore();
      // CORRECTO: Usar await para loadFromLocalStorage
      const localRecordatorios = await syncStore.loadFromLocalStorage('recordatorios');
      // CORRECTO: Validar que sea array
      this.recordatorios = (localRecordatorios && Array.isArray(localRecordatorios)) ? localRecordatorios : [];
      console.log('[RECORDATORIOS_STORE] Initialized from localStorage. Recordatorios:', this.recordatorios.length);
    }
  }
})

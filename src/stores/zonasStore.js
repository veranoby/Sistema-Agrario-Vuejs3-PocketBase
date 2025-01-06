import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { useSyncStore } from './syncStore'
import { useSnackbarStore } from './snackbarStore'
import { handleError } from '@/utils/errorHandler'
import { useHaciendaStore } from './haciendaStore'

export const useZonasStore = defineStore('zonas', {
  state: () => ({
    zonas: [],
    tiposZonas: [],
    loading: false,
    error: null,
    version: 1,
    lastSync: null
  }),

  getters: {
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
    async init() {
      const syncStore = useSyncStore()
      this.loading = true

      try {
        await this.cargarTiposZonas()

        // Si está online, sincronizar con servidor
        if (syncStore.isOnline) {
          await this.syncWithServer()
        }
      } catch (error) {
        handleError(error, 'Error al inicializar zonas')
      } finally {
        this.loading = false
      }
    },

    async cargarZonas() {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      this.error = null
      this.loading = true

      // Cargar datos locales primero
      const zonasLocal = syncStore.loadFromLocalStorage('zonas')
      if (zonasLocal) {
        this.zonas = zonasLocal
        console.log('Cargado zonas desde localStorage:', this.zonas)
        this.loading = false
        return
      }

      try {
        // Obtener solo las zonas de la hacienda actual
        const records = await pb.collection('zonas').getFullList({
          sort: 'nombre',
          filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`
        })
        this.zonas = records
        this.lastSync = Date.now()

        // Guardar zonas en localStorage para uso offline
        syncStore.saveToLocalStorage('zonas', records)
      } catch (error) {
        handleError(error, 'Error al sincronizar zonas')
      } finally {
        this.loading = false
      }
    },

    async syncWithServer() {
      // Sincronizar cambios pendientes
      await this.cargarZonas() // Cargar zonas desde el servidor
      // Aquí puedes agregar lógica para sincronizar cambios pendientes
    },

    async crearZona(zonaData) {
      const syncStore = useSyncStore()

      // Asegurarse de que las métricas estén en el formato correcto
      /*   if (zonaData.metricas) {
        zonaData.metricas = Object.fromEntries(
          Object.entries(zonaData.metricas).map(([key, value]) => [key, value.valor])
        )
      }*/

      zonaData.bpa_estado = this.calcularBpaEstado(zonaData.datos_bpa)

      if (!syncStore.isOnline) {
        const tempId = `temp_${Date.now()}`
        const tempZona = {
          ...zonaData,
          id: tempId,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: this.version
        }

        this.zonas.push(tempZona)
        // Actualizar localStorage
        syncStore.saveToLocalStorage('zonas', this.zonas)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'zonas',
          data: tempZona,
          tempId
        })

        return tempZona
      }

      try {
        const record = await pb.collection('zonas').create(zonaData)
        this.zonas.push(record)
        // Actualizar localStorage
        syncStore.saveToLocalStorage('zonas', this.zonas)
        return record
      } catch (error) {
        handleError(error, 'Error al crear zona')
        throw error
      }
    },

    async updateZona(id, updateData) {
      const syncStore = useSyncStore()
      updateData.bpa_estado = this.calcularBpaEstado(updateData.datos_bpa)

      if (!syncStore.isOnline) {
        const index = this.zonas.findIndex((z) => z.id === id)
        if (index !== -1) {
          this.zonas[index] = { ...this.zonas[index], ...updateData }
          // Actualizar localStorage
          syncStore.saveToLocalStorage('zonas', this.zonas)
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'zonas',
          id,
          data: updateData
        })

        return this.zonas[index]
      }

      try {
        const record = await pb.collection('zonas').update(id, updateData)
        const index = this.zonas.findIndex((z) => z.id === id)
        if (index !== -1) {
          this.zonas[index] = record
          // Actualizar localStorage
          syncStore.saveToLocalStorage('zonas', this.zonas)
        }
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar zona')
        throw error
      }
    },

    async eliminarZona(id) {
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        const index = this.zonas.findIndex((z) => z.id === id)
        if (index !== -1) {
          this.zonas.splice(index, 1)
          syncStore.saveToLocalStorage('zonas', this.zonas)
        }

        await syncStore.queueOperation({
          type: 'deleteZona',
          id
        })

        return
      }

      try {
        await pb.collection('zonas').delete(id)
        this.zonas = this.zonas.filter((zona) => zona.id !== id)
        syncStore.saveToLocalStorage('zonas', this.zonas)

        return true
      } catch (error) {
        handleError(error, 'Error al eliminar zona')
        throw error
      }
    },

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
      const tiposZonasLocal = useSyncStore().loadFromLocalStorage('tiposZonas')
      if (tiposZonasLocal) {
        this.tiposZonas = tiposZonasLocal
        console.log('Cargado tiposZonas desde localStorage:', this.tiposZonas)
        return this.tiposZonas
      }

      try {
        const records = await pb.collection('tipos_zonas').getFullList({
          sort: 'nombre'
        })
        this.tiposZonas = records
        // Guardar zonas en localStorage para uso offline
        useSyncStore().saveToLocalStorage('tiposZonas', records)
        console.log('tiposZonas actualizadas:', this.tiposZonas)
      } catch (error) {
        handleError(error, 'Error al cargar tipos de zonas')
      }
    },

    async cargarZonasPorSiembras(siembraIds) {
      // const zonasStore = useZonasStore()
      this.loading = true

      try {
        // Usar directamente el store de zonas para obtener las zonas filtradas
        return this.zonas.filter((zona) => siembraIds.includes(zona.siembra))
      } catch (error) {
        handleError(error, 'Error al cargar zonas por siembras')
        return []
      } finally {
        this.loading = false
      }
    },

    async cargarZonasPrecargadas() {
      // const zonasStore = useZonasStore()
      this.loading = true

      try {
        // Filtrar zonas que no pertenecen a siembras
        const zonasFiltradas = this.zonas.filter(
          (zona) => !zona.siembra // Asegúrate de que la propiedad siembra esté configurada
        )

        return zonasFiltradas // Retornar las zonas precargadas
      } catch (error) {
        handleError(error, 'Error al cargar zonas precargadas')
        return []
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
    }
  }
})

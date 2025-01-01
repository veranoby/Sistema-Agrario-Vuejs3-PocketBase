import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSyncStore } from './syncStore'
import { useHaciendaStore } from './haciendaStore'
import { useZonasStore } from './zonasStore'
import { useAvatarStore } from './avatarStore'

export const useActividadesStore = defineStore('actividades', {
  state: () => ({
    actividades: [],
    tiposActividades: [],
    loading: false,
    error: null,
    version: 1
  }),

  getters: {
    promedioBpaEstado() {
      const haciendaStore = useHaciendaStore()
      const actividadesHacienda = this.actividades.filter(
        (actividad) => actividad.hacienda === haciendaStore.mi_hacienda?.id
      )
      const totalBpaEstado = actividadesHacienda.reduce(
        (acc, actividad) => acc + (actividad.bpa_estado || 0),
        0
      )
      return actividadesHacienda.length
        ? Math.round(totalBpaEstado / actividadesHacienda.length)
        : 0
    }
  },

  actions: {
    async init() {
      const syncStore = useSyncStore()
      this.loading = true

      try {
        await this.cargarTiposActividades()

        if (syncStore.isOnline) {
          await this.syncWithServer()
        }
      } catch (error) {
        handleError(error, 'Error al inicializar actividades')
      } finally {
        this.loading = false
      }
    },

    async cargarActividades() {
      this.loading = true
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()

      try {
        if (syncStore.isOnline) {
          const records = await pb.collection('actividades').getFullList({
            sort: 'nombre',
            filter: `hacienda="${haciendaStore.mi_hacienda?.id}"`
          })
          this.actividades = records
          console.log('Mis Actividades:', records)
          syncStore.saveToLocalStorage('actividades', records)
        } else {
          this.actividades = syncStore.loadFromLocalStorage('actividades') || []
        }
      } catch (error) {
        handleError(error, 'Error al cargar actividades')
      } finally {
        this.loading = false
      }
    },

    async crearActividad(actividadData) {
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        const tempId = `temp_${Date.now()}`
        const tempActividad = {
          ...actividadData,
          id: tempId,
          activa: true
        }

        this.actividades.push(tempActividad)
        syncStore.saveToLocalStorage('actividades', this.actividades)

        await syncStore.queueOperation({
          type: 'create',
          collection: 'actividades',
          data: actividadData,
          tempId
        })

        return tempActividad
      }

      try {
        const actividadToCreate = {
          ...actividadData,
          hacienda: useHaciendaStore().mi_hacienda.id
        }

        const record = await pb.collection('actividades').create(actividadToCreate)
        this.actividades.push(record)
        syncStore.saveToLocalStorage('actividades', this.actividades)
        return record
      } catch (error) {
        handleError(error, 'Error al crear actividad')
        throw error
      }
    },

    async updateActividad(id, updateData) {
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        const index = this.actividades.findIndex((a) => a.id === id)
        if (index !== -1) {
          this.actividades[index] = { ...this.actividades[index], ...updateData }
          syncStore.saveToLocalStorage('actividades', this.actividades)
        }

        await syncStore.queueOperation({
          type: 'update',
          collection: 'actividades',
          id,
          data: updateData
        })

        return this.actividades[index]
      }

      try {
        const record = await pb.collection('actividades').update(id, updateData)
        const index = this.actividades.findIndex((a) => a.id === id)
        if (index !== -1) {
          this.actividades[index] = record
          syncStore.saveToLocalStorage('actividades', this.actividades)
        }
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar actividad')
        throw error
      }
    },

    async deleteActividad(id) {
      const syncStore = useSyncStore()

      if (!syncStore.isOnline) {
        this.actividades = this.actividades.filter((a) => a.id !== id)
        syncStore.saveToLocalStorage('actividades', this.actividades)

        await syncStore.queueOperation({
          type: 'delete',
          collection: 'actividades',
          id
        })

        return true
      }

      try {
        await pb.collection('actividades').delete(id)
        this.actividades = this.actividades.filter((a) => a.id !== id)
        syncStore.saveToLocalStorage('actividades', this.actividades)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar actividad')
        throw error
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

    async cargarTiposActividades() {
      const tiposActividadesLocal = useSyncStore().loadFromLocalStorage('tiposActividades')
      if (tiposActividadesLocal) {
        this.tiposActividades = tiposActividadesLocal
        return this.tiposActividades
      }

      try {
        const records = await pb.collection('tipo_actividades').getFullList({
          sort: 'nombre'
        })
        this.tiposActividades = records.map((record) => ({
          id: record.id,
          nombre: record.nombre,
          descripcion: record.descripcion,
          datos_bpa: record.datos_bpa,
          metricas: record.metricas
        }))
        useSyncStore().saveToLocalStorage('tiposActividades', this.tiposActividades)
      } catch (error) {
        handleError(error, 'Error al cargar tipos de actividades')
      }
    },

    async cargarZonasPorSiembras(siembraIds) {
      const zonasStore = useZonasStore()
      this.loading = true

      try {
        // Usar directamente el store de zonas para obtener las zonas filtradas
        return zonasStore.zonas.filter((zona) => siembraIds.includes(zona.siembra))
      } catch (error) {
        handleError(error, 'Error al cargar zonas por siembras')
        return []
      } finally {
        this.loading = false
      }
    },

    async cargarZonasPrecargadas() {
      const zonasStore = useZonasStore()
      this.loading = true

      try {
        // Filtrar zonas que no pertenecen a siembras
        const zonasFiltradas = zonasStore.zonas.filter(
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

    async fetchActividadById(id) {
      const syncStore = useSyncStore()

      this.loading = true
      try {
        const record = await pb.collection('actividades').getOne(id, {
          expand: 'hacienda'
        })

        const avatarStore = useAvatarStore()
        record.avatarUrl = avatarStore.getAvatarUrl({ ...record, type: 'actividad' }, 'actividad')

        const index = this.actividades.findIndex((s) => s.id === id)
        if (index !== -1) {
          this.actividades[index] = record
        } else {
          this.actividades.push(record)
        }

        syncStore.saveToLocalStorage('actividades', this.actividades)
        return record
      } catch (error) {
        handleError(error, 'Error al obtener la actividad')
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})

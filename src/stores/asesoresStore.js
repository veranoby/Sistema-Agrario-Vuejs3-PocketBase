import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { useAuthStore } from './authStore'

export const useAsesoresStore = defineStore('asesores', {
  state: () => ({
    asesores: [],
    misVinculaciones: [],
    loading: false,
    filtros: {
      search: '',
      especialidad: [],
      provincia: []
    },
    pagination: {
      page: 1,
      perPage: 20,
      totalItems: 0
    }
  }),

  getters: {
    estadoVinculacion: (state) => (asesorId) => {
      const v = state.misVinculaciones.find(x => x.asesor_id === asesorId)
      return v ? v.estado : 'ninguna'
    },
    getVinculacion: (state) => (asesorId) => {
      return state.misVinculaciones.find(x => x.asesor_id === asesorId) || null
    }
  },

  actions: {
    async fetchAsesores() {
      this.loading = true
      try {
        let filterParts = ['role = "asesor"']
        
        // PocketBase filters for searching inside public info JSON string aren't always native,
        // so we fetch all active advisors (they are usually a small list < 100) and filter in memory,
        // or apply basic search if it's stored in name/lastname.
        
        if (this.filtros.search) {
          filterParts.push(`(name ~ "${this.filtros.search}" || lastname ~ "${this.filtros.search}")`)
        }

        const filter = filterParts.join(' && ')
        const result = await pb.collection('users').getList(this.pagination.page, this.pagination.perPage, {
          filter: filter,
          sort: 'name'
        })

        // In-memory filter for specialized JSON attributes to support nested arrays
        let filteredItems = result.items.map(user => {
          let info = {}
          try {
            info = typeof user.info === 'string' ? JSON.parse(user.info || '{}') : (user.info || {})
          } catch (e) {
            info = {}
          }
          return { ...user, parsedInfo: info }
        })

        if (this.filtros.especialidad && this.filtros.especialidad.length > 0) {
          filteredItems = filteredItems.filter(user => {
            const specs = user.parsedInfo.especialidades || []
            return this.filtros.especialidad.some(spec => specs.includes(spec))
          })
        }

        if (this.filtros.provincia && this.filtros.provincia.length > 0) {
          filteredItems = filteredItems.filter(user => {
            const zones = user.parsedInfo.zonas_cobertura || []
            return this.filtros.provincia.some(zone => zones.includes(zone))
          })
        }

        this.asesores = filteredItems
        this.pagination.totalItems = filteredItems.length
      } catch (error) {
        handleError(error, 'Error al obtener directorio de asesores')
      } finally {
        this.loading = false
      }
    },

    async fetchMisVinculaciones(haciendaId) {
      if (!haciendaId) return
      try {
        const list = await pb.collection('vinculaciones_asesor').getFullList({
          filter: `hacienda_id = "${haciendaId}"`
        })
        this.misVinculaciones = list
      } catch (error) {
        console.error('Error fetching vinculaciones:', error)
      }
    },

    async solicitarVinculacion(asesorId, haciendaId) {
      const uiFeedback = useUiFeedbackStore()
      const authStore = useAuthStore()
      uiFeedback.showLoading()

      try {
        const record = await pb.collection('vinculaciones_asesor').create({
          hacienda_id: haciendaId,
          asesor_id: asesorId,
          estado: 'pendiente',
          iniciada_por: authStore.user.id
        })

        this.misVinculaciones.push(record)
        uiFeedback.showSnackbar('Solicitud de vinculación enviada exitosamente', 'success')
      } catch (error) {
        handleError(error, 'Error al enviar solicitud de vinculación')
      } finally {
        uiFeedback.hideLoading()
      }
    },

    async revocarOReconectarVinculacion(vinculacionId, nuevoEstado) {
      const uiFeedback = useUiFeedbackStore()
      uiFeedback.showLoading()
      try {
        const updated = await pb.collection('vinculaciones_asesor').update(vinculacionId, {
          estado: nuevoEstado,
          fecha_vinculacion: nuevoEstado === 'activa' ? new Date().toISOString() : null
        })
        
        const idx = this.misVinculaciones.findIndex(x => x.id === vinculacionId)
        if (idx !== -1) {
          this.misVinculaciones[idx] = updated
        }
        uiFeedback.showSnackbar(`Vinculación actualizada a: ${nuevoEstado}`, 'success')
      } catch (error) {
        handleError(error, 'Error al actualizar vinculación')
      } finally {
        uiFeedback.hideLoading()
      }
    }
  }
})

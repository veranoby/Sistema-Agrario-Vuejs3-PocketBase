import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useEvents } from '@/composables/useEvents'
import { EVENTS } from '@/utils/eventBus'
import { logger } from '@/utils/logger'
import { useSyncStore } from '@/stores/sync'

/**
 * Store administrativo: CRUD global de haciendas (SuperAdmin)
 *
 * Responsabilidades:
 * - haciendas: Lista de todas las haciendas con paginación
 * - Filtros y búsqueda
 * - Suspensión/reactivación
 * - Configuración de planes
 *
 * Para la hacienda actual del usuario logueado,
 * usar haciendaStore.js
 */
export const useHaciendaManagementStore = defineStore('haciendaManagement', {
  state: () => ({
    haciendas: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      perPage: 50,
      totalItems: 0,
      totalPages: 0
    },
    filters: {
      search: '',
      status: ''
    },
    planes: [],
    modulos: []
  }),

  getters: {
    /**
     * Obtener haciendas filtradas
     */
    filteredHaciendas: (state) => {
      let filtered = state.haciendas

      if (state.filters.search) {
        const search = state.filters.search.toLowerCase()
        filtered = filtered.filter(h =>
          h.name?.toLowerCase().includes(search) ||
          h.descripcion?.toLowerCase().includes(search)
        )
      }

      if (state.filters.status) {
        filtered = filtered.filter(h => h.status === state.filters.status)
      }

      return filtered
    }
  },

  actions: {
    /**
     * Cargar haciendas con filtros
     */
    async fetchHaciendas(filters = {}) {
      this.loading = true
      this.error = null

      try {
        const filterParts = []

        if (filters.status) {
          filterParts.push(`status = "${filters.status}"`)
        }

        const filterString = filterParts.length > 0 ? filterParts.join(' && ') : ''

        const result = await pb.collection('Haciendas').getList(
          filters.page || 1,
          filters.perPage || 50,
          {
            filter: filterString,
            sort: '-created',
            expand: filters.expand || 'plan'
          }
        )

        this.haciendas = result.items
        this.pagination = {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }

        logger.info('[HACIENDA_MANAGEMENT] Haciendas cargadas', { count: this.haciendas.length })
      } catch (error) {
        handleError(error, 'Error cargando haciendas')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchPlanes() {
      try {
        const records = await pb.collection('planes').getFullList({ sort: 'nombre' }).catch(() => [])
        this.planes = records || []
        return this.planes
      } catch (error) {
        this.planes = []
        return []
      }
    },

    async fetchModulos() {
      try {
        const records = await pb.collection('modulos').getFullList().catch(() => [])
        if (records && records.length > 0) {
          this.modulos = records
          return records
        }
      } catch (error) {
        // Ignore
      }
      this.modulos = [
        { id: 'bitacoras_avanzadas', name: 'Bitácoras Avanzadas' },
        { id: 'programaciones_inteligentes', name: 'Programaciones Inteligentes' },
        { id: 'alertas_proactivas', name: 'Alertas Proactivas' },
        { id: 'auditoria_bpa', name: 'Auditoría BPA' },
        { id: 'ai', name: 'IA Assistant' }
      ]
      return this.modulos
    },

    /**
     * Crear hacienda (con soporte offline)
     */
    async createHacienda(haciendaData) {
      this.loading = true
      this.error = null
      const syncStore = useSyncStore()

      try {
        const { emit } = useEvents()
        const { locationCoordinator } = await import('@/services/locationCoordinator')

        let gps = haciendaData.gps || { lat: null, lng: null }
        if (!gps.lat) {
          try {
            const pos = await locationCoordinator.getPosition()
            gps = { lat: pos.latitude, lng: pos.longitude }
          } catch (e) {
            logger.warn('[HACIENDA_MANAGEMENT] No se pudo capturar GPS automático:', e.message)
          }
        }

        // Preparar datos
        const data = {
          name: haciendaData.name,
          descripcion: haciendaData.descripcion,
          location: haciendaData.location,
          gps: gps,
          info: haciendaData.info,
          plan: haciendaData.plan?.id || haciendaData.plan,
          status: haciendaData.status || 'active',
          contacto_email: haciendaData.contacto_email,
          contacto_telefono: haciendaData.contacto_telefono,
          openrouter_key: haciendaData.openrouter_key
        }


        if (!syncStore.isOnline) {
          // Modo offline: encolar operación
          const tempId = await syncStore.queueOperation({
            type: 'create',
            collection: 'Haciendas',
            data
          })
          const tempHacienda = { ...data, id: tempId, _pending: true }
          this.haciendas.unshift(tempHacienda)
          logger.info('[HACIENDA_MANAGEMENT] Hacienda creada offline (pendiente)', { tempId })
          return tempHacienda
        }

        // Modo online: crear directamente
        const hacienda = await pb.collection('Haciendas').create(data)

        // Emitir evento
        emit(EVENTS.HACIENDA_UPDATED, { haciendaId: hacienda.id })

        this.haciendas.unshift(hacienda)
        logger.info('[HACIENDA_MANAGEMENT] Hacienda creada', { haciendaId: hacienda.id })

        return hacienda
      } catch (error) {
        handleError(error, 'Error creando hacienda')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Actualizar hacienda (con soporte offline)
     */
    async updateHacienda(haciendaId, haciendaData) {
      this.loading = true
      this.error = null
      const syncStore = useSyncStore()

      try {
        const { emit } = useEvents()

        const updateData = {
          name: haciendaData.name,
          descripcion: haciendaData.descripcion,
          location: haciendaData.location,
          gps: haciendaData.gps,
          info: haciendaData.info,
          plan: haciendaData.plan?.id || haciendaData.plan,
          avatar: haciendaData.avatar,
          metricas: haciendaData.metricas,
          status: haciendaData.status,
          suspension_reason: haciendaData.suspension_reason,
          owner: haciendaData.owner?.id || haciendaData.owner,
          active_modules: haciendaData.active_modules,
          contacto_email: haciendaData.contacto_email,
          contacto_telefono: haciendaData.contacto_telefono,
          openrouter_key: haciendaData.openrouter_key
        }


        if (!syncStore.isOnline) {
          // Modo offline: encolar operación
          await syncStore.queueOperation({
            type: 'update',
            collection: 'Haciendas',
            id: haciendaId,
            data: updateData
          })
          // Actualizar localmente con flag pending
          const index = this.haciendas.findIndex(h => h.id === haciendaId)
          if (index !== -1) {
            this.haciendas[index] = { ...this.haciendas[index], ...updateData, _pending: true }
          }
          logger.info('[HACIENDA_MANAGEMENT] Hacienda actualizada offline (pendiente)', { haciendaId })
          return this.haciendas[index]
        }

        // Modo online: actualizar directamente
        const hacienda = await pb.collection('Haciendas').update(haciendaId, updateData)

        // Actualizar en estado local
        const index = this.haciendas.findIndex(h => h.id === haciendaId)
        if (index !== -1) {
          this.haciendas[index] = hacienda
        }

        // Emitir evento
        emit(EVENTS.HACIENDA_UPDATED, { haciendaId })

        logger.info('[HACIENDA_MANAGEMENT] Hacienda actualizada', { haciendaId })
        return hacienda
      } catch (error) {
        handleError(error, 'Error actualizando hacienda')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Eliminar hacienda (soft delete)
     */
    async deleteHacienda(haciendaId) {
      this.loading = true
      this.error = null

      try {
        const { emit } = useEvents()

        await pb.collection('Haciendas').update(haciendaId, {
          status: 'inactive'
        })

        // Actualizar en estado local
        const index = this.haciendas.findIndex(h => h.id === haciendaId)
        if (index !== -1) {
          this.haciendas[index].status = 'inactive'
        }

        // Emitir evento
        emit(EVENTS.HACIENDA_UPDATED, { haciendaId, status: 'inactive' })

        logger.info('[HACIENDA_MANAGEMENT] Hacienda eliminada (soft delete)', { haciendaId })
      } catch (error) {
        handleError(error, 'Error eliminando hacienda')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Asignar propietario a hacienda
     */
    async assignOwner(haciendaId, userId) {
      this.loading = true
      this.error = null

      try {
        const res = await pb.send(`/api/admin/haciendas/${haciendaId}/owner`, {
          method: 'POST',
          body: { userId }
        })

        // Refrescar haciendas
        await this.fetchHaciendas({ page: this.pagination.page, perPage: this.pagination.perPage })

        logger.info('[HACIENDA_MANAGEMENT] Propietario asignado', { haciendaId, userId })
        return res
      } catch (error) {
        handleError(error, 'Error asignando propietario')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Configurar plan y límites de hacienda
     */
    async configurePlan(haciendaId, planData) {
      this.loading = true
      this.error = null

      try {
        const { emit } = useEvents()

        const res = await pb.send(`/api/admin/haciendas/${haciendaId}/plan`, {
          method: 'POST',
          body: {
            plan: planData.plan,
            user_limit: planData.user_limit,
            storage_limit: planData.storage_limit
          }
        })

        // Refrescar haciendas
        await this.fetchHaciendas({ page: this.pagination.page, perPage: this.pagination.perPage })

        // Emitir evento
        emit(EVENTS.HACIENDA_UPDATED, { haciendaId, plan: planData.plan })

        logger.info('[HACIENDA_MANAGEMENT] Plan configurado', { haciendaId, plan: planData.plan })
        return res
      } catch (error) {
        handleError(error, 'Error configurando plan')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Activar/desactivar módulos de hacienda
     */
    async toggleModules(haciendaId, modules) {
      this.loading = true
      this.error = null

      try {
        const hacienda = await pb.collection('Haciendas').update(haciendaId, {
          active_modules: modules
        })

        // Actualizar en estado local
        const index = this.haciendas.findIndex(h => h.id === haciendaId)
        if (index !== -1) {
          this.haciendas[index] = hacienda
        }

        logger.info('[HACIENDA_MANAGEMENT] Módulos actualizados', { haciendaId, modules })
        return hacienda
      } catch (error) {
        handleError(error, 'Error actualizando módulos')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Suspender hacienda
     */
    async suspendHacienda(haciendaId, reason) {
      this.loading = true
      this.error = null

      try {
        const { emit } = useEvents()

        await pb.collection('Haciendas').update(haciendaId, {
          status: 'suspended',
          suspension_reason: reason,
          suspended_at: new Date().toISOString()
        })

        // Actualizar en estado local
        const index = this.haciendas.findIndex(h => h.id === haciendaId)
        if (index !== -1) {
          this.haciendas[index].status = 'suspended'
          this.haciendas[index].suspension_reason = reason
        }

        // Emitir evento
        emit(EVENTS.HACIENDA_SUSPENDED, { haciendaId, reason })

        logger.warn('[HACIENDA_MANAGEMENT] Hacienda suspendida', { haciendaId, reason })
      } catch (error) {
        handleError(error, 'Error suspendiendo hacienda')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Reactivar hacienda
     */
    async reactivateHacienda(haciendaId) {
      this.loading = true
      this.error = null

      try {
        const { emit } = useEvents()

        await pb.send(`/api/admin/haciendas/${haciendaId}/reactivate`, { method: 'POST' })

        // Actualizar en estado local
        const index = this.haciendas.findIndex(h => h.id === haciendaId)
        if (index !== -1) {
          this.haciendas[index].status = 'active'
          this.haciendas[index].suspension_reason = null
        }

        // Emitir evento
        emit(EVENTS.HACIENDA_REACTIVATED, { haciendaId })

        logger.info('[HACIENDA_MANAGEMENT] Hacienda reactivada', { haciendaId })
      } catch (error) {
        handleError(error, 'Error reactivando hacienda')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Obtener métricas de uso de hacienda desde endpoint admin
     */
    async getHaciendaMetrics(haciendaId) {
      try {
        return await pb.send(`/api/admin/haciendas/${haciendaId}/metrics`, { method: 'GET' })
      } catch (error) {
        handleError(error, 'Error obteniendo métricas de hacienda')
        return { userCount: 0, activeModules: 0, lastUpdated: new Date().toISOString() }
      }
    },

    /**
     * Obtener últimas actividades de una hacienda desde logs
     */
    async fetchHaciendaActivity(haciendaId, options = {}) {
      try {
        const perPage = options.perPage || 10
        const res = await pb.send(`/api/admin/logs?haciendaId=${haciendaId}&perPage=${perPage}`, { method: 'GET' })
        return res.items || []
      } catch (error) {
        handleError(error, 'Error al obtener actividad de la hacienda')
        return []
      }
    },

    /**
     * Asociar un usuario a una hacienda (vía users.hacienda)
     */
    async addUserToHacienda(userId, haciendaId) {
      try {
        const res = await pb.send(`/api/admin/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({ hacienda: haciendaId })
        })
        return res
      } catch (error) {
        handleError(error, 'Error al asociar usuario a la hacienda')
        throw error
      }
    },

    /**
     * Remover un usuario de una hacienda (vía users.hacienda)
     */
    async removeUserFromHacienda(userId) {
      try {
        const res = await pb.send(`/api/admin/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({ hacienda: '' })
        })
        return res
      } catch (error) {
        handleError(error, 'Error al remover usuario de la hacienda')
        throw error
      }
    },

    /**
     * Obtener vinculaciones de asesor para una hacienda
     */
    async fetchVinculacionesHacienda(haciendaId) {
      try {
        const records = await pb.collection('vinculaciones_asesor').getFullList({
          filter: `hacienda_id = "${haciendaId}"`,
          expand: 'asesor_id'
        })
        return records
      } catch (error) {
        handleError(error, 'Error al obtener vinculaciones de asesor')
        return []
      }
    },

    /**
     * Crear vinculación de asesor a hacienda
     */
    async addAsesorVinculacion(haciendaId, asesorId) {
      try {
        const currentUserId = pb.authStore.record?.id || ''
        const record = await pb.collection('vinculaciones_asesor').create({
          hacienda_id: haciendaId,
          asesor_id: asesorId,
          estado: 'activa',
          iniciada_por: currentUserId,
          fecha_vinculacion: new Date().toISOString()
        })
        return record
      } catch (error) {
        handleError(error, 'Error al vincular asesor a la hacienda')
        throw error
      }
    },

    /**
     * Revocar vinculación de asesor
     */
    async revocarAsesorVinculacion(vinculacionId) {
      try {
        const record = await pb.collection('vinculaciones_asesor').update(vinculacionId, {
          estado: 'revocada'
        })
        return record
      } catch (error) {
        handleError(error, 'Error al revocar vinculación de asesor')
        throw error
      }
    },

    /**
     * Actualizar filtros
     */
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },

    /**
     * Limpiar estado
     */
    reset() {
      this.haciendas = []
      this.loading = false
      this.error = null
      this.pagination = {
        page: 1,
        perPage: 50,
        totalItems: 0,
        totalPages: 0
      }
      this.filters = {
        search: '',
        status: ''
      }
    }
  }
})

import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { useSyncStore } from '@/stores/sync/index'
import { useAvatarStore } from './avatarStore'
import { useAuthStore } from './authStore'

/**
 * Store de sesión: Hacienda actual del usuario logueado
 *
 * Responsabilidades:
 * - mi_hacienda: Hacienda activa del usuario
 * - haciendaUsers: Usuarios de mi hacienda
 * - Operaciones sobre mi hacienda (update, delete user)
 *
 * Para CRUD administrativo de TODAS las haciendas (SuperAdmin),
 * usar haciendaManagementStore.js
 */
export const useHaciendaStore = defineStore('hacienda', {
  state: () => ({
    mi_hacienda: null,
    haciendaUsers: [],
    baseImageUrl: '',
    loading: false
  }),

  getters: {
    isPlanExpired: (state) => {
      if (!state.mi_hacienda?.subscription_end) return false
      const end = new Date(state.mi_hacienda.subscription_end)
      return end < new Date()
    },
    daysUntilExpiration: (state) => {
      if (!state.mi_hacienda?.subscription_end) return null
      const end = new Date(state.mi_hacienda.subscription_end)
      const diff = end - new Date()
      return Math.ceil(diff / (1000 * 60 * 60 * 24))
    },
    needsSubscriptionWarning: (state) => {
      const days = state.daysUntilExpiration
      return days !== null && days <= 3
    },
    isFreePlan: (state) => {
      // Asume que si no hay plan definido, o si expiró, o si se llama "gratis" es un plan libre.
      // Se delega la verdadera expiración al isPlanExpired
      if (!state.mi_hacienda) return true
      if (!state.mi_hacienda.plan) return true

      const planEnd = state.mi_hacienda.subscription_end ? new Date(state.mi_hacienda.subscription_end) : null
      if (planEnd && planEnd < new Date()) return true

      return false
    },
    haciendaName: (state) => state.mi_hacienda?.name || '',
    avatarHaciendaUrl: (state) => {
      const avatarStore = useAvatarStore()
      return avatarStore.getAvatarUrl({ ...state.mi_hacienda, type: 'hacienda' }, 'Haciendas')
    }
  },

  actions: {
    isModuleActive(moduleName) {
      if (!this.mi_hacienda) return false

      // Enterprise plan allows everything
      const planName = this.mi_hacienda.expand?.plan?.nombre?.toLowerCase() || ''
      if (planName.includes('enterprise')) return true

      if (this.mi_hacienda.active_modules && Array.isArray(this.mi_hacienda.active_modules)) {
        return this.mi_hacienda.active_modules.includes(moduleName)
      }

      return false
    },

    async init() {
      const authStore = useAuthStore()
      if (authStore.isAsesor) return

      if (!this.haciendaUsers.length) {
        await this.fetchHaciendaUsers()
      }
      if (!this.mi_hacienda) {
        await this.fetchHaciendaFromCache()
      }
    },

    async fetchHaciendaFromCache() {
      const syncStore = useSyncStore()
      const cachedHacienda = await syncStore.loadFromLocalStorage('mi_hacienda')
      if (cachedHacienda) {
        this.mi_hacienda = cachedHacienda
        this.baseImageUrl = await syncStore.loadFromLocalStorage('baseImageUrl') || ''
      }
    },

    async updateHacienda(haciendaData) {
      const syncStore = useSyncStore()
      const uiFeedbackStore = useUiFeedbackStore()

      if (!this.mi_hacienda || !this.mi_hacienda.id) {
        throw new Error('No hay hacienda seleccionada para actualizar')
      }

      const dataToUpdate = {}
      const fields = ['name', 'location', 'gps', 'geometria', 'info', 'metricas', 'contacto_email', 'contacto_telefono', 'openrouter_key']
      fields.forEach(field => {

        if (haciendaData[field] !== undefined) {
          dataToUpdate[field] = haciendaData[field]
        } else if (this.mi_hacienda[field] !== undefined) {
          dataToUpdate[field] = this.mi_hacienda[field]
        }
      })

      if (haciendaData.plan) {
        dataToUpdate.plan = typeof haciendaData.plan === 'object' ? haciendaData.plan.id : haciendaData.plan
      } else if (this.mi_hacienda.plan) {
        dataToUpdate.plan = typeof this.mi_hacienda.plan === 'object' ? this.mi_hacienda.plan.id : this.mi_hacienda.plan
      }

      if (haciendaData.avatar) {
        dataToUpdate.avatar = haciendaData.avatar
      }

      if (!syncStore.isOnline) {
        this.mi_hacienda = {
          ...this.mi_hacienda,
          ...dataToUpdate,
          updated: new Date().toISOString()
        }

        syncStore.saveToLocalStorage('mi_hacienda', this.mi_hacienda)

        await syncStore.queueOperation({
          type: 'update',
          collection: 'Haciendas',
          id: this.mi_hacienda.id,
          data: dataToUpdate
        })

        return this.mi_hacienda
      }

      uiFeedbackStore.showLoading()

      try {
        const updatedHacienda = await pb
          .collection('Haciendas')
          .update(this.mi_hacienda.id, dataToUpdate)
        this.mi_hacienda = updatedHacienda
        syncStore.saveToLocalStorage('mi_hacienda', this.mi_hacienda)
        uiFeedbackStore.showSnackbar('Hacienda actualizada con éxito', 'success')

        return updatedHacienda
      } catch (error) {
        handleError(error, 'Error al actualizar la hacienda')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async fetchHacienda(haciendaId) {
      if (!haciendaId) {
        throw new Error('ID de hacienda no proporcionado')
      }

      // Idempotencia: si ya está cargado con el mismo ID, no re-fetch
      if (this.mi_hacienda?.id === haciendaId && !this.loading) {
        return this.mi_hacienda
      }

      // Evitar peticiones concurrentes (loading en curso)
      if (this.loading) {
        return this.mi_hacienda
      }

      const syncStore = useSyncStore()
      this.loading = true

      const mi_haciendaLocal = await syncStore.loadFromLocalStorage('mi_hacienda')
      if (mi_haciendaLocal) {
        this.mi_hacienda = mi_haciendaLocal
        this.baseImageUrl = await syncStore.loadFromLocalStorage('baseImageUrl') || ''
        this.loading = false
        return this.mi_hacienda
      }

      try {
        if (syncStore.isOnline) {
          this.mi_hacienda = await pb.collection('Haciendas').getOne(haciendaId, {
            expand: 'plan'
          })
          this.baseImageUrl = pb.baseUrl + '/api/files'

          await syncStore.saveToLocalStorage('mi_hacienda', this.mi_hacienda)
          await syncStore.saveToLocalStorage('baseImageUrl', this.baseImageUrl)
        } else {
          const localHacienda = localStorage.getItem('mi_hacienda')
          if (localHacienda) {
            this.mi_hacienda = JSON.parse(localHacienda)
            this.baseImageUrl = localStorage.getItem('baseImageUrl') || ''
          }
        }
      } catch (error) {
        handleError(error, 'Error cargando información de hacienda')
        const uiFeedbackStore = useUiFeedbackStore()
        uiFeedbackStore.showSnackbar('Error al cargar la hacienda. Intenta recargar.', 'error')
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchHaciendaUsers() {
      const haciendaId = this.mi_hacienda?.id
      if (!haciendaId) {
        throw new Error('No hay hacienda seleccionada')
      }

      if (this.haciendaUsers.length > 0) {
        return this.haciendaUsers
      }

      const haciendaUsersJson = localStorage.getItem(`hacienda_users_${haciendaId}`)
      if (haciendaUsersJson) {
        this.haciendaUsers = JSON.parse(haciendaUsersJson)
        return this.haciendaUsers
      }

      try {
        const users = await pb.collection('users').getFullList({
          filter: `hacienda = "${haciendaId}"`,
          sort: 'created'
        })

        this.haciendaUsers = users
        localStorage.setItem(`hacienda_users_${haciendaId}`, JSON.stringify(users))
        return users
      } catch (error) {
        handleError(error, 'Error fetching hacienda users')
        return []
      }
    },

    async deleteHaciendaUser(userId) {
      const uiFeedbackStore = useUiFeedbackStore()
      const syncStore = useSyncStore()
      uiFeedbackStore.showLoading()

      if (!userId) {
        uiFeedbackStore.hideLoading()
        throw new Error('ID de usuario no proporcionado para eliminación')
      }

      try {
        if (!syncStore.isOnline) {
          const users = syncStore.loadFromLocalStorage(`hacienda_users_${this.mi_hacienda.id}`) || []
          const userExiste = users.some((user) => user.id === userId)
          if (!userExiste) {
            uiFeedbackStore.hideLoading()
            throw new Error(`No se encontró usuario con ID: ${userId}`)
          }

          await syncStore.queueOperation({
            type: 'delete',
            collection: 'users',
            id: userId
          })
          const updatedUsers = users.filter((user) => user.id !== userId)
          syncStore.saveToLocalStorage(`hacienda_users_${this.mi_hacienda.id}`, updatedUsers)
          uiFeedbackStore.hideLoading()
          return true
        }

        await pb.collection('users').delete(userId)
        const users = syncStore.loadFromLocalStorage(`hacienda_users_${this.mi_hacienda.id}`) || []
        const updatedUsers = users.filter((user) => user.id !== userId)
        syncStore.saveToLocalStorage(`hacienda_users_${this.mi_hacienda.id}`, updatedUsers)

        uiFeedbackStore.showSnackbar('Usuario eliminado con éxito', 'success')
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar usuario')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async createHacienda(haciendaName, haciendaPlan) {
      const uiFeedbackStore = useUiFeedbackStore()
      const syncStore = useSyncStore()
      uiFeedbackStore.showLoading()

      try {
        if (!haciendaName || haciendaName.length < 3) {
          throw new Error('El nombre de la hacienda debe tener al menos 3 caracteres')
        }

        const metricasDefault = {
          area_total: {
            tipo: 'text',
            valor: 'Por determinar',
            descripcion: 'Área total en hectáreas'
          },
          propietario: {
            tipo: 'text',
            valor: 'Por determinar',
            descripcion: 'Nombre del propietario'
          },
          administrador: {
            tipo: 'text',
            valor: 'Por determinar',
            descripcion: 'Nombre del administrador'
          },
          certificaciones: {
            tipo: 'text',
            valor: 'Por determinar',
            descripcion: 'Certificaciones de la hacienda'
          }
        }

        const { locationCoordinator } = await import('@/services/locationCoordinator')
        let gps = { lat: null, lng: null }
        try {
          const pos = await locationCoordinator.getPosition()
          gps = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          console.log('[HaciendaStore] GPS capturado para nueva hacienda')
        } catch (e) {
          console.warn('[HaciendaStore] No se pudo capturar GPS para nueva hacienda:', e.message)
        }

        const haciendaData = {
          name: haciendaName.toUpperCase(),
          location: '',
          info: '',
          plan: haciendaPlan,
          metricas: metricasDefault,
          gps: gps
        }

        const newHacienda = await pb.collection('Haciendas').create(haciendaData)
        syncStore.saveToLocalStorage('mi_hacienda', newHacienda)
        uiFeedbackStore.showSnackbar('Hacienda creada exitosamente', 'success')
        return newHacienda
      } catch (error) {
        handleError(error, 'Error al crear la hacienda')
        throw error
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async addMetrica(key, metricaData) {
      if (!this.mi_hacienda) return

      const haciendaData = { ...this.mi_hacienda }
      if (!haciendaData.metricas) haciendaData.metricas = {}

      haciendaData.metricas[key] = {
        tipo: metricaData.tipo,
        valor: this.getDefaultMetricaValue(metricaData.tipo),
        descripcion: metricaData.descripcion
      }

      return this.updateHacienda(haciendaData)
    },

    async removeMetrica(key) {
      if (!this.mi_hacienda || !this.mi_hacienda.metricas) return

      const haciendaData = { ...this.mi_hacienda }
      const metricas = { ...haciendaData.metricas }

      delete metricas[key]
      haciendaData.metricas = metricas

      return this.updateHacienda(haciendaData)
    },

    getDefaultMetricaValue(tipo) {
      switch (tipo) {
        case 'checkbox':
          return []
        case 'number':
          return 0
        case 'text':
          return 'Por determinar'
        case 'boolean':
          return false
        case 'select':
          return null
        case 'date':
          return new Date().toISOString().split('T')[0]
        default:
          return null
      }
    },

    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('haciendas', tempId, newItem, this.mi_hacienda, {
        referenceFields: ['hacienda'],
        geoFields: ['ubicacion']
      })
    },

    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem('haciendas', tempId, realId, this.mi_hacienda, [
        'hacienda'
      ])
    },

    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('haciendas', id, this.mi_hacienda)
    }
  }
})

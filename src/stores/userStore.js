import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { createUserData, createUserUpdateData } from '@/utils/userDataFactory'
import { useEvents } from '@/composables/useEvents'
import { EVENTS } from '@/utils/eventBus'
import { logger } from '@/utils/logger'
import { useSyncStore } from '@/stores/sync'

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [],
    loading: false,
    initialized: false,
    pagination: {
      page: 1,
      perPage: 50,
      totalItems: 0,
      totalPages: 0
    },
    filters: {
      search: '',
      role: '',
      status: ''
    }
  }),

  persist: {
    key: 'users',
    storage: localStorage,
    paths: []
  },

  actions: {
    async fetchUsers(options = {}) {
      this.loading = true
      try {
        const { expand = '', sort = '-created', filter = '', usePagination = false, page = 1, perPage = 50 } = options
        
        if (usePagination) {
          // Usar getList para paginación real
          const result = await pb.collection('users').getList(page, perPage, {
            sort,
            expand,
            filter
          })
          this.users = result.items
          this.pagination = {
            page: result.page,
            perPage: result.perPage,
            totalItems: result.totalItems,
            totalPages: result.totalPages
          }
        } else {
          // Usar getFullList para listado completo
          const query = { sort }
          if (expand) query.expand = expand
          if (filter) query.filter = filter
          this.users = await pb.collection('users').getFullList(query)
        }
        
        this.initialized = true
        return this.users
      } catch (error) {
        handleError(error, 'Error al cargar usuarios')
        return []
      } finally {
        this.loading = false
      }
    },

    async fetchHaciendas() {
      try {
        return await pb.collection('Haciendas').getFullList({ sort: 'name' })
      } catch (error) {
        handleError(error, 'Error al cargar haciendas')
        return []
      }
    },

    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },

    resetFilters() {
      this.filters = {
        search: '',
        role: '',
        status: ''
      }
    },

    async fetchHaciendaUsers(haciendaId) {
      if (!haciendaId) return []
      this.loading = true
      try {
        const users = await pb.collection('users').getFullList({
          filter: `hacienda='${haciendaId}'`,
          sort: 'created'
        })
        return users
      } catch (error) {
        handleError(error, 'Error al cargar usuarios de hacienda')
        return []
      } finally {
        this.loading = false
      }
    },

    async createUser(data) {
      this.loading = true
      const syncStore = useSyncStore()

      try {
        if (!syncStore.isOnline) {
          // Modo offline: encolar operación
          const tempId = await syncStore.queueOperation({
            type: 'create',
            collection: 'users',
            data
          })
          const tempRecord = { ...data, id: tempId, _pending: true }
          this.users.push(tempRecord)
          logger.info('[USER_STORE] Usuario creado offline (pendiente)', { tempId })
          return tempRecord
        }

        // Modo online: crear directamente
        const record = await pb.collection('users').create(data)
        this.users.push(record)
        logger.info('[USER_STORE] Usuario creado online', { userId: record.id })
        return record
      } catch (error) {
        handleError(error, 'Error al crear usuario')
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateUser(userId, data) {
      this.loading = true
      const syncStore = useSyncStore()

      try {
        if (!syncStore.isOnline) {
          // Modo offline: encolar operación
          await syncStore.queueOperation({
            type: 'update',
            collection: 'users',
            id: userId,
            data
          })
          // Actualizar localmente con flag pending
          const index = this.users.findIndex(u => u.id === userId)
          if (index !== -1) {
            this.users[index] = { ...this.users[index], ...data, _pending: true }
          }
          logger.info('[USER_STORE] Usuario actualizado offline (pendiente)', { userId })
          return this.users[index]
        }

        // Modo online: actualizar directamente
        const record = await pb.collection('users').update(userId, data)
        const index = this.users.findIndex(u => u.id === userId)
        if (index !== -1) {
          this.users[index] = record
        }
        logger.info('[USER_STORE] Usuario actualizado online', { userId })
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar usuario')
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteUser(userId, { soft = true } = {}) {
      this.loading = true
      const { emit } = useEvents()
      
      try {
        if (soft) {
          // Soft delete: cambiar status a inactive
          const record = await pb.collection('users').update(userId, { status: 'inactive' })
          const index = this.users.findIndex(u => u.id === userId)
          if (index !== -1) {
            this.users[index] = record
          }
          emit(EVENTS.USUARIO_REMOVED, { userId, soft: true })
          logger.info('[USER_STORE] Usuario desactivado (soft delete)', { userId })
        } else {
          // Hard delete: eliminar permanentemente
          await pb.collection('users').delete(userId)
          this.users = this.users.filter(u => u.id !== userId)
          emit(EVENTS.USUARIO_REMOVED, { userId, soft: false })
          logger.info('[USER_STORE] Usuario eliminado permanentemente', { userId })
        }
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar usuario')
        throw error
      } finally {
        this.loading = false
      }
    },

    async requestPasswordReset(email) {
      try {
        await pb.collection('users').requestPasswordReset(email)
        logger.info('[USER_STORE] Solicitud de reset de password enviada', { email })
        return true
      } catch (error) {
        handleError(error, 'Error al solicitar reset de password')
        throw error
      }
    },

    async adminResetPassword(userId, newPassword) {
      this.loading = true
      try {
        await pb.collection('users').update(userId, {
          password: newPassword,
          passwordConfirm: newPassword
        })
        logger.info('[USER_STORE] Password reseteado por admin', { userId })
        return true
      } catch (error) {
        handleError(error, 'Error al resetear password')
        throw error
      } finally {
        this.loading = false
      }
    },

    async registerUser(formData, role, haciendaId, isNewHacienda = false) {
      this.loading = true
      const { emit } = useEvents()
      
      try {
        // Usar factory para evitar acoplamiento circular con authStore
        const data = createUserData(formData, role, haciendaId, isNewHacienda)
        const user = await pb.collection('users').create(data)
        
        this.users.unshift(user)
        
        emit(EVENTS.USUARIO_ADDED, { userId: user.id, haciendaId, role })
        logger.info('[USER_STORE] Usuario registrado', { userId: user.id, haciendaId, role })
        
        return user
      } catch (error) {
        handleError(error, 'Error al registrar usuario')
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateUserWithForm(userId, formData, role, haciendaId) {
      this.loading = true
      const { emit } = useEvents()
      
      try {
        const data = createUserUpdateData(formData, role, haciendaId)
        const user = await pb.collection('users').update(userId, data)
        
        const index = this.users.findIndex(u => u.id === userId)
        if (index !== -1) {
          this.users[index] = user
        }
        
        emit(EVENTS.HACIENDA_UPDATED, { userId, haciendaId, role })
        logger.info('[USER_STORE] Usuario actualizado', { userId, haciendaId })
        
        return user
      } catch (error) {
        handleError(error, 'Error al actualizar usuario')
        throw error
      } finally {
        this.loading = false
      }
    },

    reset() {
      this.users = []
      this.loading = false
      this.initialized = false
      this.pagination = {
        page: 1,
        perPage: 50,
        totalItems: 0,
        totalPages: 0
      }
      this.filters = {
        search: '',
        role: '',
        status: ''
      }
    }
  }
})

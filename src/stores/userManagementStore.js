import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useEvents } from '@/composables/useEvents'
import { EVENTS } from '@/utils/eventTypes'
import { logger } from '@/utils/logger'

export const useUserManagementStore = defineStore('userManagement', {
  state: () => ({
    users: [],
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
      role: '',
      status: '',
      hacienda: ''
    }
  }),

  getters: {
    /**
     * Obtener usuarios filtrados
     */
    filteredUsers: (state) => {
      let filtered = state.users

      if (state.filters.search) {
        const search = state.filters.search.toLowerCase()
        filtered = filtered.filter(u =>
          u.email?.toLowerCase().includes(search) ||
          u.name?.toLowerCase().includes(search) ||
          u.username?.toLowerCase().includes(search)
        )
      }

      if (state.filters.role) {
        filtered = filtered.filter(u => u.role === state.filters.role)
      }

      if (state.filters.status) {
        filtered = filtered.filter(u => u.status === state.filters.status)
      }

      return filtered
    }
  },

  actions: {
    /**
     * Cargar usuarios con filtros
     */
    async fetchUsers(filters = {}) {
      this.loading = true
      this.error = null

      try {
        const filterParts = []

        if (filters.role) {
          filterParts.push(`role = "${filters.role}"`)
        }

        if (filters.status) {
          filterParts.push(`status = "${filters.status}"`)
        }

        const filterString = filterParts.length > 0 ? filterParts.join(' && ') : ''

        const result = await pb.collection('users').getList(
          filters.page || 1,
          filters.perPage || 50,
          {
            filter: filterString,
            sort: '-created',
            expand: 'haciendas'
          }
        )

        this.users = result.items
        this.pagination = {
          page: result.page,
          perPage: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        }

        logger.info('[USER_MANAGEMENT] Usuarios cargados', { count: this.users.length })
      } catch (error) {
        handleError(error, 'Error cargando usuarios')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Crear usuario
     */
    async createUser(userData) {
      this.loading = true
      this.error = null

      try {
        const { emit } = useEvents()

        // Validar límite de usuarios si se asigna a hacienda
        if (userData.hacienda) {
          await this.validateUserLimit(userData.hacienda)
        }

        const user = await pb.collection('users').create({
          email: userData.email,
          username: userData.username,
          name: userData.name,
          lastname: userData.lastname,
          role: userData.role || 'operador',
          status: userData.status || 'active',
          haciendas: userData.hacienda ? [userData.hacienda] : [],
          password: userData.password,
          passwordConfirm: userData.password
        })

        // Emitir evento
        emit(EVENTS.USUARIO_ADDED, { userId: user.id, haciendaId: userData.hacienda })

        this.users.unshift(user)
        logger.info('[USER_MANAGEMENT] Usuario creado', { userId: user.id })

        return user
      } catch (error) {
        handleError(error, 'Error creando usuario')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Actualizar usuario
     */
    async updateUser(userId, userData) {
      this.loading = true
      this.error = null

      try {
        const { emit } = useEvents()
        const oldUser = this.users.find(u => u.id === userId)

        // Validar límite si cambia de hacienda
        if (userData.hacienda && userData.hacienda !== oldUser?.haciendas?.[0]) {
          await this.validateUserLimit(userData.hacienda)
        }

        const updateData = {
          email: userData.email,
          username: userData.username,
          name: userData.name,
          lastname: userData.lastname,
          role: userData.role,
          status: userData.status,
          haciendas: userData.hacienda ? [userData.hacienda] : []
        }

        // Solo incluir password si se proporciona
        if (userData.password) {
          updateData.password = userData.password
          updateData.passwordConfirm = userData.password
        }

        const user = await pb.collection('users').update(userId, updateData)

        // Actualizar en estado local
        const index = this.users.findIndex(u => u.id === userId)
        if (index !== -1) {
          this.users[index] = user
        }

        // Emitir evento
        emit(EVENTS.HACIENDA_UPDATED, { userId: user.id, haciendaId: userData.hacienda })

        logger.info('[USER_MANAGEMENT] Usuario actualizado', { userId: user.id })
        return user
      } catch (error) {
        handleError(error, 'Error actualizando usuario')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Eliminar usuario (soft delete - cambiar status a inactive)
     */
    async deleteUser(userId) {
      this.loading = true
      this.error = null

      try {
        const { emit } = useEvents()

        await pb.collection('users').update(userId, {
          status: 'inactive'
        })

        // Actualizar en estado local
        const index = this.users.findIndex(u => u.id === userId)
        if (index !== -1) {
          this.users[index].status = 'inactive'
        }

        // Emitir evento
        emit(EVENTS.USUARIO_REMOVED, { userId })

        logger.info('[USER_MANAGEMENT] Usuario eliminado (soft delete)', { userId })
      } catch (error) {
        handleError(error, 'Error eliminando usuario')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Reset password de usuario
     */
    async resetPassword(userId, newPassword) {
      this.loading = true
      this.error = null

      try {
        await pb.collection('users').update(userId, {
          password: newPassword,
          passwordConfirm: newPassword
        })

        logger.info('[USER_MANAGEMENT] Password reseteado', { userId })
      } catch (error) {
        handleError(error, 'Error reseteando password')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Asignar usuario a hacienda
     */
    async assignUserToHacienda(userId, haciendaId) {
      this.loading = true
      this.error = null

      try {
        await this.validateUserLimit(haciendaId)

        const user = await pb.collection('users').update(userId, {
          haciendas: [haciendaId]
        })

        // Actualizar en estado local
        const index = this.users.findIndex(u => u.id === userId)
        if (index !== -1) {
          this.users[index] = user
        }

        const { emit } = useEvents()
        emit(EVENTS.HACIENDA_UPDATED, { userId, haciendaId })

        logger.info('[USER_MANAGEMENT] Usuario asignado a hacienda', { userId, haciendaId })
        return user
      } catch (error) {
        handleError(error, 'Error asignando usuario a hacienda')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Asignar rol a usuario
     */
    async assignUserRole(userId, role) {
      this.loading = true
      this.error = null

      try {
        const user = await pb.collection('users').update(userId, {
          role
        })

        // Actualizar en estado local
        const index = this.users.findIndex(u => u.id === userId)
        if (index !== -1) {
          this.users[index] = user
        }

        logger.info('[USER_MANAGEMENT] Rol asignado', { userId, role })
        return user
      } catch (error) {
        handleError(error, 'Error asignando rol')
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Validar límite de usuarios por hacienda
     */
    async validateUserLimit(haciendaId) {
      try {
        // Obtener suscripción de la hacienda
        const subscriptions = await pb.collection('subscriptions').getFullList({
          filter: `hacienda = "${haciendaId}" && is_active = true`
        })

        if (subscriptions.length === 0) {
          // Sin suscripción, usar límite default (ej: 5 usuarios)
          return
        }

        // Contar usuarios activos en la hacienda
        const usersInHacienda = this.users.filter(u =>
          u.haciendas?.includes(haciendaId) && u.status === 'active'
        )

        // Verificar si hay límite en la suscripción (campo user_limit)
        // Si no existe el campo, no hay límite
        const subscription = subscriptions[0]
        const userLimit = subscription.user_limit

        if (userLimit && usersInHacienda.length >= userLimit) {
          throw new Error(`Límite de usuarios alcanzado (${usersInHacienda.length}/${userLimit})`)
        }
      } catch (error) {
        if (error.message.includes('Límite')) {
          throw error
        }
        // Silenciar errores de validación (campo puede no existir)
        logger.warn('[USER_MANAGEMENT] No se pudo validar límite de usuarios', error.message)
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
      this.users = []
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
        role: '',
        status: '',
        hacienda: ''
      }
    }
  }
})

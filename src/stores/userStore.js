import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [],
    loading: false,
    initialized: false
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
        const { expand = '', sort = '-created', filter = '' } = options
        const query = { sort }
        if (expand) query.expand = expand
        if (filter) query.filter = filter

        this.users = await pb.collection('users').getFullList(query)
        this.initialized = true
        return this.users
      } catch (error) {
        handleError(error, 'Error al cargar usuarios')
        return []
      } finally {
        this.loading = false
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
      try {
        const record = await pb.collection('users').create(data)
        this.users.push(record)
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
      try {
        const record = await pb.collection('users').update(userId, data)
        const index = this.users.findIndex(u => u.id === userId)
        if (index !== -1) {
          this.users[index] = record
        }
        return record
      } catch (error) {
        handleError(error, 'Error al actualizar usuario')
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteUser(userId) {
      this.loading = true
      try {
        await pb.collection('users').delete(userId)
        this.users = this.users.filter(u => u.id !== userId)
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar usuario')
        throw error
      } finally {
        this.loading = false
      }
    },

    async registerUser(formData, role, haciendaId) {
      const { useAuthStore } = await import('./authStore')
      const authStore = useAuthStore()
      const data = authStore.createUserData(
        formData.username,
        formData.email,
        formData.firstname,
        formData.lastname,
        formData.password,
        role,
        haciendaId,
        false
      )
      return this.createUser(data)
    }
  }
})

import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useSyncStore } from './syncStore'
import { useAvatarStore } from './avatarStore'

export const useHaciendaStore = defineStore('hacienda', {
  state: () => {
    const syncStore = useSyncStore()
    const haciendaId = syncStore.loadFromLocalStorage('mi_hacienda')?.id
    const haciendaUsersJson = haciendaId
      ? localStorage.getItem(`hacienda_users_${haciendaId}`)
      : null
    const haciendaUsers = haciendaUsersJson ? JSON.parse(haciendaUsersJson) : []

    return {
      mi_hacienda: syncStore.loadFromLocalStorage('mi_hacienda'),
      haciendaUsers
    }
  },

  persist: {
    key: 'hacienda',
    storage: localStorage,
    paths: ['mi_hacienda', 'haciendaUsers']
  },

  getters: {
    haciendaName: (state) => state.mi_hacienda?.name || '',
    avatarHaciendaUrl: (state) => {
      const avatarStore = useAvatarStore()
      return avatarStore.getAvatarUrl({ ...state.mi_hacienda, type: 'hacienda' }, 'Haciendas')
    }
  },

  actions: {
    async init() {
      if (!this.haciendaUsers.length) {
        await this.fetchHaciendaUsers()
      }
    },

    async updateHacienda(haciendaData) {
      const syncStore = useSyncStore()
      const snackbarStore = useSnackbarStore()

      // Verificar que la hacienda existe
      if (!this.mi_hacienda || !this.mi_hacienda.id) {
        throw new Error('No hay hacienda seleccionada para actualizar')
      }

      const dataToUpdate = { ...haciendaData }
      if (!dataToUpdate.avatar && this.mi_hacienda.avatar) {
        dataToUpdate.avatar = this.mi_hacienda.avatar
      }

      // Convertir el nombre a mayúsculas si está presente
      if (dataToUpdate.name) {
        dataToUpdate.name = dataToUpdate.name.toUpperCase()
      }

      if (!syncStore.isOnline) {
        // Actualizar localmente
        this.mi_hacienda = {
          ...this.mi_hacienda,
          ...dataToUpdate,
          updated: new Date().toISOString()
        }

        // Guardar en localStorage
        syncStore.saveToLocalStorage('mi_hacienda', this.mi_hacienda)

        // Encolar para sincronización
        await syncStore.queueOperation({
          type: 'update',
          collection: 'Haciendas',
          id: this.mi_hacienda.id,
          data: dataToUpdate
        })

        return this.mi_hacienda
      }

      snackbarStore.showLoading()

      try {
        const updatedHacienda = await pb
          .collection('Haciendas')
          .update(this.mi_hacienda.id, dataToUpdate)
        this.mi_hacienda = updatedHacienda
        syncStore.saveToLocalStorage('mi_hacienda', this.mi_hacienda)
        snackbarStore.showSnackbar('Hacienda actualizada con éxito', 'success')

        return updatedHacienda
      } catch (error) {
        handleError(error, 'Error al actualizar la hacienda')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async fetchHacienda(haciendaId) {
      const syncStore = useSyncStore()

      this.loading = true

      const mi_haciendaLocal = useSyncStore().loadFromLocalStorage('mi_hacienda')
      if (mi_haciendaLocal) {
        this.mi_hacienda = mi_haciendaLocal
        this.baseImageUrl = syncStore.loadFromLocalStorage('baseImageUrl')

        return this.mi_hacienda
      }

      try {
        if (syncStore.isOnline) {
          this.mi_hacienda = await pb.collection('Haciendas').getOne(haciendaId)
          this.baseImageUrl = pb.baseUrl + '/api/files'

          // Usar syncStore en lugar de localStorage directamente
          syncStore.saveToLocalStorage('mi_hacienda', this.mi_hacienda)
          syncStore.saveToLocalStorage('baseImageUrl', this.baseImageUrl)
        } else {
          this.mi_hacienda = syncStore.loadFromLocalStorage('mi_hacienda')
          this.baseImageUrl = syncStore.loadFromLocalStorage('baseImageUrl')
        }
      } catch (error) {
        handleError(error, 'Error loading hacienda information')
      }
    },

    async fetchHaciendaUsers() {
      const haciendaId = this.mi_hacienda?.id
      if (!haciendaId) {
        throw new Error('No hay hacienda seleccionada')
      }

      // Verificar si ya hay usuarios en el estado
      if (this.haciendaUsers.length > 0) {
        return this.haciendaUsers
      }

      // Verificar si hay usuarios en localStorage
      const haciendaUsersJson = localStorage.getItem(`hacienda_users_${haciendaId}`)
      if (haciendaUsersJson) {
        this.haciendaUsers = JSON.parse(haciendaUsersJson)
        return this.haciendaUsers
      }

      // Si no hay usuarios en localStorage, cargar desde PocketBase
      try {
        const users = await pb.collection('users').getFullList({
          filter: `hacienda = "${haciendaId}"`,
          sort: 'created'
        })

        // Guardar en el estado y en localStorage
        this.haciendaUsers = users
        localStorage.setItem(`hacienda_users_${haciendaId}`, JSON.stringify(users))
        return users
      } catch (error) {
        handleError(error, 'Error fetching hacienda users')
        return []
      }
    },

    async deleteHaciendaUser(userId) {
      const snackbarStore = useSnackbarStore()
      const syncStore = useSyncStore()
      snackbarStore.showLoading()

      // Verificar que el ID existe
      if (!userId) {
        snackbarStore.hideLoading()
        throw new Error('ID de usuario no proporcionado para eliminación')
      }

      try {
        if (!syncStore.isOnline) {
          // Verificar si el usuario existe antes de eliminarlo
          const users =
            syncStore.loadFromLocalStorage(`hacienda_users_${this.mi_hacienda.id}`) || []
          const userExiste = users.some((user) => user.id === userId)
          if (!userExiste) {
            snackbarStore.hideLoading()
            throw new Error(`No se encontró usuario con ID: ${userId}`)
          }

          await syncStore.queueOperation({
            type: 'delete',
            collection: 'users',
            id: userId
          })
          // Actualizar UI inmediatamente
          const updatedUsers = users.filter((user) => user.id !== userId)
          syncStore.saveToLocalStorage(`hacienda_users_${this.mi_hacienda.id}`, updatedUsers)
          snackbarStore.hideLoading()
          return true
        }

        await pb.collection('users').delete(userId)
        // Actualizar localStorage después de eliminar
        const users = syncStore.loadFromLocalStorage(`hacienda_users_${this.mi_hacienda.id}`) || []
        const updatedUsers = users.filter((user) => user.id !== userId)
        syncStore.saveToLocalStorage(`hacienda_users_${this.mi_hacienda.id}`, updatedUsers)

        snackbarStore.showSnackbar('Usuario eliminado con éxito', 'success')
        return true
      } catch (error) {
        handleError(error, 'Error al eliminar usuario')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async createHacienda(haciendaName, haciendaPlan) {
      const snackbarStore = useSnackbarStore()
      const syncStore = useSyncStore()
      snackbarStore.showLoading()

      try {
        // Validar nombre de hacienda
        if (!haciendaName || haciendaName.length < 3) {
          throw new Error('El nombre de la hacienda debe tener al menos 3 caracteres')
        }

        // Crear métricas predeterminadas
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

        const haciendaData = {
          name: haciendaName.toUpperCase(), // Convertir a mayúsculas
          location: '',
          info: '',
          plan: haciendaPlan,
          metricas: metricasDefault, // Agregar métricas predeterminadas
          gps: { lat: null, lng: null }
        }

        const newHacienda = await pb.collection('Haciendas').create(haciendaData)
        syncStore.saveToLocalStorage('mi_hacienda', newHacienda)
        snackbarStore.showSnackbar('Hacienda creada exitosamente', 'success')
        return newHacienda
      } catch (error) {
        handleError(error, 'Error al crear la hacienda')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    // Método para agregar una métrica personalizada
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

    // Método para eliminar una métrica
    async removeMetrica(key) {
      if (!this.mi_hacienda || !this.mi_hacienda.metricas) return

      const haciendaData = { ...this.mi_hacienda }
      const metricas = { ...haciendaData.metricas }

      delete metricas[key]
      haciendaData.metricas = metricas

      return this.updateHacienda(haciendaData)
    },

    // Obtener valor predeterminado según el tipo de métrica
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

    // Método para actualizar un elemento local con un ID temporal a un elemento con ID real de PocketBase
    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem('haciendas', tempId, newItem, this.mi_hacienda, {
        referenceFields: ['hacienda'],
        geoFields: ['ubicacion']
      })
    },

    // Método para actualizar referencias a un ID temporal en otros elementos
    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem('haciendas', tempId, realId, this.mi_hacienda, [
        'hacienda'
      ])
    },

    // Método para eliminar un elemento local
    removeLocalItem(id) {
      return useSyncStore().removeLocalItem('haciendas', id, this.mi_hacienda)
    }
  }
})

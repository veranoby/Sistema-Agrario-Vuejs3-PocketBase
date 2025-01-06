import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useSyncStore } from './syncStore'
import { useAvatarStore } from './avatarStore'

export const useHaciendaStore = defineStore('hacienda', {
  state: () => {
    const syncStore = useSyncStore()
    return {
      mi_hacienda: syncStore.loadFromLocalStorage('mi_hacienda')
    }
  },

  getters: {
    haciendaName: (state) => state.mi_hacienda?.name || '',
    avatarHaciendaUrl: (state) => {
      const avatarStore = useAvatarStore()
      return avatarStore.getAvatarUrl({ ...state.mi_hacienda, type: 'hacienda' }, 'Haciendas')
    }
  },

  actions: {
    async updateHacienda(haciendaData) {
      const syncStore = useSyncStore()

      const dataToUpdate = { ...haciendaData }
      if (!dataToUpdate.avatar && this.mi_hacienda.avatar) {
        dataToUpdate.avatar = this.mi_hacienda.avatar
      }

      if (!syncStore.isOnline) {
        console.log('No hay conexión a Internet. Agregando a cola de sincronización.')
        await syncStore.queueOperation({
          type: 'update',
          collection: 'Haciendas',
          id: this.mi_hacienda.id,
          data: dataToUpdate
        })
        this.mi_hacienda = { ...this.mi_hacienda, ...dataToUpdate }
        return
      }

      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        // Convertir el nombre a mayúsculas si está presente
        if (haciendaData.name) {
          haciendaData.name = haciendaData.name.toUpperCase()
        }

        const updatedHacienda = await pb
          .collection('Haciendas')
          .update(this.mi_hacienda.id, haciendaData)
        this.mi_hacienda = updatedHacienda
        syncStore.saveToLocalStorage('mi_hacienda', this.mi_hacienda)
        snackbarStore.showSnackbar('Hacienda actualizada con éxito', 'success')

        return updatedHacienda
      } catch (error) {
        handleError(error, 'Error al actualizar la hacienda')
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
      //listo
      try {
        const users = await pb.collection('users').getFullList({
          filter: `hacienda = "${this.mi_hacienda.id}" && role != "administrador"`,
          sort: 'created'
        })
        localStorage.setItem(`hacienda_users_${this.mi_hacienda.id}`, JSON.stringify(users)) // Guardar usuarios en localStorage
        console.log('Cargando usuarios de hacienda desde localStorage')
        return users
      } catch (error) {
        handleError(error, 'Error fetching hacienda users')
      }
    },

    async deleteHaciendaUser(userId) {
      const snackbarStore = useSnackbarStore()
      const syncStore = useSyncStore()
      snackbarStore.showLoading()

      try {
        if (!syncStore.isOnline) {
          await syncStore.queueOperation({
            type: 'delete',
            collection: 'users',
            id: userId
          })
          // Actualizar UI inmediatamente
          const users =
            syncStore.loadFromLocalStorage(`hacienda_users_${this.mi_hacienda.id}`) || []
          const updatedUsers = users.filter((user) => user.id !== userId)
          syncStore.saveToLocalStorage(`hacienda_users_${this.mi_hacienda.id}`, updatedUsers)
          return
        }

        await pb.collection('users').delete(userId)
        // Actualizar localStorage después de eliminar
        console.log('Actualizando localStorage después de eliminar usuario')
        const users = syncStore.loadFromLocalStorage(`hacienda_users_${this.mi_hacienda.id}`) || []
        const updatedUsers = users.filter((user) => user.id !== userId)
        syncStore.saveToLocalStorage(`hacienda_users_${this.mi_hacienda.id}`, updatedUsers)

        snackbarStore.showSnackbar('Usuario eliminado con éxito', 'success')
      } catch (error) {
        handleError(error, 'Error al eliminar usuario')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async createHacienda(haciendaName, haciendaPlan) {
      const snackbarStore = useSnackbarStore()
      const syncStore = useSyncStore()
      snackbarStore.showLoading()

      try {
        const haciendaData = {
          name: haciendaName.toUpperCase(), // Convertir a mayúsculas
          location: '',
          info: '',
          plan: haciendaPlan
        }
        const newHacienda = await pb.collection('Haciendas').create(haciendaData)
        // Guardar nueva hacienda en localStorage
        syncStore.saveToLocalStorage('mi_hacienda', newHacienda)
        console.log('Nueva hacienda guardada en localStorage:', newHacienda)
        snackbarStore.showSnackbar('Hacienda created successfully', 'success')
        console.log('Guardando nueva hacienda en localStorage')
        return newHacienda
      } catch (error) {
        handleError(error, 'Failed to create hacienda')
      } finally {
        snackbarStore.hideLoading()
      }
    }

    // ... otros métodos ...
  }
})

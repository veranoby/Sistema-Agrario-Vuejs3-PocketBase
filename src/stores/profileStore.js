import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useSyncStore } from './syncStore'
//import placeholderUser from '@/assets/placeholder-user.png'
//import { useHaciendaStore } from './haciendaStore'
import { useAvatarStore } from './avatarStore'

export const useProfileStore = defineStore('profile', {
  state: () => {
    const syncStore = useSyncStore()
    return {
      user: syncStore.loadFromLocalStorage('user') || null,
      version: 1
    }
  },

  persist: {
    key: 'profile',
    storage: localStorage,
    paths: ['user']
  },

  getters: {
    avatarUrl: (state) => {
      const avatarStore = useAvatarStore()
      return avatarStore.getAvatarUrl({ ...state.user, type: 'user' }, 'users')
    },

    userRole: (state) => (state.user ? state.user.role : ''),

    fullName: (state) => (state.user ? `${state.user.name} ${state.user.lastname}` : '')
  },

  actions: {
    async changePassword(oldPassword, newPassword) {
      if (!this.user) {
        throw new Error('No hay usuario autenticado para cambiar la contraseña.')
      }

      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        await syncStore.queueOperation({
          type: 'changePassword',
          collection: 'users',
          id: this.user.id,
          data: { oldPassword, newPassword }
        })
        return
      }

      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        await pb.collection('users').update(this.user.id, {
          oldPassword,
          password: newPassword,
          passwordConfirm: newPassword
        })
        snackbarStore.showSnackbar('Password changed successfully', 'success')
      } catch (error) {
        handleError(error, 'Failed to change password')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateProfile(profileData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()
      const syncStore = useSyncStore()

      // Verificar que el usuario existe
      if (!this.user || !this.user.id) {
        snackbarStore.hideLoading()
        throw new Error('No hay usuario autenticado para actualizar')
      }

      if (!syncStore.isOnline) {
        // Actualizar localmente
        this.user = { 
          ...this.user, 
          ...profileData,
          updated: new Date().toISOString()
        }
        
        // Guardar en localStorage
        syncStore.saveToLocalStorage('user', this.user)
        
        // Encolar para sincronización
        await syncStore.queueOperation({
          type: 'updateProfile',
          collection: 'users',
          id: this.user.id,
          data: profileData
        })
        
        snackbarStore.hideLoading()
        return this.user
      }

      try {
        const updatedUser = await pb.collection('users').update(this.user.id, profileData)
        this.user = updatedUser
        syncStore.saveToLocalStorage('user', this.user)
        snackbarStore.showSnackbar('Perfil actualizado con éxito', 'success')
        return updatedUser
      } catch (error) {
        handleError(error, 'Error al actualizar el perfil')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    setUser(user) {
      const syncStore = useSyncStore()
      this.user = user
      if (user) {
        syncStore.saveToLocalStorage('user', user)
      } else {
        syncStore.removeFromLocalStorage('user')
      }
    },

    async init() {
      const syncStore = useSyncStore()
      const userData = syncStore.loadFromLocalStorage('user')
      if (userData) {
        this.setUser(userData)
      }
    },

    // Método para actualizar un elemento local
    updateLocalItem(tempId, newItem) {
      return useSyncStore().updateLocalItem(
        'profile',
        tempId,
        newItem,
        this.user,
        {
          referenceFields: ['perfil', 'usuario'],
          sensitiveFields: ['email', 'password']
        }
      )
    },

    // Método para actualizar referencias
    updateReferencesToItem(tempId, realId) {
      return useSyncStore().updateReferencesToItem(
        'profile',
        tempId,
        realId,
        this.user,
        ['perfil', 'usuario']
      )
    },

    // Método para eliminar un elemento local
    removeLocalItem(id) {
      return useSyncStore().removeLocalItem(
        'profile',
        id,
        this.user
      )
    }
  }
})

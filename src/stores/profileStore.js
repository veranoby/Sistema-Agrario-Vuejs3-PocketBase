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

  getters: {
    avatarUrl: (state) => {
      const avatarStore = useAvatarStore()
      return avatarStore.getAvatarUrl({ ...state.user, type: 'user' }, 'users')
    },

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
      if (!this.user) {
        throw new Error('No hay usuario autenticado para actualizar el perfil.')
      }

      const syncStore = useSyncStore()
      if (!syncStore.isOnline) {
        // Actualizar localmente
        this.user = { ...this.user, ...profileData }
        syncStore.saveToLocalStorage('user', this.user)

        // Encolar para sincronización
        await syncStore.queueOperation({
          type: 'updateProfile',
          collection: 'users',
          id: this.user.id,
          data: profileData
        })
        return this.user
      }

      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const updatedUser = await pb.collection('users').update(this.user.id, profileData)
        this.setUser(updatedUser)
        snackbarStore.showSnackbar('Profile updated successfully', 'success')
        return updatedUser
      } catch (error) {
        handleError(error, 'Failed to update profile')
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
    }
  }
})

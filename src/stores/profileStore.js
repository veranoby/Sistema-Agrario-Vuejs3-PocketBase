import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import placeholderUser from '@/assets/placeholder-user.png'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null // Cargar desde localStorage
  }),

  getters: {
    avatarUrl: (state) => {
      if (state.user && state.user.avatar) {
        return pb.getFileUrl(state.user, state.user.avatar)

        //    return `${pb.baseUrl}/api/files/${state.user.collectionName}/${state.user.id}/${state.user.avatar}`
      }
      return placeholderUser
    },
    fullName: (state) => (state.user ? `${state.user.name} ${state.user.lastname}` : '')
  },

  actions: {
    async changePassword(oldPassword, newPassword) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        await pb.collection('users').update(this.user.id, {
          oldPassword: oldPassword,
          password: newPassword,
          passwordConfirm: newPassword
        })
        snackbarStore.showSnackbar('Password changed successfully', 'success')
      } catch (error) {
        handleError(error, 'Failed to change password')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateProfile(profileData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const updatedUser = await pb.collection('users').update(this.user.id, profileData)
        this.setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser)) // Sincronizar con localStorage
        console.log('Perfil actualizado en localStorage:', updatedUser)
        snackbarStore.showSnackbar('Profile updated successfully', 'success')
      } catch (error) {
        handleError(error, 'Failed to update profile')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateAvatar(file) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const formData = new FormData()
        formData.append('avatar', file)

        const updatedUser = await pb.collection('users').update(this.user.id, formData)
        this.setUser(updatedUser)
        //   snackbarStore.showSnackbar('Avatar updated successfully', 'success')
      } catch (error) {
        handleError(error, 'Failed to update avatar')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    setUser(user) {
      this.user = user
      localStorage.setItem('user', JSON.stringify(user)) // Sincronizar con localStorage
      console.log('Usuario establecido en localStorage:', user)
    }
  }
})

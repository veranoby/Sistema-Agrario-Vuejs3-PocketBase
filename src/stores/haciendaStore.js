import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'

export const useHaciendaStore = defineStore('hacienda', {
  state: () => ({
    mi_hacienda: null
  }),

  getters: {
    haciendaName: (state) => (state.mi_hacienda ? state.mi_hacienda.name : '')
  },

  actions: {
    async fetchHacienda(haciendaId) {
      try {
        const hacienda = await pb.collection('HaciendaLabel').getOne(haciendaId)
        this.mi_hacienda = hacienda
        return hacienda
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
        return users
      } catch (error) {
        handleError(error, 'Error fetching hacienda users')
      }
    },

    async createHaciendaUser(userData) {
      //listo
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const newUser = await pb.collection('users').create(userData)
        snackbarStore.showSnackbar('User created successfully', 'success')
        return newUser
      } catch (error) {
        handleError(error, 'Failed to create user')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async deleteHaciendaUser(userId) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        await pb.collection('users').delete(userId)
        snackbarStore.showSnackbar('User deleted successfully', 'success')
      } catch (error) {
        handleError(error, 'Failed to delete user')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateHacienda(haciendaData) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const updatedHacienda = await pb
          .collection('HaciendaLabel')
          .update(this.mi_hacienda.id, haciendaData)
        this.mi_hacienda = updatedHacienda
        snackbarStore.showSnackbar('Hacienda information updated successfully', 'success')
        return updatedHacienda
      } catch (error) {
        handleError(error, 'Failed to update hacienda information')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async createHacienda(haciendaName, haciendaPlan) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const haciendaData = {
          name: haciendaName.toUpperCase(),
          location: '',
          info: '',
          plan: haciendaPlan
        }
        const newHacienda = await pb.collection('HaciendaLabel').create(haciendaData)
        //     this.mi_hacienda = newHacienda
        snackbarStore.showSnackbar('Hacienda created successfully', 'success')
        return newHacienda
      } catch (error) {
        handleError(error, 'Failed to create hacienda')
      } finally {
        snackbarStore.hideLoading()
      }
    }
  }
})

import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import placeholderHacienda from '@/assets/granja.png'

export const useHaciendaStore = defineStore('hacienda', {
  state: () => ({
    mi_hacienda: JSON.parse(localStorage.getItem('mi_hacienda')) || null // Cargar desde localStorage
  }),

  getters: {
    haciendaName: (state) => state.mi_hacienda?.name || '',
    avatarHaciendaUrl: (state) => {
      if (state.mi_hacienda?.avatar) {
        return pb.getFileUrl(state.mi_hacienda, state.mi_hacienda.avatar)
      }
      return placeholderHacienda
    }
  },

  actions: {
    async fetchHacienda(haciendaId) {
      try {
        this.mi_hacienda = await pb.collection('Haciendas').getOne(haciendaId)
        console.log('Cargando hacienda desde la API:', this.mi_hacienda)
        localStorage.setItem('mi_hacienda', JSON.stringify(this.mi_hacienda)) // Sincronizar con localStorage solo cuando sea necesario
        console.log('Hacienda guardada en localStorage:', this.mi_hacienda)
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
      snackbarStore.showLoading()

      try {
        await pb.collection('users').delete(userId)
        // Actualizar localStorage después de eliminar
        console.log('Actualizando localStorage después de eliminar usuario')
        const users =
          JSON.parse(localStorage.getItem(`hacienda_users_${this.mi_hacienda.id}`)) || []
        const updatedUsers = users.filter((user) => user.id !== userId)
        localStorage.setItem(`hacienda_users_${this.mi_hacienda.id}`, JSON.stringify(updatedUsers))
        snackbarStore.showSnackbar('User deleted successfully', 'success')
        console.log('Actualizando localStorage después de eliminar usuario')
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
        // Convertir el nombre a mayúsculas si está presente
        if (haciendaData.name) {
          haciendaData.name = haciendaData.name.toUpperCase()
        }

        const updatedHacienda = await pb
          .collection('Haciendas')
          .update(this.mi_hacienda.id, haciendaData)
        this.mi_hacienda = updatedHacienda
        console.log('Hacienda actualizada en localStorage:', this.mi_hacienda)
        localStorage.setItem('mi_hacienda', JSON.stringify(this.mi_hacienda)) // Sincronizar con localStorage
        snackbarStore.showSnackbar('Hacienda information updated successfully', 'success')
        console.log('Actualizando localStorage con nueva información de hacienda')
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
          name: haciendaName.toUpperCase(), // Convertir a mayúsculas
          location: '',
          info: '',
          plan: haciendaPlan
        }
        const newHacienda = await pb.collection('Haciendas').create(haciendaData)
        // Guardar nueva hacienda en localStorage
        localStorage.setItem('mi_hacienda', JSON.stringify(newHacienda))
        console.log('Nueva hacienda guardada en localStorage:', newHacienda)
        snackbarStore.showSnackbar('Hacienda created successfully', 'success')
        console.log('Guardando nueva hacienda en localStorage')
        return newHacienda
      } catch (error) {
        handleError(error, 'Failed to create hacienda')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateHaciendaAvatar(avatarFile) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const formData = new FormData()
        formData.append('avatar', avatarFile)

        this.mi_hacienda = await pb.collection('Haciendas').update(this.mi_hacienda.id, formData)

        snackbarStore.showSnackbar('Avatar de hacienda actualizado con éxito', 'success')
        localStorage.setItem('mi_hacienda', JSON.stringify(this.mi_hacienda)) // Actualizar localStorage
        console.log('Actualizando localStorage con nuevo avatar de hacienda')
      } catch (error) {
        handleError(error, 'Error al actualizar el avatar de la hacienda')
      } finally {
        snackbarStore.hideLoading()
      }
    }

    // ... otros métodos ...
  }
})

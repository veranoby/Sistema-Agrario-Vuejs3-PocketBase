import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'

export const useValidationStore = defineStore('validation', {
  actions: {
    async checkFieldTaken(field, value, collection = 'users') {
      const snackbarStore = useSnackbarStore()

      try {
        const result = await pb.collection(collection).getList(1, 1, {
          filter: `${field} = "${value}"`
        })

        if (result.totalItems > 0) {
          // Return true if the field is taken

          snackbarStore.showSnackbar(field + ' ya está en uso!', 'error')
          return false
        } else {
          //   snackbarStore.showSnackbar(field + '  está disponible!', 'success')
          return true
        }
      } catch (error) {
        handleError(error, `Error checking ${field}`)
        return true // Assume it's taken if there's an error
      }
    },

    async checkUsernameTaken(username) {
      return this.checkFieldTaken('username', username)
    },

    async checkEmailTaken(email) {
      return this.checkFieldTaken('email', email)
    },

    async checkHaciendaTaken(hacienda) {
      return this.checkFieldTaken('name', hacienda.toUpperCase(), 'HaciendaLabel')
    },

    handleRegistrationError(error) {
      let errorMessage

      if (error.data && error.data.data) {
        const errors = error.data.data
        if (errors.username) {
          errorMessage = 'Username error: ' + errors.username.message
        } else if (errors.email) {
          errorMessage = 'Email error: ' + errors.email.message
        } else if (errors.name && errors.name.code === 'validation_invalid_string') {
          errorMessage =
            'Esta hacienda ya está registrada. No se puede crear otro administrador para la misma hacienda.'
        } else {
          errorMessage = 'Registration error: ' + (error.message || 'Unknown error')
        }
      } else {
        errorMessage = 'Registration error: ' + (error.message || 'Unknown error')
      }

      handleError(new Error(errorMessage), 'Registration error')
    }
  }
})

import { defineStore } from 'pinia'

export const useSnackbarStore = defineStore('snackbar', {
  state: () => ({
    show: false,
    message: '',
    color: '',
    loading: false, // nuevo estado para mostrar un loading mientras se procesa algo
    closing: false // nuevo estado para mostrar un CERRAR mientras sale mensaje
  }),
  actions: {
    showSnackbar(message, color = 'success') {
      this.show = true
      this.message = message
      this.color = color
      this.loading = false
      this.closing = true
    },
    showError(message) {
      this.show = true
      this.message = message
      this.color = 'error'
      this.loading = false
      this.closing = true
    },
    showLoading() {
      this.show = true
      this.message = 'Procesando..'
      this.color = 'black'

      this.loading = true
      this.closing = false
    },
    hideLoading() {
      this.loading = false
      this.closing = false
    },
    hideSnackbar() {
      this.closing = true // Show "CERRAR" button
      setTimeout(() => {
        this.show = false // Hide snackbar after delay
        this.closing = false // Hide "CERRAR" button
      }, 2000) // Example delay (adjust as needed)
    }
  }
})

import { defineStore } from 'pinia'

export const useSnackbarStore = defineStore('snackbar', {
  state: () => ({
    show: false,
    message: '',
    color: ''
  }),
  actions: {
    showSnackbar(message, color = 'success') {
      this.show = true
      this.message = message
      this.color = color
    }
  }
})

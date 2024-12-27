import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    currentTheme: localStorage.getItem('theme') || 'light'
  }),
  actions: {
    toggleTheme() {
      this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', this.currentTheme)

      // Aplicar tema a Vuetify y CSS personalizado
      document.documentElement.setAttribute('data-theme', this.currentTheme)
      document.documentElement.classList.toggle('dark-mode', this.currentTheme === 'dark')
    },

    initTheme() {
      // Aplicar tema inicial
      document.documentElement.setAttribute('data-theme', this.currentTheme)
      document.documentElement.classList.toggle('dark-mode', this.currentTheme === 'dark')
    }
  }
})

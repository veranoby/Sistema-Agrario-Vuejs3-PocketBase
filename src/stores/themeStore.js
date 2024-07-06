import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    currentTheme: localStorage.getItem('theme') || 'lightTheme'
  }),
  actions: {
    toggleTheme() {
      this.currentTheme = this.currentTheme === 'lightTheme' ? 'darkTheme' : 'lightTheme'
      localStorage.setItem('theme', this.currentTheme)
    }
  }
})

import { defineStore } from 'pinia'

export const usePwaStore = defineStore('pwa', {
  state: () => ({
    deferredPrompt: null,
    installPromptVisible: false
  }),
  actions: {
    setDeferredPrompt(prompt) {
      this.deferredPrompt = prompt
    },
    showInstallPrompt() {
      if (this.deferredPrompt) {
        this.installPromptVisible = true
      }
    },
    async promptInstall() {
      if (!this.deferredPrompt) return
      
      this.deferredPrompt.prompt()
      const { outcome } = await this.deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      this.deferredPrompt = null
      this.installPromptVisible = false
    },
    clearPrompt() {
      this.deferredPrompt = null
      this.installPromptVisible = false
    }
  }
})

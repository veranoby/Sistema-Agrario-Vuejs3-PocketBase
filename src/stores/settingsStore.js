import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    system_config: null,
    loading: false
  }),

  getters: {
    config: (state) => state.system_config || {},
    bankAccountInfo: (state) => state.system_config?.bank_account_info || '',
    globalOpenRouterKey: (state) => state.system_config?.global_openrouter_key || '',
    resendApiKey: (state) => state.system_config?.resend_api_key || '',
    aiRateLimit: (state) => state.system_config?.ai_rate_limit || 5,
    aiRateWindow: (state) => state.system_config?.ai_rate_window || 3600000,
    maintenanceMode: (state) => state.system_config?.maintenance_mode || false,
    allowRegistration: (state) => state.system_config?.allow_registration ?? true
  },

  actions: {
    async fetchConfig() {
      this.loading = true
      try {
        // Obtenemos el singleton de system_config
        const records = await pb.collection('system_config').getFullList()
        if (records.length > 0) {
          this.system_config = records[0]
        } else {
          console.warn("No se encontró configuración en system_config. Creando registro por defecto...")
          try {
            const defaultRecord = await pb.collection('system_config').create({
              bank_account_info: 'Banco Pichincha, Cuenta de Ahorros #2208574932',
              global_openrouter_key: '',
              resend_api_key: '',
              ai_rate_limit: 5,
              ai_rate_window: 3600000,
              maintenance_mode: false,
              allow_registration: true
            })
            this.system_config = defaultRecord
          } catch (createErr) {
            console.error('No se pudo auto-crear la configuración de system_config:', createErr)
          }
        }
      } catch (error) {
        handleError(error, 'Error al obtener system_config')
      } finally {
        this.loading = false
      }
    },

    async updateConfig(newConfig) {
      this.loading = true
      try {
        if (this.system_config?.id) {
          const record = await pb.collection('system_config').update(this.system_config.id, newConfig)
          this.system_config = record
        } else {
          const record = await pb.collection('system_config').create(newConfig)
          this.system_config = record
        }
        return true
      } catch (error) {
        handleError(error, 'Error al actualizar system_config')
        return false
      } finally {
        this.loading = false
      }
    }
  }
})

import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useUiFeedbackStore } from './uiFeedbackStore'
import { useHaciendaStore } from './haciendaStore'
import { useSyncStore } from '@/stores/sync/index'

export const usePlanStore = defineStore('plan', {
  state: () => ({
    plans: [],
    availableModules: [],
    activeSubscriptions: [],
    loading: false,
    error: null
  }),

  persist: {
    key: 'plan',
    storage: localStorage,
    paths: ['plans']
  },

  getters: {
    currentPlan: (state) => {
      const haciendaStore = useHaciendaStore()
      return state.plans.find((plan) => plan.id === haciendaStore.mi_hacienda?.plan)
    },
    isModuleActive: (state) => (moduleId) => {
      return state.activeSubscriptions.some(s => s.modulo === moduleId || s.expand?.modulo?.id === moduleId)
    },
    activeModuleIds: (state) => {
      return state.activeSubscriptions.map(s => s.modulo || s.expand?.modulo?.id).filter(Boolean)
    }
  },

  actions: {
    async fetchModules() {
      this.loading = true
      try {
        const modules = await pb.collection('modulos').getFullList({
          sort: 'category, name'
        })
        // Ocultar 'asesor_plan' de la lista general para que la Hacienda no lo vea
        this.availableModules = modules.filter(m => m.code !== 'asesor_plan')
        return this.availableModules
      } catch (error) {
        handleError(error, 'Error al cargar módulos')
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchSubscriptions(haciendaId) {
      this.loading = true
      try {
        const filter = haciendaId
          ? `hacienda = "${haciendaId}" && is_active = true`
          : 'is_active = true'

        this.activeSubscriptions = await pb.collection('subscriptions').getFullList({
          filter,
          expand: 'modulo'
        })
        return this.activeSubscriptions
      } catch (error) {
        handleError(error, 'Error al cargar suscripciones')
        this.activeSubscriptions = []
        return []
      } finally {
        this.loading = false
      }
    },

    async toggleModule(moduleId, haciendaId, activate) {
      const uiFeedbackStore = useUiFeedbackStore()

      if (!haciendaId) {
        uiFeedbackStore.showSnackbar('No hay hacienda seleccionada', 'error')
        return false
      }

      this.loading = true
      try {
        const endpoint = activate ? 'activate' : 'deactivate'

        const response = await fetch(`/api/modulos/${moduleId}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pb.authStore.token}`
          },
          body: JSON.stringify({ haciendaId })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Error al ${activate ? 'activar' : 'desactivar'} módulo`)
        }

        // Refrescar suscripciones
        await this.fetchSubscriptions(haciendaId)

        uiFeedbackStore.showSnackbar(
          `Módulo ${activate ? 'activado' : 'desactivado'}`,
          'success'
        )
        return true
      } catch (error) {
        handleError(error, activate ? 'Error al activar módulo' : 'Error al desactivar módulo')
        return false
      } finally {
        this.loading = false
      }
    },

    async getGratisPlan() {
      const syncStore = useSyncStore()
      const cachedPlan = syncStore.loadFromLocalStorage('gratisPlan')

      if (cachedPlan) {
        return cachedPlan
      }

      try {
        const plans = await pb.collection('planes').getFullList({ sort: 'precio' })
        const gratisPlan = plans.find((plan) => plan.nombre === 'gratis')

        if (!gratisPlan) {
          throw new Error('Plan gratuito no encontrado')
        }

        syncStore.saveToLocalStorage('gratisPlan', gratisPlan)
        return gratisPlan
      } catch (error) {
        handleError(error, 'Error fetching gratis plan')
        return null
      }
    },

    async fetchAvailablePlans() {
      const syncStore = useSyncStore()
      this.loading = true

      // Cargar desde localStorage primero
      const cachedPlans = syncStore.loadFromLocalStorage('plans')
      if (cachedPlans?.length) {
        this.plans = cachedPlans
        this.loading = false
        return this.plans
      }

      // Si no hay conexión, retornar vacío
      if (!syncStore.isOnline) {
        this.plans = []
        this.loading = false
        return []
      }

      try {
        const plans = await pb.collection('planes').getFullList({ sort: 'precio' })
        this.plans = markRaw(plans)
        syncStore.saveToLocalStorage('plans', plans)

        // GUARDAR el plan gratis en localStorage
        const gratisPlan = plans.find((plan) => plan.nombre === 'gratis')
        if (gratisPlan) {
          syncStore.saveToLocalStorage('gratisPlan', gratisPlan)
        }

        return plans
      } catch (error) {
        handleError(error, 'Error fetching available plans')
        return []
      } finally {
        this.loading = false
      }
    },

    async changePlan(newPlanId) {
      const syncStore = useSyncStore()
      const uiFeedbackStore = useUiFeedbackStore()
      const haciendaStore = useHaciendaStore()

      // Verificar si está en modo offline
      if (!syncStore.isOnline) {
        uiFeedbackStore.showSnackbar('No se pueden realizar cambios de plan en modo offline', 'error')
        return
      }

      uiFeedbackStore.showLoading()

      try {
        const currentPlan = this.currentPlan
        const newPlan =
          this.plans.find((plan) => plan.id === newPlanId) ||
          (await pb.collection('planes').getOne(newPlanId))

        if (
          newPlan.nombre === 'gratis' ||
          (currentPlan && currentPlan.auditores > newPlan.auditores) ||
          (currentPlan && currentPlan.operadores > newPlan.operadores)
        ) {
          const confirmReset = await this.confirmUserReset()
          if (!confirmReset) {
            throw new Error('Plan change cancelled')
          }
          await this.resetHaciendaUsers()
        }

        const updatedHacienda = await pb
          .collection('Haciendas')
          .update(haciendaStore.mi_hacienda.id, { plan: newPlanId })

        // Actualizar estado local
        haciendaStore.mi_hacienda = updatedHacienda
        syncStore.saveToLocalStorage('mi_hacienda', updatedHacienda)

        // Forzar actualización de planes
        await this.fetchAvailablePlans()

        uiFeedbackStore.showSnackbar('Plan actualizado correctamente', 'success')
        return updatedHacienda
      } catch (error) {
        handleError(error, 'Error al cambiar el plan')
      } finally {
        uiFeedbackStore.hideLoading()
      }
    },

    async confirmUserReset() {
      return new Promise((resolve) => {
        if (
          confirm(
            'This will reset the auditores and operadores users. Are you sure you want to continue?'
          )
        ) {
          resolve(true)
        } else {
          resolve(false)
        }
      })
    },

    async resetHaciendaUsers() {
      const syncStore = useSyncStore()
      const haciendaStore = useHaciendaStore()
      const uiFeedbackStore = useUiFeedbackStore()

      // Verificar si está en modo offline
      if (!syncStore.isOnline) {
        uiFeedbackStore.showSnackbar('No se pueden resetear usuarios en modo offline', 'error')
        return
      }

      try {
        const users = await pb.collection('users').getFullList({
          filter: `hacienda = "${haciendaStore.mi_hacienda.id}" && role != "administrador"`
        })

        for (const user of users) {
          await pb.collection('users').delete(user.id)
        }
      } catch (error) {
        handleError(error, 'Error resetting hacienda users')
      }
    }
  }
})

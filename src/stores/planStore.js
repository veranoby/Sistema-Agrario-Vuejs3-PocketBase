import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useHaciendaStore } from './haciendaStore'
import { useSyncStore } from './syncStore'

export const usePlanStore = defineStore('plan', {
  state: () => ({
    plans: [],
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
    }
  },

  actions: {
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
        this.plans = plans
        syncStore.saveToLocalStorage('plans', plans)

        // Guardar el plan gratis en localStorage
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
      const snackbarStore = useSnackbarStore()
      const haciendaStore = useHaciendaStore()

      // Verificar si está en modo offline
      if (!syncStore.isOnline) {
        snackbarStore.showSnackbar('No se pueden realizar cambios de plan en modo offline', 'error')
        return
      }

      snackbarStore.showLoading()

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

        snackbarStore.showSnackbar('Plan actualizado correctamente', 'success')
        return updatedHacienda
      } catch (error) {
        handleError(error, 'Error al cambiar el plan')
      } finally {
        snackbarStore.hideLoading()
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
      const snackbarStore = useSnackbarStore()

      // Verificar si está en modo offline
      if (!syncStore.isOnline) {
        snackbarStore.showSnackbar('No se pueden resetear usuarios en modo offline', 'error')
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

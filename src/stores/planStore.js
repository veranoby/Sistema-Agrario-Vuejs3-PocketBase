import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useHaciendaStore } from './haciendaStore'

export const usePlanStore = defineStore('plan', {
  state: () => ({
    plans: null
  }),

  getters: {
    currentPlan: (state) => {
      const haciendaStore = useHaciendaStore()
      return state.plans
        ? state.plans.find((plan) => plan.id === haciendaStore.mi_hacienda?.plan)
        : null
    }
  },

  actions: {
    async getGratisPlan() {
      try {
        const gratisPlan = await pb.collection('planes').getFirstListItem('nombre = "gratis"')
        return gratisPlan
      } catch (error) {
        handleError(error, 'Error fetching gratis plan')
      }
    },

    async fetchAvailablePlans() {
      //listo
      try {
        const planssearch = await pb.collection('planes').getFullList({
          sort: 'precio'
        })
        this.plans = planssearch
        console.log('plans:', this.plans)
        return this.plans
      } catch (error) {
        handleError(error, 'Error fetching available plans')
      }
    },

    async changePlan(newPlanId) {
      const snackbarStore = useSnackbarStore()
      const haciendaStore = useHaciendaStore()
      snackbarStore.showLoading()

      try {
        const currentPlan = await this.currentPlan
        const newPlan = await pb.collection('planes').getOne(newPlanId)

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
          .collection('HaciendaLabel')
          .update(haciendaStore.mi_hacienda.id, {
            plan: newPlanId
          })

        haciendaStore.mi_hacienda = updatedHacienda
        snackbarStore.showSnackbar('Plan updated successfully', 'success')
        return updatedHacienda
      } catch (error) {
        handleError(error, 'Failed to change plan')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async confirmUserReset() {
      //listo
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
      const haciendaStore = useHaciendaStore()
      try {
        const users = await pb.collection('users').getFullList({
          filter: `hacienda = "${haciendaStore.mi_hacienda.id}" && role != "administrador"`
        })

        for (const user of users) {
          await pb.collection('users').delete(user.id)
        }
      } catch (error) {
        handleError(error, 'Error resetting hacienda users:')
      }
    }
  }
})

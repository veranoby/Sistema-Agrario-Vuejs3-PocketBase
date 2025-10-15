<template>
  <div class="flex flex-col border-1 m-5 px-6 pb-0 pt-4 bg-dinamico shadow-md hover:shadow-xl">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-l font-bold">{{ t('plan_management.current_plan') }}</h2>
      <v-chip :color="getPlanColor" variant="flat" size="small">
        {{ currentPlan.nombre.toUpperCase() }}
        <v-tooltip class="text-sm font-bold" activator="parent" location="bottom">
          {{ t('plan_management.plan_tooltip', { auditores: currentPlan.auditores, operadores: currentPlan.operadores }) }}
        </v-tooltip>
      </v-chip>

      <v-btn color="green-lighten-2" @click="openChangePlanModal" icon size="x-small">
        <v-icon>mdi-pencil</v-icon>
      </v-btn>
    </div>
  </div>

  <v-dialog
    v-model="changePlanModalOpen"
    max-width="800px"
    persistent
    transition="dialog-bottom-transition"
    scrollable
  >
    <v-card elevation="3" class="plan-dialog">
      <v-toolbar color="success" dark>
        <v-toolbar-title>{{ t('plan_management.select_your_plan') }}</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>

      <v-card-text class="plan-content">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="plan in availablePlans" :key="plan.id" @click="selectedPlan = plan.id">
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                class="plan-card p-6 rounded-lg shadow-md transition-all duration-300 cursor-pointer"
                :class="{
                  'plan-card-hover': isHovering,
                  'plan-card-selected': selectedPlan === plan.id
                }"
                v-bind="props"
                :elevation="isHovering ? 6 : 2"
              >
                <div class="text-center">
                  <h2 class="plan-name text-2xl font-bold mb-4">
                    {{ plan.nombre }}
                  </h2>
                  <p class="plan-price text-4xl font-bold mb-6 text-success">${{ plan.precio }}</p>
                  <ul class="plan-features space-y-3 mb-6">
                    <li class="flex items-center text-sm">
                      <v-icon color="success" class="mr-2">mdi-account-hard-hat-outline</v-icon>
                      {{ t('plan_management.auditors') }}: {{ plan.auditores }}
                    </li>
                    <li class="flex items-center text-sm">
                      <v-icon color="success" class="mr-2">mdi-account-cowboy-hat-outline</v-icon>
                      {{ t('plan_management.operators') }}: {{ plan.operadores }}
                    </li>
                  </ul>
                  <v-icon
                    v-if="selectedPlan === plan.id"
                    color="success"
                    size="large"
                    class="check-icon"
                  >
                    mdi-check-circle
                  </v-icon>
                </div>
              </v-card>
            </v-hover>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="plan-actions">
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-cancel"
          color="red-lighten-3"
          @click="changePlanModalOpen = false"
        >
          {{ t('plan_management.cancel') }}
        </v-btn>
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-check"
          color="green-lighten-3"
          @click="changePlan"
        >
          {{ t('plan_management.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlanStore } from '@/stores/planStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { storeToRefs } from 'pinia'

export default {
  name: 'PlanManagement',

  setup() {
    const { t } = useI18n()
    const planStore = usePlanStore()
    const haciendaStore = useHaciendaStore()
    const snackbarStore = useSnackbarStore()
    const { currentPlan } = storeToRefs(planStore)

    const changePlanModalOpen = ref(false)
    const selectedPlan = ref(null)
    const availablePlans = ref([])

    const getPlanColor = computed(() => {
      switch (currentPlan.value.nombre.toLowerCase()) {
        case 'gratis':
          return 'grey'
        case 'basico':
          return 'teal-lighten-3'
        case 'premium':
          return 'purple-lighten-3'
        default:
          return 'grey-lighten-3'
      }
    })

    const openChangePlanModal = async () => {
      try {
        availablePlans.value = await planStore.fetchAvailablePlans()
        selectedPlan.value = haciendaStore.mi_hacienda.plan
        changePlanModalOpen.value = true
      } catch (error) {
        snackbarStore.showSnackbar(t('plan_management.error_loading_plans'), 'error')
        console.error('Error al cargar los planes disponibles:', error)
      }
    }

    const changePlan = async () => {
      if (selectedPlan.value === haciendaStore.mi_hacienda.plan) {
        changePlanModalOpen.value = false
        return
      }

      try {
        await planStore.changePlan(selectedPlan.value)
        await haciendaStore.fetchHacienda(haciendaStore.mi_hacienda.id)
        changePlanModalOpen.value = false
      } catch (error) {
        snackbarStore.showSnackbar(t('plan_management.error_changing_plan'), 'error')
        console.error('Error al cambiar el plan:', error)
      }
    }

    return {
      t,
      currentPlan,
      getPlanColor,
      changePlanModalOpen,
      selectedPlan,
      availablePlans,
      openChangePlanModal,
      changePlan
    }
  }
}
</script>

<style scoped>
.plan-dialog {
  border-radius: 12px;
}

.plan-content {
  padding: 24px;
}

.plan-card {
  border: 2px solid #e0e0e0;
  transition: all 0.3s ease;
  position: relative;
}

.plan-card-hover {
  transform: translateY(-5px);
  border-color: #4caf50;
}

.plan-card-selected {
  border: 2px solid #4caf50;
  background-color: #f5faf5;
  box-shadow:
    0 4px 6px -1px rgba(76, 175, 80, 0.1),
    0 2px 4px -1px rgba(76, 175, 80, 0.06);
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: white;
  border-radius: 50%;
  padding: 4px;
}

.plan-name {
  color: #2c3e50;
}

.plan-price {
  color: #4caf50;
}

.plan-features {
  color: #546e7a;
}

.plan-actions {
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
}
</style>
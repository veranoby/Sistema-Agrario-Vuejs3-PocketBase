<template>
  <div class="flex flex-col border-1 px-4 py-4 bg-dinamico">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-l font-bold">Plan Actual</h2>
      <v-chip :color="getPlanColor" variant="tonal" size="small" class="ml-4">
        {{ currentPlan.nombre }}
        <v-tooltip class="text-sm font-bold" activator="parent" location="bottom">
          PLAN: Auditores {{ currentPlan.auditores }} / Operadores {{ currentPlan.operadores }}
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
    <v-card elevation="3">
      <v-card-title
        ><h1 class="text-2xl font-bold text-center mt-2">Seleccione su Plan</h1></v-card-title
      >
      <v-card-text>
        <v-radio-group class="" v-model="selectedPlan">
          <div class="grid grid-cols-3 gap-2">
            <div v-for="plan in availablePlans" :key="plan.id">
              <v-hover
                ><template v-slot:default="{ isHovering, props }">
                  <v-card
                    class="p-4 m-2 rounded-lg shadow-md overflow-hidden border-2 flex flex-col"
                    v-bind="props"
                    :color="isHovering ? 'green-lighten-2' : undefined"
                  >
                    <h2 class="text-xl text-align-center font-semibold mb-2">
                      {{ plan.nombre }}
                    </h2>
                    <p class="text-4xl text-align-center font-bold mb-6">${{ plan.precio }}</p>
                    <ul class="space-y-2">
                      <li class="flex items-center text-sm">
                        <v-icon color="green-lighten-2" aria-hidden="false"> mdi-account </v-icon>
                        Auditores: {{ plan.auditores }}
                      </li>
                      <li class="flex items-center text-sm">
                        <v-icon aria-hidden="false" color="green-lighten-2"> mdi-account </v-icon>
                        Operadores: {{ plan.operadores }}
                      </li>
                    </ul>
                    <br />
                    <v-radio
                      class="compact-form text-xs font-bold"
                      :key="plan.id"
                      :label="`Seleccionar`"
                      :value="plan.id"
                    ></v-radio>
                  </v-card>
                </template>
              </v-hover>
            </div>
          </div>
        </v-radio-group>
      </v-card-text>

      <v-card-actions>
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-cancel"
          color="red-lighten-3"
          @click="changePlanModalOpen = false"
          >Cancelar</v-btn
        >
        <v-btn
          size="small"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-check"
          color="green-lighten-3"
          @click="changePlan"
          >Confirmar</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed } from 'vue'
import { usePlanStore } from '@/stores/planStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { storeToRefs } from 'pinia'

export default {
  name: 'PlanManagement',

  setup() {
    const planStore = usePlanStore()
    const haciendaStore = useHaciendaStore()
    const { currentPlan } = storeToRefs(planStore)

    const changePlanModalOpen = ref(false)
    const selectedPlan = ref(null)
    const availablePlans = ref([])

    const getPlanColor = computed(() => {
      switch (currentPlan.value.nombre.toLowerCase()) {
        case 'gratis':
          return 'grey-lighten-2'
        case 'basico':
          return 'blue-lighten-2'
        case 'premium':
          return 'purple-lighten-2'
        default:
          return 'grey-lighten-2'
      }
    })

    const openChangePlanModal = async () => {
      try {
        availablePlans.value = await planStore.fetchAvailablePlans()
        selectedPlan.value = haciendaStore.mi_hacienda.plan
        changePlanModalOpen.value = true
      } catch (error) {
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
        console.error('Error al cambiar el plan:', error)
      }
    }

    return {
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

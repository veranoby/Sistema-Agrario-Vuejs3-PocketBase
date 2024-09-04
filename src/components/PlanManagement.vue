<template>
  <div class="rounded-lg border-2 px-4 py-4">
    <div class="flex items-center space-x-2 mb-4">
      <h2 class="text-l font-bold">Plan Actual</h2>
      <v-chip :color="getPlanColor" variant="tonal" size="small">
        {{ currentPlan.nombre }}

        <v-tooltip class="text-sm font-bold" activator="parent" location="bottom"
          >PLAN: Auditores {{ currentPlan.auditores }} / Operadores
          {{ currentPlan.operadores }}</v-tooltip
        >
      </v-chip>
      <v-btn
        size="x-small"
        variant="flat"
        rounded="smlg"
        prepend-icon="mdi-check"
        color="green-lighten-3"
        @click="openChangePlanModal"
      >
        Cambiar Plan
      </v-btn>
    </div>

    <v-dialog v-model="changePlanModalOpen" max-width="600px">
      <v-card>
        <v-card-title
          ><h1 class="text-2xl font-bold text-center mt-2">Seleccione su Plan</h1></v-card-title
        >
        <!--       <v-card-text>
          <v-radio-group class="compact-form" v-model="selectedPlan">
            <v-radio
              v-for="plan in availablePlans"
              :key="plan.id"
              :label="`${plan.nombre} - $${plan.precio}/mes`"
              :value="plan.id"
            ></v-radio>
          </v-radio-group>
        </v-card-text>
-->
        <v-card-text>
          <v-radio-group class="compact-form" v-model="selectedPlan">
            <div class="grid grid-cols-3 gap-2">
              <div v-for="plan in availablePlans" :key="plan.id">
                <v-hover
                  ><template v-slot:default="{ isHovering, props }">
                    <v-card
                      class="p-4 m-2 bg-white rounded-lg shadow-md overflow-hidden border-2 flex flex-col"
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
                        class="text-xs font-bold"
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
  </div>
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

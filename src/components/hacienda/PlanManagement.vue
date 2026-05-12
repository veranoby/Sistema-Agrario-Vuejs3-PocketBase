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

      <v-btn color="green-lighten-2" @click="openChangePlanModal" icon size="small">
        <v-icon>mdi-pencil</v-icon>
      </v-btn>
    </div>
    <div v-if="pendingRequest" class="mt-2 mb-4">
        <v-alert type="info" variant="tonal" density="compact" border="start">
          Tienes una solicitud pendiente de revisión para el plan "{{ pendingRequest.expand?.plan_solicitado?.nombre }}".
        </v-alert>
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
        <v-btn icon @click="changePlanModalOpen = false"><v-icon>mdi-close</v-icon></v-btn>
      </v-toolbar>

      <v-card-text class="plan-content">
        <div v-if="pendingRequest" class="text-center py-6">
            <v-icon color="warning" size="64" class="mb-4">mdi-clock-outline</v-icon>
            <h3 class="text-h6">Solicitud en Proceso</h3>
            <p class="text-body-1 mt-2">
                Ya tienes una solicitud de mejora de plan en estado pendiente.
                Por favor, espera a que un administrador la revise antes de enviar una nueva.
            </p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div v-for="plan in availablePlans" :key="plan.id" @click="selectedPlan = plan.id">
            <v-hover v-slot="{ isHovering, props }">
              <v-card
                v-bind="props"
                class="plan-card p-6 shadow-md transition-all duration-300 cursor-pointer"
                :class="{
                  'plan-card-hover': isHovering,
                  'plan-card-selected': selectedPlan === plan.id
                }"
              >
                <div v-if="selectedPlan === plan.id" class="check-icon">
                  <v-icon color="success">mdi-check-circle</v-icon>
                </div>
                <h3 class="text-xl font-bold mb-2 plan-name">{{ plan.nombre.toUpperCase() }}</h3>
                <p class="text-2xl font-bold mb-4 plan-price">
                  ${{ plan.precio }}<span class="text-sm font-normal text-gray-500">/mes</span>
                </p>
                <ul class="text-sm space-y-2 plan-features">
                  <li class="flex items-center">
                    <v-icon color="success" size="small" class="mr-2">mdi-check</v-icon>
                    {{ plan.auditores }} Auditores
                  </li>
                  <li class="flex items-center">
                    <v-icon color="success" size="small" class="mr-2">mdi-check</v-icon>
                    {{ plan.operadores }} Operadores
                  </li>
                </ul>
              </v-card>
            </v-hover>
          </div>
        </div>
      </v-card-text>

      <!-- Paso 2: Instrucciones de Pago y Comprobante -->
      <v-card-text v-if="!pendingRequest && selectedPlan && selectedPlan !== haciendaStore.mi_hacienda.plan" class="border-t pt-4 bg-grey-lighten-4">
          <h3 class="text-h6 mb-3">Instrucciones de Pago</h3>
          <div class="bg-white p-4 rounded-lg border text-body-2 whitespace-pre-wrap mb-4" v-html="bankInstructions"></div>

          <h3 class="text-h6 mb-3">Adjuntar Comprobante</h3>
          <v-file-input
            v-model="paymentReceipt"
            label="Selecciona tu comprobante (PDF, JPG, PNG)"
            accept="image/jpeg, image/png, application/pdf"
            variant="outlined"
            density="comfortable"
            prepend-icon="mdi-receipt"
            :error-messages="receiptError"
            show-size
          ></v-file-input>
      </v-card-text>

      <v-card-actions class="plan-actions justify-end" v-if="!pendingRequest">
        <v-btn color="grey-darken-1" variant="text" @click="changePlanModalOpen = false">
          {{ t('general.cancel') }}
        </v-btn>
        <v-btn
          color="success"
          variant="elevated"
          @click="changePlan"
          :disabled="!selectedPlan || (!haciendaStore.isPlanExpired && selectedPlan === haciendaStore.mi_hacienda.plan) || !paymentReceipt"
          :loading="isSubmitting"
        >
          Enviar Solicitud
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlanStore } from '@/stores/planStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'
import { pb } from '@/utils/pocketbase'

const { t } = useI18n()
const planStore = usePlanStore()
const haciendaStore = useHaciendaStore()
const uiFeedbackStore = useUiFeedbackStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { currentPlan } = storeToRefs(planStore)

const changePlanModalOpen = ref(false)
const selectedPlan = ref(null)
const availablePlans = ref([])
const pendingRequest = ref(null)
const paymentReceipt = ref(null)
const receiptError = ref('')
const isSubmitting = ref(false)

const getPlanColor = computed(() => {
  if(!currentPlan.value) return 'grey'
  switch (currentPlan.value.nombre.toLowerCase()) {
    case 'gratis': return 'grey'
    case 'basico': return 'teal-lighten-3'
    case 'premium': return 'purple-lighten-3'
    default: return 'grey-lighten-3'
  }
})

const bankInstructions = computed(() => settingsStore.bankAccountInfo || 'No hay instrucciones bancarias configuradas.')

onMounted(async () => {
    await checkPendingRequests()
    await settingsStore.fetchConfig()
})

const checkPendingRequests = async () => {
    if (!haciendaStore.mi_hacienda?.id) return
    try {
        const result = await pb.collection('solicitudes_suscripcion').getList(1, 1, {
            filter: `hacienda = "${haciendaStore.mi_hacienda.id}" && estado = "pendiente"`,
            expand: 'plan_solicitado'
        })
        if (result.items.length > 0) {
            pendingRequest.value = result.items[0]
        } else {
            pendingRequest.value = null
        }
    } catch (e) {
        console.error('Error fetching pending requests', e)
    }
}

const openChangePlanModal = async () => {
  try {
    await checkPendingRequests()
    availablePlans.value = await planStore.fetchAvailablePlans()
    selectedPlan.value = haciendaStore.mi_hacienda.plan
    paymentReceipt.value = null
    changePlanModalOpen.value = true
  } catch (error) {
    uiFeedbackStore.showSnackbar(t('plan_management.error_loading_plans'), 'error')
    console.error('Error al cargar los planes disponibles:', error)
  }
}

const changePlan = async () => {
  if (!selectedPlan.value) return;
  if (!haciendaStore.isPlanExpired && selectedPlan.value === haciendaStore.mi_hacienda.plan) return;

  if (!paymentReceipt.value) {
      receiptError.value = "Debes adjuntar un comprobante de pago."
      return
  }

  // Validar tamaño archivo max 5MB
  if (paymentReceipt.value.size > 5 * 1024 * 1024) {
      receiptError.value = "El comprobante no puede exceder los 5MB."
      return
  }

  isSubmitting.value = true
  receiptError.value = ""

  try {
      const formData = new FormData()
      formData.append('hacienda', haciendaStore.mi_hacienda.id)
      formData.append('solicitante', authStore.user.id)
      formData.append('tipo', 'plan_upgrade')
      formData.append('plan_solicitado', selectedPlan.value)
      formData.append('estado', 'pendiente')
      formData.append('comprobante', paymentReceipt.value)

      await pb.collection('solicitudes_suscripcion').create(formData)

      uiFeedbackStore.showSnackbar("Solicitud enviada con éxito. Será revisada pronto.", "success")
      changePlanModalOpen.value = false
      await checkPendingRequests() // Refrescar estado local

  } catch (error) {
      uiFeedbackStore.showSnackbar("Error al enviar la solicitud", "error")
      console.error(error)
  } finally {
      isSubmitting.value = false
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
}
</style>

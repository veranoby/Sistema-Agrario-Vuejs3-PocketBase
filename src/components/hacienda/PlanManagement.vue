<template>
  <div class="flex flex-col border-1 m-5 px-6 pb-0 pt-4 bg-dinamico shadow-md hover:shadow-xl rounded-lg border">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-l font-bold">{{ t('plan_management.current_plan') }}</h3>
        <div class="text-xs text-grey">Gestiona tu suscripción y módulos</div>
      </div>
      <div class="flex items-center gap-2">
        <v-chip :color="getPlanColor" variant="flat" size="small">
          {{ currentPlanName.toUpperCase() }}
          <v-tooltip class="text-sm font-bold" activator="parent" location="bottom">
            {{ currentPlanLimits }}
          </v-tooltip>
        </v-chip>

        <v-btn color="info" @click="openHistoryModal" icon size="small" variant="tonal" class="mr-2">
          <v-icon>mdi-history</v-icon>
        </v-btn>
        <v-btn color="primary" @click="openChangePlanModal" icon size="small" variant="tonal">
          <v-icon>mdi-cog</v-icon>
        </v-btn>
      </div>
    </div>
    
    <!-- Alerta de expiración -->
    <v-alert
      v-if="daysUntilExpiration !== null"
      :type="needsSubscriptionWarning ? 'warning' : (daysUntilExpiration <= 0 ? 'error' : 'info')"
      variant="tonal"
      density="compact"
      class="mb-4"
      border="start"
    >
      <template v-slot:prepend>
        <v-icon>{{ daysUntilExpiration <= 0 ? 'mdi-alert-circle' : 'mdi-clock-outline' }}</v-icon>
      </template>
      {{ daysUntilExpiration <= 0 ? 'Suscripción expirada' : `Quedan ${daysUntilExpiration} días de suscripción` }}
    </v-alert>

    <div v-if="pendingRequest" class="mt-2 mb-4">
        <v-alert type="info" variant="tonal" density="compact" border="start">
          Tienes una solicitud pendiente de revisión para el plan "{{ pendingRequest.expand?.plan_solicitado?.nombre }}".
        </v-alert>
    </div>

    <v-divider class="my-3"></v-divider>

    <!-- Módulos Activos -->
    <div class="mb-4">
      <h3 class="text-sm font-bold text-grey-darken-1 mb-2 uppercase tracking-wide">Módulos Activos</h3>
      <!-- Skeleton mientras cargan los módulos -->
      <div v-if="!modulesReady" class="flex flex-wrap gap-2">
        <v-skeleton-loader type="chip" v-for="n in 3" :key="n" width="100" />
      </div>
      <!-- Módulos con nombres resueltos -->
      <div v-else-if="mi_hacienda?.active_modules?.length > 0" class="flex flex-wrap gap-2">
        <v-chip
          v-for="moduleId in mi_hacienda.active_modules"
          :key="moduleId"
          color="primary"
          variant="outlined"
          size="small"
        >
          <v-icon start size="small">mdi-puzzle-check</v-icon>
          {{ getModuleName(moduleId) }}
        </v-chip>
      </div>
      <!-- Sin módulos -->
      <div v-else class="text-xs text-grey-darken-1 italic">
        Sin módulos adicionales activos
      </div>
    </div>
  </div>

  <!-- Modal Historial de Solicitudes -->
  <v-dialog v-model="historyModalOpen" max-width="800px" scrollable>
    <v-card>
      <v-toolbar color="info" dark>
        <v-toolbar-title>Historial de Solicitudes</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="historyModalOpen = false"><v-icon>mdi-close</v-icon></v-btn>
      </v-toolbar>
      <v-card-text class="pa-0">
        <v-data-table
          :headers="historyHeaders"
          :items="solicitudesHistory"
          :loading="loadingHistory"
          class="elevation-0"
        >
          <template v-slot:item.fecha_solicitud="{ item }">
            {{ new Date(item.created).toLocaleDateString('es-EC', {day:'2-digit', month:'2-digit', year:'numeric'}) }}
          </template>
          <template v-slot:item.tipo="{ item }">
             <v-chip size="x-small" :color="item.tipo === 'plan_upgrade' ? 'primary' : 'secondary'">
                {{ item.tipo === 'plan_upgrade' ? 'Mejora Plan' : 'Módulo Extra' }}
              </v-chip>
          </template>
          <template v-slot:item.detalle="{ item }">
             <div v-if="item.tipo === 'plan_upgrade'" class="text-xs">
              <strong>Plan:</strong> {{ item.expand?.plan_solicitado?.nombre || '?' }}
            </div>
            <div v-if="item.modulo_solicitado && item.modulo_solicitado !== '[]'" class="text-xs">
              <strong>Módulos:</strong> {{ parseModules(item.modulo_solicitado) }}
            </div>
          </template>
          <template v-slot:item.estado="{ item }">
            <v-chip size="small" :color="item.estado === 'aprobada' ? 'success' : item.estado === 'rechazada' ? 'error' : 'warning'">
              {{ item.estado.toUpperCase() }}
            </v-chip>
          </template>
          <template v-slot:item.monto_notas="{ item }">
            <span class="text-xs text-grey-darken-2">{{ item.notas_admin || 'N/A' }}</span>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" variant="text" @click="historyModalOpen = false">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="changePlanModalOpen"
    max-width="1000px"
    persistent
    transition="dialog-bottom-transition"
    scrollable
  >
    <v-card elevation="3" class="plan-dialog">
      <v-toolbar color="primary" dark>
        <v-btn icon @click="goBack" v-if="currentStep > 1">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <v-toolbar-title>{{ modalTitle }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="changePlanModalOpen = false"><v-icon>mdi-close</v-icon></v-btn>
      </v-toolbar>

      <v-card-text class="pa-0 bg-grey-lighten-5">
        <!-- Stepper Indicator -->
        <div class="bg-white border-b px-6 py-4">
          <v-timeline direction="horizontal" density="compact" align="start" truncate-line="both">
            <v-timeline-item
              v-for="(stepName, index) in ['PLAN BASE', 'MÓDULOS', 'CHECKOUT']"
              :key="index"
              :dot-color="currentStep >= index + 1 ? 'success' : 'grey-lighten-2'"
              :icon="currentStep > index + 1 ? 'mdi-check' : undefined"
              size="small"
              fill-dot
            >
              <div :class="['text-xs font-weight-bold mt-1 text-center', currentStep >= index + 1 ? 'text-primary' : 'text-grey']">
                {{ stepName }}
              </div>
            </v-timeline-item>
          </v-timeline>
        </div>

        <v-window v-model="currentStep" class="pa-6" style="min-height: 400px;">
          <!-- STEP 1: PLAN BASE -->
          <v-window-item :value="1">
            <div v-if="pendingRequest" class="text-center py-6">
                <v-icon color="warning" size="64" class="mb-4">mdi-clock-outline</v-icon>
                <h3 class="text-h6">Solicitud en Proceso</h3>
                <p class="  mt-2">
                    Ya tienes una solicitud de mejora de plan en estado pendiente.
                    Por favor, espera la revisión administrativa.
                </p>
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div v-for="plan in availablePlans" :key="plan.id" @click="selectedPlan = plan.id">
                <v-hover v-slot="{ isHovering, props: hoverProps }">
                  <v-card
                    v-bind="hoverProps"
                    class="plan-card p-6 shadow-md transition-all duration-300 cursor-pointer h-full border-2"
                    :class="{
                      'plan-card-hover border-success': isHovering,
                      'plan-card-selected border-success bg-primary-5': selectedPlan === plan.id,
                      'border-transparent': !isHovering && selectedPlan !== plan.id
                    }"
                  >
                    <div v-if="selectedPlan === plan.id" class="check-icon">
                      <v-icon color="primary">mdi-check-circle</v-icon>
                    </div>
                    <h3 class="text-xl font-bold mb-2 plan-name">{{ plan.nombre.toUpperCase() }}</h3>
                    <p class="text-2xl font-bold mb-4 plan-price">
                      ${{ plan.precio }}<span class="text-sm font-normal text-gray-500">/mes</span>
                    </p>
                    <ul class="text-sm space-y-2 plan-features">
                      <li class="flex items-center">
                        <v-icon color="primary" size="small" class="mr-2">mdi-account-check</v-icon>
                        {{ plan.auditores }} Auditores
                      </li>
                      <li class="flex items-center">
                        <v-icon color="primary" size="small" class="mr-2">mdi-account-hard-hat</v-icon>
                        {{ plan.operadores }} Operadores
                      </li>
                    </ul>
                  </v-card>
                </v-hover>
              </div>
            </div>
          </v-window-item>

          <!-- STEP 2: MODULOS -->
          <v-window-item :value="2">
            <div class="mb-4">
              <h3 class="text-h6 mb-1">Personaliza tu experiencia</h3>
              <p class="text-smtext-grey">Selecciona los módulos adicionales que deseas activar según tus necesidades operativas.</p>
            </div>
            
            <v-row>
              <v-col v-for="modulo in allModules" :key="modulo.id" cols="12" md="6">
                <ModuleCard 
                  :modulo="modulo" 
                  :is-active="selectedModuleIds.includes(modulo.id)"
                  @toggle="toggleModuleSelection"
                />
              </v-col>
            </v-row>

            <v-alert v-if="allModules.length === 0" type="info" class="mt-4">
              No hay módulos adicionales disponibles en este momento.
            </v-alert>
          </v-window-item>

          <!-- STEP 3: CHECKOUT -->
          <v-window-item :value="3">
            <v-row>
              <v-col cols="12" md="6">
                <h3 class="text-h6 mb-4">Resumen de Suscripción</h3>
                <v-card variant="flat" class="mb-4 pa-4 border rounded-lg bg-white">
                  <div class="d-flex justify-space-between mb-2">
                    <span class="font-weight-medium">Plan Base ({{ selectedPlanData?.nombre || '?' }})</span>
                    <span class="font-weight-bold">${{ selectedPlanData?.precio || 0 }}.00/mes</span>
                  </div>
                  
                  <div v-if="selectedModulesData.length > 0" class="mb-2 mt-4">
                    <div class="text-xs text-grey mb-2 uppercase font-weight-bold">Módulos Adicionales:</div>
                    <div v-for="m in selectedModulesData" :key="m.id" class="d-flex justify-space-between pl-2 mb-2 text-smbg-grey-lighten-5 pa-2 rounded border border-dashed">
                      <span>• {{ m.name }}</span>
                      <span class="font-weight-bold">${{ m.price_monthly }}.00</span>
                    </div>
                  </div>

                  <v-divider class="my-4" />

                  <div class="mb-4">
                    <div class="text-xs text-grey mb-2">CICLO DE FACTURACIÓN</div>
                    <v-btn-toggle v-model="billingCycle" mandatory color="primary" density="compact" rounded="pill" class="w-full">
                      <v-btn value="monthly" class="flex-grow-1">Mensual</v-btn>
                      <v-btn value="yearly" class="flex-grow-1">Anual (-17%)</v-btn>
                    </v-btn-toggle>
                  </div>

                  <div class="d-flex justify-space-between align-end mt-6">
                    <div class="text-xs text-grey">TOTAL ESTIMADO</div>
                    <div class="text-right">
                      <div class="text-h4 font-weight-bold text-primary">${{ totalAmount.toFixed(2) }}</div>
                      <div class="text-xs text-grey">{{ billingCycle === 'monthly' ? 'por mes' : 'total anual' }}</div>
                    </div>
                  </div>
                </v-card>

                <v-alert v-if="billingCycle === 'yearly'" type="success" variant="tonal" density="compact" class="rounded-lg">
                  <v-icon start>mdi-piggy-bank</v-icon>
                  Estás ahorrando <strong>${{ annualSavings.toFixed(2) }}</strong> al año con el pago anual.
                </v-alert>
              </v-col>

              <v-col cols="12" md="6">
                <h3 class="text-h6 mb-4">Finalizar Pago</h3>
                <div class="bg-white pa-4 rounded-lg mb-4 border border-dashed">
                  <div class="text-md font-weight-bold mb-2 flex items-center">
                    <v-icon start color="primary" size="small">mdi-bank</v-icon>
                    Instrucciones Bancarias
                  </div>
                  <div class="text-smwhitespace-pre-wrap text-grey-darken-2" v-html="bankInstructions"></div>
                </div>

                <v-file-input
                  v-model="paymentReceipt"
                  label="Adjuntar comprobante de transferencia"
                  accept="image/jpeg, image/png, application/pdf"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-receipt"
                  prepend-icon=""
                  :error-messages="receiptError"
                  show-size
                  hint="PDF, JPG o PNG (Max 5MB)"
                  persistent-hint
                  class="bg-white rounded-lg"
                ></v-file-input>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-6 bg-white">
        <v-btn color="grey-darken-1" variant="text" @click="changePlanModalOpen = false" rounded="pill">
          Cancelar
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="currentStep < 3"
          color="primary"
          variant="flat"
          @click="nextStep"
          :disabled="pendingRequest || (currentStep === 1 && !selectedPlan)"
          rounded="pill"
          append-icon="mdi-chevron-right"
          min-width="120"
        >
          Siguiente
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="elevated"
          @click="submitUnifiedRequest"
          :disabled="!paymentReceipt"
          :loading="isSubmitting"
          rounded="pill"
          append-icon="mdi-send"
          min-width="150"
        >
          Enviar Solicitud
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { usePlanStore } from '@/stores/planStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { storeToRefs } from 'pinia'
import { pb } from '@/utils/pocketbase'
import ModuleCard from '@/components/cliente/ModuleCard.vue'
import { ModuleCalculator } from '@/utils/moduleCalculator'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const planStore = usePlanStore()
const haciendaStore = useHaciendaStore()
const uiFeedbackStore = useUiFeedbackStore()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const { currentPlan } = storeToRefs(planStore)
const { daysUntilExpiration, needsSubscriptionWarning, mi_hacienda } = storeToRefs(haciendaStore)

// Flag para saber si los módulos están listos para mostrar nombres
const modulesReady = ref(false)

// Modal State
const changePlanModalOpen = ref(false)
const historyModalOpen = ref(false)
const currentStep = ref(1)
const billingCycle = ref('monthly')

// Selection State
const selectedPlan = ref(null)
const selectedModuleIds = ref([])
const availablePlans = ref([])
const allModules = ref([])

// Form State
const pendingRequest = ref(null)
const paymentReceipt = ref(null)
const receiptError = ref('')
const isSubmitting = ref(false)

// History State
const solicitudesHistory = ref([])
const loadingHistory = ref(false)
const historyHeaders = [
  { title: 'Fecha', key: 'fecha_solicitud' },
  { title: 'Tipo', key: 'tipo' },
  { title: 'Detalle', key: 'detalle' },
  { title: 'Estado', key: 'estado' },
  { title: 'Notas', key: 'monto_notas' }
]

const getModuleName = (id) => {
  const mod = allModules.value.find(m => m.id === id)
  return mod ? (mod.name || mod.nombre) : id
}

const parseModulesArray = (jsonString) => {
  if (!jsonString) return []
  try {
    let ids = []
    if (jsonString.startsWith('[')) {
      ids = JSON.parse(jsonString)
    } else {
      ids = [jsonString]
    }
    return ids.map(id => getModuleName(id))
  } catch (e) {
    return [jsonString]
  }
}

const parseModules = (jsonString) => {
  const names = parseModulesArray(jsonString)
  return names.join(', ')
}

const modalTitle = computed(() => {
  switch (currentStep.value) {
    case 1: return 'Selecciona tu Plan Base'
    case 2: return 'Personaliza con Módulos'
    case 3: return 'Resumen y Pago'
    default: return 'Suscripción'
  }
})

const currentPlanName = computed(() => currentPlan.value?.nombre || mi_hacienda.value?.expand?.plan?.nombre || 'Gratis')
const currentPlanLimits = computed(() => {
  const plan = currentPlan.value || mi_hacienda.value?.expand?.plan
  if (!plan) return 'Límites básicos'
  return t('plan_management.plan_tooltip', { auditores: plan.auditores, operadores: plan.operadores })
})

const getPlanColor = computed(() => {
  const name = currentPlanName.value.toLowerCase()
  if (name.includes('gratis')) return 'grey'
  if (name.includes('basico')) return 'teal-lighten-3'
  if (name.includes('premium')) return 'purple-lighten-3'
  if (name.includes('enterprise')) return 'blue-darken-2'
  return 'grey-lighten-3'
})

const bankInstructions = computed(() => settingsStore.bankAccountInfo || 'No hay instrucciones bancarias configuradas.')

const selectedPlanData = computed(() => availablePlans.value.find(p => p.id === selectedPlan.value))
const selectedModulesData = computed(() => allModules.value.filter(m => selectedModuleIds.value.includes(m.id)))

const totalAmount = computed(() => {
  const planPrice = selectedPlanData.value?.precio || 0
  const modulesPrice = ModuleCalculator.calculateModulePrice(selectedModulesData.value, billingCycle.value)
  
  if (billingCycle.value === 'yearly') {
    return (planPrice * 12) + modulesPrice
  }
  return planPrice + modulesPrice
})

const annualSavings = computed(() => {
  const planMonthly = selectedPlanData.value?.precio || 0
  const modulesMonthly = ModuleCalculator.calculateModulePrice(selectedModulesData.value, 'monthly')
  const totalMonthly = (planMonthly + modulesMonthly) * 12
  
  const planYearly = planMonthly * 12
  const modulesYearly = ModuleCalculator.calculateModulePrice(selectedModulesData.value, 'yearly')
  const totalYearly = planYearly + modulesYearly
  
  return totalMonthly - totalYearly
})

const cleanOpenPlansQuery = async () => {
  if (route.query.openPlans) {
    try {
      const query = { ...route.query }
      delete query.openPlans
      await router.replace({ query })
    } catch (e) {
      console.error('[PLAN_MANAGEMENT] Error cleaning query:', e)
    }
  }
}

onMounted(async () => {
    // Cargar módulos disponibles para poder resolver nombres
    allModules.value = await planStore.fetchModules()
    modulesReady.value = true

    // CRÍTICO: Forzar refresh desde servidor para reflejar cambios post-aprobación
    // sin esto, active_modules sigue mostrando el caché desactualizado
    const haciendaId = authStore.user?.hacienda
    if (haciendaId) {
      try {
        await haciendaStore.fetchHacienda(haciendaId, true)
      } catch (e) {
        console.warn('[PlanManagement] No se pudo refrescar hacienda:', e)
      }
    }

    await checkPendingRequests()
    await settingsStore.fetchConfig()
    
    if (route.query.openPlans === 'true') {
      await openChangePlanModal()
    }
})

watch(() => route.query.openPlans, async (newVal) => {
  if (newVal === 'true' && !changePlanModalOpen.value) {
    await openChangePlanModal()
  }
})

watch(changePlanModalOpen, async (newVal) => {
  if (!newVal) {
    await cleanOpenPlansQuery()
  }
})

const checkPendingRequests = async () => {
    if (!mi_hacienda.value?.id) return
    try {
        const result = await pb.collection('solicitudes_suscripcion').getList(1, 1, {
            filter: `hacienda = "${mi_hacienda.value.id}" && estado = "pendiente"`,
            expand: 'plan_solicitado'
        })
        pendingRequest.value = result.items[0] || null
    } catch (e) {
        console.error('Error fetching pending requests', e)
    }
}

const openHistoryModal = async () => {
  historyModalOpen.value = true
  loadingHistory.value = true
  try {
    const res = await pb.collection('solicitudes_suscripcion').getFullList({
      filter: `hacienda = "${mi_hacienda.value?.id}"`,
      expand: 'plan_solicitado',
      sort: '-fecha_solicitud'
    })
    solicitudesHistory.value = res
  } catch (error) {
    uiFeedbackStore.showSnackbar('Error cargando el historial', 'error')
    console.error(error)
  } finally {
    loadingHistory.value = false
  }
}

const openChangePlanModal = async () => {
  try {
    uiFeedbackStore.showLoading()
    await checkPendingRequests()
    availablePlans.value = await planStore.fetchAvailablePlans()
    // allModules is loaded on mounted
    
    // Initial selection from current state
    selectedPlan.value = mi_hacienda.value.plan
    selectedModuleIds.value = Array.isArray(mi_hacienda.value.active_modules) ? [...mi_hacienda.value.active_modules] : []
    
    paymentReceipt.value = null
    currentStep.value = 1
    changePlanModalOpen.value = true
    
    // Limpiar query param de forma segura al abrir
    await cleanOpenPlansQuery()
  } catch (error) {
    uiFeedbackStore.showSnackbar(t('plan_management.error_loading_plans'), 'error')
  } finally {
    uiFeedbackStore.hideLoading()
  }
}

const nextStep = () => {
  if (currentStep.value < 3) currentStep.value++
}

const goBack = () => {
  if (currentStep.value > 1) currentStep.value--
}

const toggleModuleSelection = (moduleId, active) => {
  if (active) {
    if (!selectedModuleIds.value.includes(moduleId)) {
      selectedModuleIds.value.push(moduleId)
    }
  } else {
    selectedModuleIds.value = selectedModuleIds.value.filter(id => id !== moduleId)
  }
}

const submitUnifiedRequest = async () => {
  if (!selectedPlan.value) return
  
  if (!paymentReceipt.value) {
      receiptError.value = "Debes adjuntar un comprobante de pago."
      return
  }

  isSubmitting.value = true
  receiptError.value = ""

  try {
      const receiptFile = Array.isArray(paymentReceipt.value) ? paymentReceipt.value[0] : paymentReceipt.value
      
      const formData = new FormData()
      formData.append('hacienda', mi_hacienda.value.id)
      formData.append('solicitante', authStore.user.id)
      // El esquema de DB solo acepta 'plan_upgrade' o 'modulo_addon' en 'tipo'
      formData.append('tipo', selectedPlan.value ? 'plan_upgrade' : 'modulo_addon')
      
      if (selectedPlan.value) {
        formData.append('plan_solicitado', selectedPlan.value)
      }
      
      // El esquema de DB tiene 'modulo_solicitado' (en singular y tipo texto)
      formData.append('modulo_solicitado', JSON.stringify(selectedModuleIds.value))
      formData.append('estado', 'pendiente')
      formData.append('comprobante', receiptFile)
      
      // Monto, ciclo y tipo en notas_admin (no hay columnas separadas en schema)
      const metadatos = `Monto Total: ${totalAmount.value} | Ciclo: ${billingCycle.value} | Unificada`
      formData.append('notas_admin', metadatos)
      formData.append('fecha_solicitud', new Date().toISOString())

      await pb.collection('solicitudes_suscripcion').create(formData)

      uiFeedbackStore.showSnackbar("Solicitud enviada con éxito. Será revisada pronto.", "success")
      changePlanModalOpen.value = false
      await checkPendingRequests()

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

.plan-card {
  transition: all 0.3s ease;
  position: relative;
  background: white;
}

.plan-card-hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.1);
}

.plan-card-selected {
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: white;
  border-radius: 50%;
  padding: 4px;
  z-index: 1;
}

.plan-name { color: #2c3e50; }
.plan-price { color: #4caf50; }
.plan-features { color: #546e7a; }
</style>

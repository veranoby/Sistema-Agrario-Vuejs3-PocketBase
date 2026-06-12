<template>
  <div class="bg-dinamico border-1 m-5 mt-0 px-4 py-4 shadow-md hover:shadow-xl">
    <h3 class="text-xl font-bold mb-4">{{ t('user_management.my_users') }}</h3>

    <v-alert
      v-if="showLimitBanner"
      type="warning"
      variant="tonal"
      class="mb-6"
      border="start"
      elevation="1"
      density="compact"
    >
      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
        <span class="text-xs font-weight-medium">{{ t('user_management.plan_limit_reached_banner') }}</span>
        <v-btn
          color="warning"
          variant="flat"
          size="x-small"
          to="/hacienda/suscripciones"
          class="ml-auto"
        >
          {{ t('user_management.go_to_subscriptions') }}
        </v-btn>
      </div>
    </v-alert>

    <div class="mb-6">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-l font-semibold">
          <v-icon color="primary" class="mr-2">mdi-account-hard-hat-outline</v-icon> {{ t('user_management.auditors') }}
        </h3>
        <span v-if="limitsData.hasSubscription" class="text-xs text-grey-darken-1 font-medium">
          {{ t('user_management.auditors_limit_info', { current: limitsData.currentAuditores, limit: limitsData.auditoresLimit }) }}
        </span>
      </div>
      <div v-if="auditores.length === 0" class="text-xs">{{ t('user_management.no_auditors') }}</div>
      <ul v-else>
        <li
          v-for="auditor in auditores"
          :key="auditor.id"
          class="flex justify-between items-center mb-2"
        >
          <span class="text-xs"
            >{{ auditor.username }}: {{ auditor.name }} {{ auditor.lastname }} ({{
              auditor.email
            }})</span
          >
          <v-btn
            size="small"
            color="red-lighten-2"
            icon="mdi-minus"
            @click="deleteUser(auditor.id)"
          ></v-btn>
        </li>
      </ul>
      <v-btn
        v-if="canAddAuditor"
        size="small"
        class="mt-2"
        variant="flat"
        rounded="smlg"
        prepend-icon="mdi-plus"
        color="green-lighten-3"
        @click="openCreateUserModal('auditor')"
      >
        {{ t('user_management.add_auditor') }}
      </v-btn>

      <v-chip
        v-else
        variant="flat"
        size="small"
        color="orange-lighten-3"
        prepend-icon="mdi-alert-octagon"
        class="mt-2"
      >
        {{ t('user_management.auditor_limit_reached') }}
      </v-chip>
    </div>

    <div class="mb-6">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-l font-semibold">
          <v-icon color="primary" class="mr-2">mdi-account-cowboy-hat-outline</v-icon> {{ t('user_management.operators') }}
        </h3>
        <span v-if="limitsData.hasSubscription" class="text-xs text-grey-darken-1 font-medium">
          {{ t('user_management.operators_limit_info', { current: limitsData.currentOperadores, limit: limitsData.operadoresLimit }) }}
        </span>
      </div>
      <div v-if="operadores.length === 0" class="text-xs">{{ t('user_management.no_operators') }}</div>
      <ul v-else>
        <li
          v-for="operador in operadores"
          :key="operador.id"
          class="flex justify-between items-center mb-2"
        >
          <span class="text-xs"
            >{{ operador.username }}: {{ operador.name }} {{ operador.lastname }} ({{
              operador.email
            }})</span
          >
          <v-btn
            size="small"
            color="red-lighten-2"
            icon="mdi-minus"
            @click="deleteUser(operador.id)"
          ></v-btn>
        </li>
      </ul>
      <v-btn
        v-if="canAddOperador"
        size="small"
        class="mt-2"
        variant="flat"
        rounded="sm"
        prepend-icon="mdi-plus"
        color="green-lighten-3"
        @click="openCreateUserModal('operador')"
      >
        {{ t('user_management.add_operator') }}
      </v-btn>

      <v-chip
        v-else
        variant="flat"
        size="small"
        color="orange-lighten-3"
        prepend-icon="mdi-alert-octagon"
        class="mt-2"
      >
        {{ t('user_management.operator_limit_reached') }}
      </v-chip>
    </div>

    <v-dialog
      v-model="createUserModalOpen"
      max-width="900px"
      persistent
      transition="dialog-bottom-transition"
      scrollable
    >
      <v-card>
        <v-toolbar color="primary" dark>
          <v-toolbar-title>{{ t('user_management.create_new_user') }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="createUserModalOpen = false"></v-btn>
        </v-toolbar>

        <v-card-text class="pa-0">
          <v-row no-gutters>
            <!-- Columna Izquierda: Crear -->
            <v-col cols="12" md="7" class="pa-4 border-e">
              <UserForm
                :is-editing="false"
                :loading="loading"
                :available-roles="[userTypeToCreate]"
                @submit="createUser"
                @cancel="createUserModalOpen = false"
              />
            </v-col>
            
            <!-- Columna Derecha: Reactivar -->
            <v-col cols="12" md="5" class="pa-4 bg-grey-lighten-4">
              <h3 class="mb-4 text-grey-darken-2">Usuarios Disponibles (Inactivos)</h3>
              <v-list bg-color="transparent" class="pa-0">
                <template v-if="inactivosDisponibles.length">
                  <v-list-item
                    v-for="user in inactivosDisponibles"
                    :key="user.id"
                    class="mb-2 bg-white rounded border"
                  >
                    <v-list-item-title class="font-weight-bold">{{ user.name }} {{ user.lastname }}</v-list-item-title>
                    <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-btn  color="primary" variant="flat" @click="reactivateUser(user.id)">
                        Reactivar
                      </v-btn>
                    </template>
                  </v-list-item>
                </template>
                <div v-else class="text-xs text-grey text-center mt-4">
                  No hay usuarios inactivos para este rol.
                </div>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useUserStore } from '@/stores/userStore'
import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import { useSubscriptionLimits } from '@/composables/useSubscriptionLimits'
import { useEvents } from '@/composables/useEvents'
import { EVENTS } from '@/utils/eventBus'
import { storeToRefs } from 'pinia'
import UserForm from '@/components/forms/auth/UserForm.vue'

const { t } = useI18n()
const haciendaStore = useHaciendaStore()
const userStore = useUserStore()
const uiFeedbackStore = useUiFeedbackStore()
const { canAddUser, getHaciendaLimits } = useSubscriptionLimits()
const { emit } = useEvents()

const { mi_hacienda } = storeToRefs(haciendaStore)

const auditores = ref([])
const operadores = ref([])
const inactivos = ref([])
const createUserModalOpen = ref(false)
const userTypeToCreate = ref('')
const loading = ref(false)

const inactivosDisponibles = computed(() => {
  return inactivos.value.filter(u => u.role === userTypeToCreate.value)
})

// Estado reactivo de cuotas y límites
const limits = ref({
  canAddAuditor: true,
  canAddOperador: true,
  reasons: { auditor: '', operador: '' }
})

const limitsData = ref({
  hasSubscription: false,
  userLimit: 0,
  currentUsers: 0,
  auditoresLimit: 0,
  currentAuditores: 0,
  operadoresLimit: 0,
  currentOperadores: 0,
  planName: ''
})

const canAddAuditor = computed(() => limits.value.canAddAuditor)
const canAddOperador = computed(() => limits.value.canAddOperador)

const showLimitBanner = computed(() => {
  if (!limitsData.value.hasSubscription) return false
  
  const auditorsFull = limitsData.value.currentAuditores >= limitsData.value.auditoresLimit
  const operatorsFull = limitsData.value.currentOperadores >= limitsData.value.operadoresLimit
  
  // El mensaje PRINCIPAL general solo debe salir si se han llenado AMBAS cuotas
  return auditorsFull && operatorsFull
})

const updateSubscriptionLimits = async () => {
  if (!mi_hacienda.value?.id) {
    console.warn('[SUBSCRIPTION_LIMITS] Hacienda ID no cargado todavía.')
    return
  }

  try {
    const checkAuditor = await canAddUser(mi_hacienda.value.id, 'auditor')
    const checkOperador = await canAddUser(mi_hacienda.value.id, 'operador')
    
    limits.value = {
      canAddAuditor: checkAuditor.canAdd,
      canAddOperador: checkOperador.canAdd,
      reasons: {
        auditor: checkAuditor.reason,
        operador: checkOperador.reason
      }
    }

    const limitsResult = await getHaciendaLimits(mi_hacienda.value.id)
    limitsData.value = limitsResult
  } catch (error) {
    console.error('[SUBSCRIPTION_LIMITS] Error updating limits:', error)
  }
}

const fetchHaciendaUsers = async () => {
  try {
    const users = await userStore.fetchHaciendaUsers(mi_hacienda.value.id)
    const checkActive = (status) => Array.isArray(status) ? status.includes('active') : status === 'active'
    
    auditores.value = users.filter((user) => user.role === 'auditor' && checkActive(user.status))
    operadores.value = users.filter((user) => user.role === 'operador' && checkActive(user.status))
    inactivos.value = users.filter((user) => !checkActive(user.status))
    
    // Actualizar límites tras cargar usuarios
    await updateSubscriptionLimits()
  } catch (error) {
    uiFeedbackStore.showSnackbar(t('user_management.error_fetching_users'), 'error')
  }
}

const openCreateUserModal = async (userType) => {
  userTypeToCreate.value = userType
  
  // Doble verificación al abrir (redundante pero segura)
  await updateSubscriptionLimits()
  
  if (userType === 'auditor' && !limits.value.canAddAuditor) {
    uiFeedbackStore.showSnackbar(limits.value.reasons.auditor, 'error')
    return
  }
  
  if (userType === 'operador' && !limits.value.canAddOperador) {
    uiFeedbackStore.showSnackbar(limits.value.reasons.operador, 'error')
    return
  }

  createUserModalOpen.value = true
}

const createUser = async (formData) => {
  loading.value = true
  try {
    const user = await userStore.registerUser(formData, userTypeToCreate.value, mi_hacienda.value.id)
    emit(EVENTS.USUARIO_ADDED, { userId: user.id, haciendaId: mi_hacienda.value.id, role: userTypeToCreate.value })
    uiFeedbackStore.showSnackbar(t('user_management.user_created'), 'success')
    createUserModalOpen.value = false
    
    // Recargar lista y RE-VALIDAR CUOTAS
    await fetchHaciendaUsers()
  } catch (error) {
    uiFeedbackStore.showSnackbar(t('user_management.error_creating_user') + ': ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

const reactivateUser = async (userId) => {
  try {
    await userStore.updateUser(userId, { status: 'active' })
    emit(EVENTS.USUARIO_ADDED, { userId, haciendaId: mi_hacienda.value.id, role: userTypeToCreate.value })
    uiFeedbackStore.showSnackbar('Usuario reactivado exitosamente', 'success')
    // Recargar y reevaluar limites
    await fetchHaciendaUsers()
    
    // Auto cerrar modal si se queda sin cupo tras reactivar
    if (userTypeToCreate.value === 'auditor' && !limits.value.canAddAuditor) {
      createUserModalOpen.value = false
    } else if (userTypeToCreate.value === 'operador' && !limits.value.canAddOperador) {
      createUserModalOpen.value = false
    }
  } catch (error) {
    uiFeedbackStore.showSnackbar('Error reactivando usuario', 'error')
  }
}

const deleteUser = async (userId) => {
  if (confirm(t('user_management.confirm_delete'))) {
    try {
      await userStore.deleteUser(userId, { soft: true })
      emit(EVENTS.USUARIO_REMOVED, { userId, soft: true })
      
      // Recargar lista y RE-VALIDAR CUOTAS (liberar espacio)
      await fetchHaciendaUsers()
      
      uiFeedbackStore.showSnackbar(t('user_management.user_deleted'), 'success')
    } catch (error) {
      uiFeedbackStore.showSnackbar(t('user_management.error_deleting_user') + ': ' + error.message, 'error')
    }
  }
}

onMounted(async () => {
  await fetchHaciendaUsers()
})
</script>
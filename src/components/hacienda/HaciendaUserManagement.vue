<template>
  <div class="bg-dinamico border-1 m-5 mt-0 px-4 py-4 shadow-md hover:shadow-xl">
    <h2 class="text-xl font-bold mb-4">{{ t('user_management.my_users') }}</h2>

    <div class="mb-6">
      <h3 class="text-l font-semibold mb-2">
        <v-icon color="success" class="mr-2">mdi-account-hard-hat-outline</v-icon> {{ t('user_management.auditors') }}
      </h3>
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
            size="x-small"
            color="red-lighten-2"
            icon="mdi-minus"
            @click="deleteUser(auditor.id)"
          ></v-btn>
        </li>
      </ul>
      <v-btn
        v-if="canAddAuditor"
        size="x-small"
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
      <h3 class="text-l font-semibold mb-2">
        <v-icon color="success" class="mr-2">mdi-account-cowboy-hat-outline</v-icon> {{ t('user_management.operators') }}
      </h3>
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
            size="x-small"
            color="red-lighten-2"
            icon="mdi-minus"
            @click="deleteUser(operador.id)"
          ></v-btn>
        </li>
      </ul>
      <v-btn
        v-if="canAddOperador"
        size="x-small"
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
      max-width="600px"
      persistent
      transition="dialog-bottom-transition"
      scrollable
    >
      <v-card>
        <v-toolbar color="success" dark>
          <v-toolbar-title>{{ t('user_management.create_new_user') }}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>

        <UserForm
          :is-editing="false"
          :loading="loading"
          :available-roles="['auditor', 'operador']"
          @submit="createUser"
          @cancel="createUserModalOpen = false"
        />
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { useUserStore } from '@/stores/userStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { useSubscriptionLimits } from '@/composables/useSubscriptionLimits'
import { useEvents } from '@/composables/useEvents'
import { EVENTS } from '@/utils/eventBus'
import { storeToRefs } from 'pinia'

const { t } = useI18n()
const haciendaStore = useHaciendaStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const { canAddUser } = useSubscriptionLimits()
const { emit } = useEvents()

const { mi_hacienda } = storeToRefs(haciendaStore)

const auditores = ref([])
const operadores = ref([])
const createUserModalOpen = ref(false)
const userTypeToCreate = ref('')
const loading = ref(false)
const limitCheck = ref(null)

const canAddAuditor = computed(() => {
  return limitCheck.value?.canAdd !== false && userTypeToCreate.value === 'auditor'
})

const canAddOperador = computed(() => {
  return limitCheck.value?.canAdd !== false && userTypeToCreate.value === 'operador'
})

const fetchHaciendaUsers = async () => {
  try {
    const users = await userStore.fetchHaciendaUsers(mi_hacienda.value.id)
    auditores.value = users.filter((user) => user.role === 'auditor')
    operadores.value = users.filter((user) => user.role === 'operador')
  } catch (error) {
    snackbarStore.showSnackbar(t('user_management.error_fetching_users'), 'error')
  }
}

const openCreateUserModal = async (userType) => {
  userTypeToCreate.value = userType
  
  // Validar límites de suscripción
  try {
    const check = await canAddUser(mi_hacienda.value.id, userType)
    limitCheck.value = check
    
    if (!check.canAdd) {
      snackbarStore.showSnackbar(check.reason, 'error')
      return
    }
  } catch (error) {
    snackbarStore.showSnackbar(t('user_management.error_checking_limits') + ': ' + error.message, 'error')
    return
  }

  createUserModalOpen.value = true
}

const createUser = async (formData) => {
  loading.value = true
  try {
    const user = await userStore.registerUser(formData, userTypeToCreate.value, mi_hacienda.value.id)
    emit(EVENTS.USUARIO_ADDED, { userId: user.id, haciendaId: mi_hacienda.value.id, role: userTypeToCreate.value })
    snackbarStore.showSnackbar(t('user_management.user_created'), 'success')
    createUserModalOpen.value = false
    limitCheck.value = null
    await fetchHaciendaUsers()
  } catch (error) {
    snackbarStore.showSnackbar(t('user_management.error_creating_user') + ': ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

const deleteUser = async (userId) => {
  if (confirm(t('user_management.confirm_delete'))) {
    try {
      await userStore.deleteUser(userId, { soft: true })
      emit(EVENTS.USUARIO_REMOVED, { userId, soft: true })
      await fetchHaciendaUsers()
      snackbarStore.showSnackbar(t('user_management.user_deleted'), 'success')
    } catch (error) {
      snackbarStore.showSnackbar(t('user_management.error_deleting_user') + ': ' + error.message, 'error')
    }
  }
}

onMounted(async () => {
  await fetchHaciendaUsers()
})
</script>
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
import { usePlanStore } from '@/stores/planStore'
import { useUserStore } from '@/stores/userStore'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { storeToRefs } from 'pinia'

const { t } = useI18n()
const haciendaStore = useHaciendaStore()
const planStore = usePlanStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()

const { mi_hacienda } = storeToRefs(haciendaStore)
const { currentPlan } = storeToRefs(planStore)

const auditores = ref([])
const operadores = ref([])
const createUserModalOpen = ref(false)
const userTypeToCreate = ref('')
const loading = ref(false)

const canAddAuditor = computed(() => {
  return auditores.value.length < (currentPlan.value?.auditores || 0)
})

const canAddOperador = computed(() => {
  return operadores.value.length < (currentPlan.value?.operadores || 0)
})

const fetchHaciendaUsers = async () => {
  try {
    const users = await haciendaStore.fetchHaciendaUsers()
    auditores.value = users.filter((user) => user.role === 'auditor')
    operadores.value = users.filter((user) => user.role === 'operador')
  } catch (error) {
    snackbarStore.showSnackbar(t('user_management.error_fetching_users'), 'error')
  }
}

const openCreateUserModal = (userType) => {
  if (
    (userType === 'auditor' && !canAddAuditor.value) ||
    (userType === 'operador' && !canAddOperador.value)
  ) {
    snackbarStore.showSnackbar(t('user_management.cannot_add_more_users', { userType }), 'error')
    return
  }

  userTypeToCreate.value = userType
  createUserModalOpen.value = true
}

const createUser = async (formData) => {
  if (
    (userTypeToCreate.value === 'auditor' && !canAddAuditor.value) ||
    (userTypeToCreate.value === 'operador' && !canAddOperador.value)
  ) {
    snackbarStore.showSnackbar(t('user_management.cannot_add_more_users', { userType: userTypeToCreate.value }), 'error')
    return
  }

  loading.value = true
  try {
    await userStore.registerUser(formData, userTypeToCreate.value, mi_hacienda.value.id)
    snackbarStore.showSnackbar(t('user_management.user_created'), 'success')
    createUserModalOpen.value = false
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
      await userStore.deleteUser(userId)
      await fetchHaciendaUsers()
      snackbarStore.showSnackbar(t('user_management.user_deleted'), 'success')
    } catch (error) {
      snackbarStore.showSnackbar(t('user_management.error_deleting_user') + ': ' + error.message, 'error')
    }
  }
}

onMounted(async () => {
  await fetchHaciendaUsers()
  await planStore.fetchAvailablePlans()
})
</script>
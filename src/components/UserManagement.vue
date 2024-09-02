<template>
  <div class="rounded-lg border-2 px-4 py-4">
    <h2 class="text-xl font-bold mb-4">Mis Usuarios</h2>

    <div class="mb-6">
      <h3 class="text-l font-semibold mb-2">Auditores</h3>
      <div v-if="auditores.length === 0" class="text-xs">No hay auditores registrados.</div>
      <ul v-else>
        <li
          v-for="auditor in auditores"
          :key="auditor.id"
          class="flex justify-between items-center mb-2"
        >
          <span>{{ auditor.name }} {{ auditor.lastname }} ({{ auditor.email }})</span>
          <v-btn size="small" color="error" @click="deleteUser(auditor.id)">Eliminar</v-btn>
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
        Agregar Auditor
      </v-btn>

      <v-chip
        v-else
        variant="flat"
        size="small"
        color="orange-lighten-3"
        prepend-icon="mdi-alert-octagon"
        class="mt-2"
      >
        Límite de Auditores Alcanzado
      </v-chip>
    </div>

    <div class="mb-6">
      <h3 class="text-l font-semibold mb-2">Operadores</h3>
      <div v-if="operadores.length === 0" class="text-xs">No hay operadores registrados.</div>
      <ul v-else>
        <li
          v-for="operador in operadores"
          :key="operador.id"
          class="flex justify-between items-center mb-2"
        >
          <span>{{ operador.name }} {{ operador.lastname }} ({{ operador.email }})</span>
          <v-btn size="small" color="error" @click="deleteUser(operador.id)">Eliminar</v-btn>
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
        Agregar Operador
      </v-btn>

      <!--     <v-btn v-else size="small" color="primary" class="mt-2" disabled>
        Límite de Operadores Alcanzado
      </v-btn> -->

      <v-chip
        v-else
        variant="flat"
        size="small"
        color="orange-lighten-3"
        prepend-icon="mdi-alert-octagon"
        class="mt-2"
      >
        Límite de Operadores Alcanzado
      </v-chip>
    </div>

    <v-dialog v-model="createUserModalOpen" max-width="500px">
      <v-card>
        <v-card-title
          >Crear Nuevo {{ userTypeToCreate === 'auditor' ? 'Auditor' : 'Operador' }}</v-card-title
        >
        <v-card-text>
          <v-form @submit.prevent="createUser">
            <v-text-field
              v-model="newUser.name"
              label="Nombre"
              required
              :error-messages="validationErrors.name"
            ></v-text-field>
            <v-text-field
              v-model="newUser.lastname"
              label="Apellido"
              required
              :error-messages="validationErrors.lastname"
            ></v-text-field>
            <v-text-field
              v-model="newUser.email"
              label="Email"
              type="email"
              required
              :error-messages="validationErrors.email"
            ></v-text-field>
            <v-text-field
              v-model="newUser.username"
              label="Nombre de Usuario"
              required
              :error-messages="validationErrors.username"
            ></v-text-field>
            <v-text-field
              v-model="newUser.password"
              label="Contraseña"
              type="password"
              required
              :error-messages="validationErrors.password"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue darken-1" text @click="createUserModalOpen = false">Cancelar</v-btn>
          <v-btn color="blue darken-1" text @click="createUser">Crear</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { usePlanStore } from '@/stores/planStore'
import { storeToRefs } from 'pinia'

export default {
  name: 'UserManagement',

  setup() {
    const haciendaStore = useHaciendaStore()
    const planStore = usePlanStore()
    const { mi_hacienda } = storeToRefs(haciendaStore)
    const { currentPlan } = storeToRefs(planStore)

    const auditores = ref([])
    const operadores = ref([])
    const createUserModalOpen = ref(false)
    const userTypeToCreate = ref('')
    const validationErrors = ref({})

    const newUser = ref({
      name: '',
      lastname: '',
      email: '',
      username: '',
      password: ''
    })

    const canAddAuditor = computed(() => {
      return auditores.value.length < currentPlan.value.auditores
    })

    const canAddOperador = computed(() => {
      return operadores.value.length < currentPlan.value.operadores
    })

    const fetchHaciendaUsers = async () => {
      try {
        const users = await haciendaStore.fetchHaciendaUsers()
        auditores.value = users.filter((user) => user.role === 'auditor')
        operadores.value = users.filter((user) => user.role === 'operador')
      } catch (error) {
        console.error('Error al cargar los usuarios:', error)
      }
    }

    const openCreateUserModal = (userType) => {
      if (
        (userType === 'auditor' && !canAddAuditor.value) ||
        (userType === 'operador' && !canAddOperador.value)
      ) {
        console.error(`No puede agregar más ${userType}es. Limite del plan alcanzado.`)
        return
      }
      userTypeToCreate.value = userType
      createUserModalOpen.value = true
    }

    const createUser = async () => {
      if (
        (userTypeToCreate.value === 'auditor' && !canAddAuditor.value) ||
        (userTypeToCreate.value === 'operador' && !canAddOperador.value)
      ) {
        console.error(
          `No puede agregar más ${userTypeToCreate.value}es. Limite del plan alcanzado.`
        )
        return
      }

      try {
        await haciendaStore.createHaciendaUser({
          ...newUser.value,
          role: userTypeToCreate.value,
          hacienda: mi_hacienda.value.id
        })
        createUserModalOpen.value = false
        newUser.value = { name: '', lastname: '', email: '', username: '', password: '' }
        await fetchHaciendaUsers()
      } catch (error) {
        console.error('Error al crear el usuario:', error.message)
      }
    }

    const deleteUser = async (userId) => {
      if (confirm('¿Está seguro de que desea eliminar este usuario?')) {
        try {
          await haciendaStore.deleteHaciendaUser(userId)
          await fetchHaciendaUsers()
        } catch (error) {
          console.error('Error al eliminar el usuario:', error.message)
        }
      }
    }

    onMounted(() => {
      fetchHaciendaUsers()
    })

    return {
      auditores,
      operadores,
      createUserModalOpen,
      userTypeToCreate,
      validationErrors,
      newUser,
      canAddAuditor,
      canAddOperador,
      openCreateUserModal,
      createUser,
      deleteUser
    }
  }
}
</script>

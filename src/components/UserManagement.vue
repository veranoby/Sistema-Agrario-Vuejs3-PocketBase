<template>
  <div class="bg-dinamico border-1 m-5 mt-0 px-4 py-4 shadow-md hover:shadow-xl">
    <h2 class="text-xl font-bold mb-4">Mis Usuarios</h2>

    <div class="mb-6">
      <h3 class="text-l font-semibold mb-2">
        <v-icon color="success" class="mr-2">mdi-account-hard-hat-outline</v-icon> Auditores
      </h3>
      <div v-if="auditores.length === 0" class="text-xs">No hay auditores registrados.</div>
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
      <h3 class="text-l font-semibold mb-2">
        <v-icon color="success" class="mr-2">mdi-account-cowboy-hat-outline</v-icon> Operadores
      </h3>
      <div v-if="operadores.length === 0" class="text-xs">No hay operadores registrados.</div>
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
        Agregar Operador
      </v-btn>

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

    <v-dialog
      v-model="createUserModalOpen"
      max-width="600px"
      persistent
      transition="dialog-bottom-transition"
      scrollable
    >
      <v-card>
        <v-form @submit.prevent="createUser">
          <v-toolbar color="success" dark>
            <v-toolbar-title>Crear nuevo Usuario</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>

          <v-card-text>
            <div class="grid grid-cols-2 gap-1">
              <v-text-field
                label="Nombre"
                color="primary"
                v-model="newUser.name"
                variant="outlined"
                required
                density="compact"
                :error-messages="v$.name.$errors.map((e) => e.$message)"
                @input="(v$.name.$touch(), (newUser.name = newUser.name.toUpperCase()))"
              ></v-text-field>
              <v-text-field
                v-model="newUser.lastname"
                label="Apellido"
                variant="outlined"
                required
                density="compact"
                :error-messages="v$.lastname.$errors.map((e) => e.$message)"
                @input="(v$.lastname.$touch(), (newUser.lastname = newUser.lastname.toUpperCase()))"
              ></v-text-field>

              <v-text-field
                v-model="newUser.username"
                label="Nombre de Usuario"
                variant="outlined"
                required
                density="compact"
                :class="usernameAvailable ? '' : ' text-red'"
                :error-messages="v$.username.$errors.map((e) => e.$message)"
                :color="usernameAvailable ? 'primary' : 'error'"
                @blur="checkUsername"
                @input="(v$.username.$touch(), (newUser.username = newUser.username.toUpperCase()))"
              ></v-text-field>

              <v-text-field
                v-model="newUser.email"
                label="Email"
                type="email"
                variant="outlined"
                required
                density="compact"
                :class="emailAvailable ? '' : ' text-red'"
                :error-messages="v$.email.$errors.map((e) => e.$message)"
                :color="emailAvailable ? 'primary' : 'error'"
                @blur="checkEmail"
                @input="v$.email.$touch()"
              ></v-text-field>

              <v-text-field
                v-model="newUser.password"
                label="Password"
                variant="outlined"
                required
                :error-messages="v$.password.$errors.map((e) => e.$message)"
                color="primary"
                :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                :type="visible ? 'text' : 'password'"
                density="compact"
                prepend-inner-icon="mdi-lock-outline"
                @input="v$.password.$touch()"
                @click:append-inner="visible = !visible"
              ></v-text-field>

              <v-text-field
                v-model="newUser.passwordConfirm"
                label="Confirm Password"
                variant="outlined"
                required
                :error-messages="v$.passwordConfirm.$errors.map((e) => e.$message)"
                color="primary"
                :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                :type="visible ? 'text' : 'password'"
                density="compact"
                prepend-inner-icon="mdi-lock-outline"
                @input="v$.passwordConfirm.$touch()"
                @click:append-inner="visible = !visible"
              >
              </v-text-field>
            </div>
          </v-card-text>

          <!-- campo role escondido -->

          <v-text-field hidden v-model="newUser.role"></v-text-field>

          <v-card-actions>
            <v-spacer></v-spacer>

            <v-btn
              type="submit"
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-check"
              color="green-lighten-3"
              @click="createUser"
              :disabled="!formValid"
              >Crear Usuario</v-btn
            >

            <v-btn
              size="small"
              variant="flat"
              rounded="lg"
              prepend-icon="mdi-cancel"
              color="red-lighten-3"
              @click="createUserModalOpen = false"
              >Cancelar</v-btn
            >
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { usePlanStore } from '@/stores/planStore'
import { storeToRefs } from 'pinia'
import { useSnackbarStore } from '@/stores/snackbarStore'

import { useValidationStore } from '@/stores/validationStore'
import { useVuelidate } from '@vuelidate/core'

import { required, email, minLength, sameAs } from '@vuelidate/validators'
import { useAuthStore } from '@/stores/authStore'

export default {
  name: 'UserManagement',

  setup() {
    const haciendaStore = useHaciendaStore()
    const planStore = usePlanStore()
    const { mi_hacienda } = storeToRefs(haciendaStore)
    const { currentPlan } = storeToRefs(planStore)

    const snackbarStore = useSnackbarStore()
    const authStore = useAuthStore()

    const auditores = ref([])
    const operadores = ref([])
    const createUserModalOpen = ref(false)
    const userTypeToCreate = ref('')

    const validationStore = useValidationStore()

    const visible = ref(false)
    const usernameAvailable = ref(true)
    const emailAvailable = ref(true)

    const newUser = ref({
      name: '',
      lastname: '',
      email: '',
      username: '',
      password: '',
      passwordConfirm: '',
      role: ''
    })

    const rules = {
      username: {
        required,
        minLength: minLength(3)
      },
      email: {
        required,
        email
      },
      name: { required },
      lastname: { required },
      password: { required, minLength: minLength(8) },
      passwordConfirm: {
        required,
        sameAsPassword: sameAs(computed(() => newUser.value.password))
      }
    }

    const v$ = useVuelidate(rules, newUser)

    const formValid = computed(() => {
      return !v$.value.$invalid && usernameAvailable.value && emailAvailable.value
    })

    const checkUsername = async () => {
      if (newUser.value.username.length >= 3) {
        try {
          const fields = [
            {
              collection: 'users',
              field: 'username',
              value: newUser.value.username
            }
          ]
          const results = await validationStore.checkFieldsTaken(fields)
          usernameAvailable.value = results.username
        } catch (error) {
          console.error('Error checking username:', error)
          usernameAvailable.value = false
        }
      } else {
        usernameAvailable.value = true
      }
    }

    const checkEmail = async () => {
      if (newUser.value.email) {
        try {
          const fields = [
            {
              collection: 'users',
              field: 'email',
              value: newUser.value.email
            }
          ]
          const results = await validationStore.checkFieldsTaken(fields)
          emailAvailable.value = results.email
        } catch (error) {
          console.error('Error checking email:', error)
          emailAvailable.value = false
        }
      } else {
        emailAvailable.value = true
      }
    }

    const canAddAuditor = computed(() => {
      return auditores.value.length < currentPlan.value?.auditores || 0
    })

    const canAddOperador = computed(() => {
      return operadores.value.length < currentPlan.value?.operadores || 0
    })

    const fetchHaciendaUsers = async () => {
      try {
        const users = await haciendaStore.fetchHaciendaUsers()
        auditores.value = users.filter((user) => user.role === 'auditor')
        operadores.value = users.filter((user) => user.role === 'operador')
      } catch (error) {
        handleError(error, 'Error recopilando usuarios..')
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

      newUser.value = {
        name: '',
        lastname: '',
        email: '',
        username: '',
        password: '',
        passwordConfirm: '',
        role: userType // Set role when opening the modal
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

      const isValid = await v$.value.$validate()
      if (!isValid) {
        snackbarStore.showSnackbar('Please correct the errors in the form', 'error')
        return
      }

      try {
        const registrationData = {
          username: newUser.value.username,
          email: newUser.value.email,
          firstname: newUser.value.name,
          lastname: newUser.value.lastname,
          password: newUser.value.password,
          hacienda: mi_hacienda.value.id,
          role: newUser.value.role // Include role in registration data
        }

        console.log('newUser.value.role:', newUser.value.role)
        console.log('registrationData:', registrationData)

        await authStore.register(registrationData, newUser.value.role)

        createUserModalOpen.value = false
        //      newUser.value = { name: '', lastname: '', email: '', username: '', password: '' }
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

    onMounted(async () => {
      await fetchHaciendaUsers()
      await planStore.fetchAvailablePlans()
    })

    return {
      auditores,
      operadores,
      createUserModalOpen,
      userTypeToCreate,

      v$,
      formValid,

      usernameAvailable,
      emailAvailable,
      checkUsername,
      checkEmail,
      visible,

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

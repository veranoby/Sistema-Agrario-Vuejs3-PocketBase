<template>
  <div class="container mx-auto py-12 px-4 md:px-6 lg:px-8">
    <div class="grid grid-cols-1 rounded-lg border-4 px-2 py-2">
      <div class="grid gap-4 grid-cols-2 px-2 py-2">
        <div>
          <v-form @submit.prevent="saveProfileChanges">
            <div class="grid grid-cols-2 gap-2">
              <h2 class="text-2xl font-bold">
                Mi Perfil
                <v-chip variant="flat" size="x-small" color="grey-lighten-2" class="mx-1">
                  {{ userRole }}
                </v-chip>
              </h2>
              <v-text-field
                v-model="profileForm.email"
                variant="solo"
                disabled
                label="Email"
                density="compact"
                type="email"
                class="compact-form-2"
              ></v-text-field>
            </div>

            <div class="">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <v-text-field
                  v-model="profileForm.name"
                  label="Nombre"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-text-field>
                <v-text-field
                  v-model="profileForm.lastname"
                  label="Apellido"
                  variant="outlined"
                  density="compact"
                  class="compact-form"
                ></v-text-field>
              </div>
              <v-text-field
                v-model="profileForm.username"
                label="Nombre de Usuario"
                variant="outlined"
                density="compact"
                class="compact-form"
              ></v-text-field>

              <v-textarea
                v-model="profileForm.info"
                label="Informacion personal"
                variant="outlined"
                density="compact"
                class="compact-form"
              ></v-textarea>
              <div class="text-left">
                <v-btn
                  size="small"
                  variant="flat"
                  rounded="lg"
                  prepend-icon="mdi-check"
                  color="green-lighten-3"
                  type="submit"
                  :loading="isLoading"
                >
                  Guardar Cambios de Perfil
                </v-btn>
              </div>
            </div>
          </v-form>
        </div>
        <div>
          <v-card class="pa-4 rounded-lg border-2">
            <v-card-title class="compact-form-2">
              <v-file-input
                v-model="avatarFile"
                prepend-icon="mdi-camera"
                label="Upload Avatar"
                accept="image/*"
                @change="handleAvatarUpload"
                show-size
              ></v-file-input
            ></v-card-title>
            <v-card-text>
              <div class="flex items-center">
                <v-avatar size="128" class="mr-4">
                  <v-img :src="authStore.avatarUrl" alt="Avatar"></v-img>
                </v-avatar>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
      <v-form @submit.prevent="changePassword" class="mt-8">
        <div class="grid grid-cols-1 rounded-lg border-2 px-2 py-2">
          <h2 class="text-xl font-bold">Cambiar contraseña</h2>

          <div class="grid grid-cols-3 gap-2">
            <v-text-field
              v-model="passwordForm.oldPassword"
              label="Contraseña actual"
              variant="outlined"
              type="password"
              density="compact"
              class="compact-form"
              :error-messages="passwordForm.errors.oldPassword"
            ></v-text-field>

            <v-text-field
              v-model="passwordForm.newPassword"
              label="Nueva contraseña"
              variant="outlined"
              type="password"
              density="compact"
              class="compact-form"
              :error-messages="passwordForm.errors.newPassword"
            ></v-text-field>

            <v-text-field
              v-model="passwordForm.confirmPassword"
              label="Confirmar nueva contraseña"
              variant="outlined"
              type="password"
              density="compact"
              class="compact-form"
              :error-messages="passwordForm.errors.confirmPassword"
            ></v-text-field>
          </div>
          <div class="grid grid-cols-2">
            <div class="text-left mt-4">
              <v-btn
                size="small"
                variant="flat"
                rounded="lg"
                prepend-icon="mdi-lock-reset"
                color="red-lighten-3"
                type="submit"
                :loading="isLoading"
              >
                Cambiar contraseña
              </v-btn>
            </div>
          </div>
        </div>
      </v-form>
    </div>

    <!--INICIO SECCION HACIENDA-->

    <div class="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 rounded-lg border-4 px-4 py-4">
      <v-form @submit.prevent="saveHaciendaChanges">
        <div class="flex items-center space-x-2 mb-4">
          <h2 class="text-2xl font-bold">Mi Hacienda: {{ haciendaName }}</h2>
          <v-chip :color="getPlanColor" size="small">
            {{ currentPlan.nombre }}
          </v-chip>
          <v-btn v-if="isAdmin" size="small" variant="outlined" @click="openChangePlanModal">
            Cambiar Plan
          </v-btn>
        </div>
        <v-text-field
          v-model="haciendaForm.name"
          label="Nombre"
          variant="outlined"
          density="compact"
          class="compact-form"
        ></v-text-field>
        <v-text-field
          v-model="haciendaForm.location"
          label="Localizacion/Direccion"
          variant="outlined"
          density="compact"
          class="compact-form"
        ></v-text-field>
        <v-textarea
          v-model="haciendaForm.info"
          label="Informacion General"
          variant="outlined"
          density="compact"
          auto-grow
          rows="4"
          class="compact-form mt-4"
        ></v-textarea>
        <div class="text-left mt-4">
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-check"
            color="green-lighten-3"
            type="submit"
            :loading="isLoading"
          >
            Guardar Cambios de Hacienda
          </v-btn>
        </div>
      </v-form>

      <div v-if="isAdmin" class="space-y-6 rounded-lg border-2 px-4 py-4">
        <div>
          <h2 class="text-2xl font-bold">Mis Usuarios</h2>
          <div>
            <div class="mb-4">
              <h3 class="text-xl font-semibold mb-2">Auditores</h3>
              <div v-if="auditores.length === 0">No hay auditores registrados.</div>
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
                size="small"
                color="primary"
                class="mt-2"
                @click="openCreateUserModal('auditor')"
              >
                Agregar Auditor
              </v-btn>
              <v-btn v-else size="small" color="primary" class="mt-2" disabled>
                Límite de Auditores Alcanzado
              </v-btn>
            </div>

            <div class="mb-4">
              <h3 class="text-xl font-semibold mb-2">Operadores</h3>
              <div v-if="operadores.length === 0">No hay operadores registrados.</div>
              <ul v-else>
                <li
                  v-for="operador in operadores"
                  :key="operador.id"
                  class="flex justify-between items-center mb-2"
                >
                  <span>{{ operador.name }} {{ operador.lastname }} ({{ operador.email }})</span>
                  <v-btn size="small" color="error" @click="deleteUser(operador.id)"
                    >Eliminar</v-btn
                  >
                </li>
              </ul>
              <v-btn
                v-if="canAddOperador"
                size="small"
                color="primary"
                class="mt-2"
                @click="openCreateUserModal('operador')"
              >
                Agregar Operador
              </v-btn>
              <v-btn v-else size="small" color="primary" class="mt-2" disabled>
                Límite de Operadores Alcanzado
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- modal component for plan change -->
  <v-dialog v-model="changePlanModalOpen" max-width="500px">
    <v-card>
      <v-card-title>Cambiar Plan</v-card-title>
      <v-card-text>
        <v-radio-group v-model="selectedPlan">
          <v-radio
            v-for="plan in availablePlans"
            :key="plan.id"
            :label="`${plan.nombre} - $${plan.precio}/mes`"
            :value="plan.id"
          ></v-radio>
        </v-radio-group>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="changePlanModalOpen = false">Cancelar</v-btn>
        <v-btn color="blue darken-1" text @click="changePlan">Confirmar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Add this modal for creating new users -->
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
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useSnackbarStore } from '@/stores/snackbarStore'

import { useProfileStore } from '@/stores/profileStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { usePlanStore } from '@/stores/planStore'

export default {
  name: 'ProfileComponent',

  setup() {
    const authStore = useAuthStore()
    const snackbarStore = useSnackbarStore()

    const profileStore = useProfileStore()
    const haciendaStore = useHaciendaStore()
    const planStore = usePlanStore()

    const fullName = computed(() => profileStore.fullName)
    const haciendaName = computed(() => haciendaStore.haciendaName)
    const currentPlan = computed(() => planStore.currentPlan)

    const userRole = computed(() => profileStore.user.role)

    const haciendaForm = ref({
      name: haciendaStore.haciendaName,
      location: haciendaStore.mi_hacienda.location,
      info: haciendaStore.mi_hacienda.info,
      plan: haciendaStore.mi_hacienda.plan
    })

    const changePlanModalOpen = ref(false)
    const selectedPlan = ref(null)
    const availablePlans = ref([])

    const isAdmin = computed(() => profileStore.user.role === 'administrador')

    watch(
      () => haciendaStore.mi_hacienda,
      (newHacienda) => {
        haciendaForm.value = {
          name: newHacienda.name,
          location: newHacienda.location,
          info: newHacienda.info,
          plan: newHacienda.plan
        }
      }
    )

    watch(
      () => profileStore.user,
      (newUser) => {
        profileForm.value = {
          name: newUser.name,
          lastname: newUser.lastname,
          username: newUser.username,
          email: newUser.email,
          info: newUser.info
        }
      }
    )
    const getPlanColor = computed(() => {
      switch (currentPlan.value.nombre.toLowerCase()) {
        case 'gratis':
          return 'grey'
        case 'basico':
          return 'blue'
        case 'premium':
          return 'purple'
        default:
          return 'grey'
      }
    })

    const openChangePlanModal = async () => {
      try {
        availablePlans.value = await planStore.fetchAvailablePlans()
        selectedPlan.value = haciendaStore.mi_hacienda.plan
        changePlanModalOpen.value = true
      } catch (error) {
        snackbarStore.showSnackbar('Error al cargar los planes disponibles', 'error')
      }
    }

    const changePlan = async () => {
      if (selectedPlan.value === haciendaStore.mi_hacienda.plan) {
        changePlanModalOpen.value = false
        return
      }

      try {
        await planStore.changePlan(selectedPlan.value)
        await haciendaStore.fetchHacienda(haciendaStore.mi_hacienda.id) // Refresh hacienda data
        snackbarStore.showSnackbar('Plan actualizado exitosamente', 'success')
        changePlanModalOpen.value = false
      } catch (error) {
        snackbarStore.showSnackbar('Error al cambiar el plan', 'error')
      }
    }

    const passwordForm = ref({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
      errors: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    })

    const validatePasswordForm = () => {
      let isValid = true
      passwordForm.value.errors = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }

      if (!passwordForm.value.oldPassword) {
        passwordForm.value.errors.oldPassword = 'La contraseña actual es requerida'
        isValid = false
      }

      if (!passwordForm.value.newPassword) {
        passwordForm.value.errors.newPassword = 'La nueva contraseña es requerida'
        isValid = false
      } else if (passwordForm.value.newPassword.length < 8) {
        passwordForm.value.errors.newPassword =
          'La nueva contraseña debe tener al menos 8 caracteres'
        isValid = false
      }

      if (!passwordForm.value.confirmPassword) {
        passwordForm.value.errors.confirmPassword = 'Confirmar la nueva contraseña es requerido'
        isValid = false
      } else if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
        passwordForm.value.errors.confirmPassword = 'Las contraseñas no coinciden'
        isValid = false
      }

      return isValid
    }

    const changePassword = async () => {
      if (!validatePasswordForm()) {
        return
      }

      isLoading.value = true
      try {
        await authStore.changePassword(
          passwordForm.value.oldPassword,
          passwordForm.value.newPassword
        )
        snackbarStore.showSnackbar('Contraseña cambiada exitosamente', 'success')
        passwordForm.value = {
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
          errors: {
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
          }
        }
      } catch (error) {
        console.log('Error changing password:', error.message)
        snackbarStore.showSnackbar('verifique contraseña antigua: ' + error.message, 'error')
      } finally {
        isLoading.value = false
      }
    }

    const profileForm = ref({
      name: profileStore.user.name,
      lastname: profileStore.user.lastname,
      username: profileStore.user.username,
      email: profileStore.user.email,
      info: profileStore.user.info
    })

    const isLoading = ref(false)
    const avatarFile = ref(null)

    const saveProfileChanges = async () => {
      isLoading.value = true
      try {
        await authStore.updateProfile(profileForm.value)
      } catch (error) {
        console.error('Error updating profile:', error)
      } finally {
        isLoading.value = false
      }
    }

    const saveHaciendaChanges = async () => {
      isLoading.value = true
      haciendaForm.value.name = haciendaForm.value.name.toUpperCase()
      try {
        await authStore.updateHacienda(haciendaForm.value)
      } catch (error) {
        console.error('Error updating hacienda:', error)
      } finally {
        isLoading.value = false
      }
    }

    const handleAvatarUpload = async () => {
      if (avatarFile.value) {
        isLoading.value = true
        try {
          await authStore.updateAvatar(avatarFile.value)
        } catch (error) {
          console.error('Error uploading avatar:', error)
        } finally {
          isLoading.value = false
          avatarFile.value = null
        }
      }
    }

    const auditores = ref([])
    const operadores = ref([])
    const createUserModalOpen = ref(false)
    const userTypeToCreate = ref('')

    const newUser = ref({
      name: '',
      lastname: '',
      email: '',
      username: '',
      password: ''
    })

    const fetchHaciendaUsers = async () => {
      try {
        const users = await authStore.fetchHaciendaUsers()
        auditores.value = users.filter((user) => user.role === 'auditor')
        operadores.value = users.filter((user) => user.role === 'operador')
      } catch (error) {
        snackbarStore.showSnackbar('Error al cargar los usuarios', 'error')
      }
    }

    const canAddAuditor = computed(() => {
      return auditores.value.length < authStore.mi_hacienda.plan.auditores
    })

    const canAddOperador = computed(() => {
      return operadores.value.length < authStore.mi_hacienda.plan.operadores
    })

    const openCreateUserModal = (userType) => {
      if (
        (userType === 'auditor' && !canAddAuditor.value) ||
        (userType === 'operador' && !canAddOperador.value)
      ) {
        snackbarStore.showSnackbar(
          `No puede agregar más ${userType}es. Limite del plan alcanzado.`,
          'error'
        )
        return
      }
      userTypeToCreate.value = userType
      createUserModalOpen.value = true
    }

    const validationErrors = ref({})

    const validateNewUser = async () => {
      validationErrors.value = {}

      if (!newUser.value.name.trim()) {
        validationErrors.value.name = 'El nombre es requerido'
      }

      if (!newUser.value.lastname.trim()) {
        validationErrors.value.lastname = 'El apellido es requerido'
      }

      if (!newUser.value.email.trim()) {
        validationErrors.value.email = 'El email es requerido'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.value.email)) {
        validationErrors.value.email = 'El email no es válido'
      } else if (!(await authStore.checkEmailTaken(newUser.value.email))) {
        validationErrors.value.email = 'Este email ya está registrado'
      }

      if (!newUser.value.username.trim()) {
        validationErrors.value.username = 'El nombre de usuario es requerido'
      } else if (!(await authStore.checkUsernameTaken(newUser.value.username))) {
        validationErrors.value.username = 'Este nombre de usuario ya está en uso'
      }

      if (!newUser.value.password.trim()) {
        validationErrors.value.password = 'La contraseña es requerida'
      } else if (newUser.value.password.length < 8) {
        validationErrors.value.password = 'La contraseña debe tener al menos 8 caracteres'
      }

      return Object.keys(validationErrors.value).length === 0
    }

    const createUser = async () => {
      if (
        (userTypeToCreate.value === 'auditor' && !canAddAuditor.value) ||
        (userTypeToCreate.value === 'operador' && !canAddOperador.value)
      ) {
        snackbarStore.showSnackbar(
          `No puede agregar más ${userTypeToCreate.value}es. Limite del plan alcanzado.`,
          'error'
        )
        return
      }

      if (await validateNewUser()) {
        try {
          await haciendaStore.createHaciendaUser({
            ...newUser.value,
            role: userTypeToCreate.value,
            hacienda: haciendaStore.mi_hacienda.id
          })
          snackbarStore.showSnackbar('Usuario creado exitosamente', 'success')
          createUserModalOpen.value = false
          newUser.value = { name: '', lastname: '', email: '', username: '', password: '' }
          await fetchHaciendaUsers()
        } catch (error) {
          snackbarStore.showSnackbar('Error al crear el usuario: ' + error.message, 'error')
        }
      }
    }

    const deleteUser = async (userId) => {
      if (confirm('¿Está seguro de que desea eliminar este usuario?')) {
        try {
          await authStore.deleteHaciendaUser(userId)
          snackbarStore.showSnackbar('Usuario eliminado exitosamente', 'success')
          await fetchHaciendaUsers()
        } catch (error) {
          snackbarStore.showSnackbar('Error al eliminar el usuario: ' + error.message, 'error')
        }
      }
    }

    // Call fetchHaciendaUsers when the component is mounted
    onMounted(() => {
      fetchHaciendaUsers()
    })
    return {
      authStore,
      fullName,
      userRole,
      profileForm,
      haciendaForm,
      isLoading,
      avatarFile,
      saveProfileChanges,
      saveHaciendaChanges,
      handleAvatarUpload,
      passwordForm,
      changePassword,
      isAdmin,
      currentPlan,
      getPlanColor,
      changePlanModalOpen,
      selectedPlan,
      availablePlans,
      openChangePlanModal,
      changePlan,
      auditores,
      operadores,
      canAddAuditor,
      canAddOperador,
      createUserModalOpen,
      userTypeToCreate,
      newUser,
      openCreateUserModal,

      validationErrors,

      createUser,
      deleteUser
    }
  }
}
</script>

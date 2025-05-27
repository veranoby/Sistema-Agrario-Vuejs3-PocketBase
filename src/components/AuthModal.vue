<template>
  <v-dialog
    v-model="dialogModel"
    max-width="600px"
    :persistent="false"
    transition="dialog-bottom-transition"
    scrollable
    @click:outside="closeDialog"
  >
    <v-card>
      <v-tabs v-model="tab" fixed-tabs hide-slider>
        <v-tab value="login" :class="tab === 'login' ? 'bg-green-lighten-1' : 'bg-white'">
          <v-icon icon="mdi-login"></v-icon> &nbsp; INGRESAR
        </v-tab>
        <v-tab value="register" :class="tab === 'register' ? 'bg-cyan-darken-1' : 'bg-white'">
          <v-icon icon="mdi-account-plus"></v-icon> &nbsp; USUARIO NUEVO
        </v-tab>
      </v-tabs>

      <v-card-text class="m-0 p-0">
        <v-window v-model="tab">
          <v-window-item value="login" class="m-0 p-0">
            <v-row class="m-0 p-0">
              <v-col class="m-0 p-0">
                <v-img :src="loginLogo" height="200" cover class="m-0 p-0"></v-img>
              </v-col>
            </v-row>
            <v-row class="m-2 p-2">
              <v-col class="m-2 p-2">
                <v-form @submit.prevent="login">
                  <!--     <v-form @submit.prevent="handleLogin"> -->
                  <v-row justify="center">
                    <v-col cols="6">
                      INGRESE POR USUARIO...
                      <v-text-field
                        v-model="loginForm.username"
                        class="pt-4"
                        label="Nombre de usuario"
                        variant="outlined"
                        required
                        color="success"
                        density="compact"
                        prepend-inner-icon="mdi-account-outline"
                        @input="loginForm.username = loginForm.username.toUpperCase()"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="6"
                      >... O POR EMAIL
                      <v-text-field
                        v-model="loginForm.email"
                        class="pt-4"
                        label="Email"
                        variant="outlined"
                        type="email"
                        required
                        color="success"
                        density="compact"
                        prepend-inner-icon="mdi-email-outline"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <v-text-field
                        v-model="loginForm.password"
                        class=""
                        label="Password"
                        variant="outlined"
                        required
                        color="success"
                        :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                        :type="visible ? 'text' : 'password'"
                        density="compact"
                        prepend-inner-icon="mdi-lock-outline"
                        @click:append-inner="visible = !visible"
                      ></v-text-field>
                    </v-col>
                  </v-row>
                  <v-row class="m-0 p-0">
                    <v-col class="m-0 p-0">
                      <v-checkbox
                        class=""
                        v-model="loginForm.rememberMe"
                        label="RECORDARME"
                      ></v-checkbox
                    ></v-col>
                    <v-col class="pt-4">
                      <a
                        class="text-caption text-decoration-none text-green"
                        href="#"
                        rel="noopener noreferrer"
                        @click.prevent="openForgotPasswordDialog"
                        ><strong class="">OLVIDO SU CONTRASEÑA?</strong></a
                      >
                    </v-col>
                  </v-row>

                  <v-btn type="submit" @click="login" color="green" block>INGRESAR</v-btn>
                </v-form>
              </v-col>
            </v-row>
          </v-window-item>

          <v-window-item value="register" class="m-0 p-0">
            <v-row class="m-0 p-0">
              <v-col class="m-0 p-0">
                <v-img :src="registerLogo" height="200" cover class="m-0 p-0"></v-img>
              </v-col>
            </v-row>
            <v-row class="m-2 p-2">
              <v-col class="m-2 p-2">
                <v-form @submit.prevent="register">
                  <v-row justify="center" v-if="!authStore.registrationSuccess">
                    <v-col cols="12"> REGISTRESE POR FAVOR.. </v-col>
                    <v-col cols="6">
                      <v-text-field
                        v-model="registerForm.username"
                        class="p-0"
                        label="Nombre de usuario"
                        variant="outlined"
                        required
                        :error="v$.username.$error"
                        :error-messages="v$.username.$errors.map((e) => e.$message)"
                        color="primary"
                        density="compact"
                        prepend-inner-icon="mdi-account-circle-outline"
                        @input="handleNameInput('username')"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="6">
                      <v-text-field
                        v-model="registerForm.email"
                        class="p-0"
                        label="Email"
                        variant="outlined"
                        type="email"
                        required
                        :error-messages="v$.email.$errors.map((e) => e.$message)"
                        color="primary"
                        density="compact"
                        prepend-inner-icon="mdi-email-outline"
                        @input="validateEmail"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="6">
                      <v-text-field
                        v-model="registerForm.firstname"
                        class="p-0"
                        label="Nombre"
                        variant="outlined"
                        required
                        :error-messages="v$.firstname.$errors.map((e) => e.$message)"
                        :error="v$.firstname.$error"
                        color="primary"
                        density="compact"
                        prepend-inner-icon="mdi-card-account-details-outline"
                        @input="handleNameInput('firstname')"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="6">
                      <v-text-field
                        v-model="registerForm.lastname"
                        class="p-0"
                        label="Apellido"
                        variant="outlined"
                        required
                        :error-messages="v$.lastname.$errors.map((e) => e.$message)"
                        :error="v$.lastname.$error"
                        color="primary"
                        density="compact"
                        prepend-inner-icon="mdi-card-account-details-outline"
                        @input="handleNameInput('lastname')"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <v-text-field
                        v-model="registerForm.hacienda"
                        class="p-0"
                        label="Hacienda"
                        variant="outlined"
                        required
                        :error-messages="v$.hacienda.$errors.map((e) => e.$message)"
                        density="compact"
                        prepend-inner-icon="mdi-home-outline"
                        @input="handleNameInput('hacienda')"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="6">
                      <v-text-field
                        v-model="registerForm.password"
                        class="p-0"
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
                    </v-col>
                    <v-col cols="6">
                      <v-text-field
                        v-model="registerForm.passwordConfirm"
                        class="p-0"
                        label="Confirm Password"
                        variant="outlined"
                        required
                        :error-messages="v$.passwordConfirm.$errors.map((e) => e.$message)"
                        color="primary"
                        :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                        :type="visible ? 'text' : 'password'"
                        density="compact"
                        prepend-inner-icon="mdi-lock-check-outline"
                        @input="v$.passwordConfirm.$touch()"
                        @click:append-inner="visible = !visible"
                      ></v-text-field>
                    </v-col>
                    <v-btn type="submit" @click="register" color="blue" block :disabled="!formValid"
                      >REGISTRARME</v-btn
                    >
                  </v-row>
                  <v-row justify="center" no-gutters v-else>
                    <v-col cols="12"
                      ><br />
                      <h3 class="text-center text-primary">¡Registro exitoso!</h3>
                      <br />
                      <p class="text-center text-sm">
                        Por favor, revise su correo electrónico para confirmar su cuenta.
                      </p>
                      <br />
                    </v-col>
                    <v-btn @click="closeModalAndNavigate" color="primary" size="small" block>
                      Verificar Email
                    </v-btn>
                  </v-row>
                </v-form>
              </v-col>
            </v-row>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>

  <!-- Modal de recuperación de contraseña -->
  <v-dialog v-model="forgotPasswordDialog" max-width="500px" transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar color="success" dark>
        <v-toolbar-title>Recuperar Contraseña</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="forgotPasswordDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pt-6">
        <div v-if="!passwordResetSent">
          <p class="text-body-1 mb-4">
            Ingrese su correo electrónico y le enviaremos un enlace para restablecer su contraseña.
          </p>

          <v-form @submit.prevent="sendPasswordReset" ref="resetForm">
            <v-text-field
              v-model="resetEmail"
              label="Email"
              variant="outlined"
              type="email"
              required
              :rules="[
                (v) => !!v || 'Email es requerido',
                (v) => /.+@.+\..+/.test(v) || 'Email debe ser válido'
              ]"
              color="success"
              density="compact"
              prepend-inner-icon="mdi-email-outline"
              class="mb-4"
            ></v-text-field>

            <v-alert v-if="resetError" type="error" variant="tonal" class="mb-4" density="compact">
              {{ resetError }}
            </v-alert>

            <v-btn
              type="submit"
              color="success"
              block
              :loading="resetLoading"
              :disabled="!resetEmail || resetLoading"
            >
              Enviar Enlace de Recuperación
            </v-btn>
          </v-form>
        </div>

        <div v-else class="text-center py-6">
          <v-icon color="success" size="64" class="mb-4">mdi-email-check-outline</v-icon>
          <h3 class="text-h5 mb-2">¡Correo Enviado!</h3>
          <p class="text-body-1 mb-6">
            Hemos enviado un enlace de recuperación a <strong>{{ resetEmail }}</strong
            >. Por favor revise su bandeja de entrada y siga las instrucciones.
          </p>
          <v-btn color="success" @click="forgotPasswordDialog = false"> Entendido </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
//import { ref, computed, watch } from 'vue'
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/authStore'

import { useValidationStore } from '../stores/validationStore'

import { useSnackbarStore } from '../stores/snackbarStore'
import loginLogo from '../assets/login-logo.png'
import registerLogo from '../assets/register-logo.png'
import { useVuelidate } from '@vuelidate/core'
import { required, email, minLength, sameAs, helpers } from '@vuelidate/validators'
import { useSyncStore } from '@/stores/syncStore'
import { debounce } from 'lodash'
import { useRouter } from 'vue-router'

const props = defineProps({
  isOpen: Boolean,
  initialTab: {
    type: String,
    default: 'login'
  }
})

const emit = defineEmits(['update:isOpen', 'loginSuccess', 'HandleDrawer'])

const authStore = useAuthStore()
const validationStore = useValidationStore()
const snackbarStore = useSnackbarStore()
const tab = ref(props.initialTab)
const visible = ref(false)
const usernameAvailable = ref(true)
const emailAvailable = ref(true)
const haciendaAvailable = ref(true)
const syncStore = useSyncStore()
const router = useRouter()

const dialogModel = computed({
  get: () => props.isOpen,
  set: (value) => emit('update:isOpen', value)
})

const loginForm = ref({
  username: '',
  email: '',
  password: '',
  rememberMe: false
})

onMounted(() => {
  const rememberedUserData = syncStore.loadFromLocalStorage('rememberedUser');
  if (rememberedUserData) {
    loginForm.value.username = rememberedUserData.username || '';
    loginForm.value.email = rememberedUserData.email || '';
    loginForm.value.rememberMe = true;
    console.log('[AUTHMODAL] Pre-filled login form with remembered user:', rememberedUserData);
  }
});

const registerForm = ref({
  username: '',
  email: '',
  firstname: '',
  lastname: '',
  password: '',
  passwordConfirm: '',
  hacienda: ''
})

const rules = {
  username: {
    required: helpers.withMessage('El nombre de usuario es requerido', required),
    noSpecialChars: helpers.withMessage(
      'No se permiten caracteres especiales',
      (value) => !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(value)
    )
  },
  email: {
    required: helpers.withMessage('El email es requerido', required),
    email: helpers.withMessage('Debe ser un email válido', (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    )
  },
  firstname: {
    required: helpers.withMessage('El nombre es requerido', required),
    noSpecialChars: helpers.withMessage(
      'No se permiten caracteres especiales',
      (value) => !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(value)
    )
  },
  lastname: {
    required: helpers.withMessage('El apellido es requerido', required),
    noSpecialChars: helpers.withMessage(
      'No se permiten caracteres especiales',
      (value) => !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(value)
    )
  },
  password: { required, minLength: minLength(8) },
  passwordConfirm: {
    required,
    sameAsPassword: sameAs(computed(() => registerForm.value.password))
  },
  hacienda: {
    required: helpers.withMessage('El apellido es requerido', required),
    noSpecialChars: helpers.withMessage(
      'No se permiten caracteres especiales',
      (value) => !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(value)
    )
  }
}

const v$ = useVuelidate(rules, registerForm)

const formValid = computed(() => {
  return (
    !v$.value.$invalid && usernameAvailable.value && emailAvailable.value && haciendaAvailable.value
  )
})

const checkFields = async () => {
  try {
    const validationResults = await validationStore.checkFieldsTaken([
      { collection: 'users', field: 'username', value: registerForm.value.username.toUpperCase() },
      { collection: 'users', field: 'email', value: registerForm.value.email },
      { collection: 'Haciendas', field: 'name', value: registerForm.value.hacienda.toUpperCase() }
    ])

    usernameAvailable.value = validationResults.username
    emailAvailable.value = validationResults.email
    haciendaAvailable.value = validationResults.name

    return validationResults.username && validationResults.email && validationResults.name
  } catch (error) {
    console.error('Error checking fields:', error)
    return false
  }
}

const register = async () => {
  const isValid = await v$.value.$validate()
  if (!isValid) {
    snackbarStore.showSnackbar('Por favor corrija los errores en el formulario', 'error')
    return
  }

  try {
    // Verificar disponibilidad de campos solo al submit
    const fieldsAvailable = await validationStore.checkFieldsTaken([
      {
        collection: 'users',
        field: 'username',
        value: registerForm.value.username.toUpperCase()
      },
      {
        collection: 'users',
        field: 'email',
        value: registerForm.value.email
      },
      {
        collection: 'Haciendas',
        field: 'name',
        value: registerForm.value.hacienda.toUpperCase()
      }
    ])

    // Mostrar errores específicos
    if (!fieldsAvailable.username) {
      snackbarStore.showSnackbar('El nombre de usuario ya está en uso', 'error')
      return
    }
    if (!fieldsAvailable.email) {
      snackbarStore.showSnackbar('El email ya está registrado', 'error')
      return
    }
    if (!fieldsAvailable.name) {
      snackbarStore.showSnackbar('El nombre de la hacienda ya existe', 'error')
      return
    }

    const registrationData = {
      username: registerForm.value.username,
      email: registerForm.value.email,
      firstname: registerForm.value.firstname,
      lastname: registerForm.value.lastname,
      password: registerForm.value.password,
      hacienda: registerForm.value.hacienda
    }

    await authStore.register(registrationData, 'administrador')
  } catch (error) {
    console.log('Registration error from Authmodal:', error.message)
    snackbarStore.showSnackbar('Error en el registro: ' + error.message, 'error')
  }
}

const login = async () => {
  // Validar que al menos uno de los campos esté presente
  if (!loginForm.value.username && !loginForm.value.email) {
    snackbarStore.showSnackbar('Por favor ingrese su nombre de usuario o email', 'error')
    return
  }

  if (!syncStore.isOnline) {
    useSnackbarStore().showError('Se requiere conexión a internet para iniciar sesión')
    return
  }

  // Validar que el password esté presente
  if (!loginForm.value.password) {
    snackbarStore.showSnackbar('Por favor ingrese su contraseña', 'error')
    return
  }

  try {
    const success = await authStore.login(
      loginForm.value.username,
      loginForm.value.email,
      loginForm.value.password,
      loginForm.value.rememberMe
    )

    if (success) {
      emit('loginSuccess')
      dialogModel.value = false
      emit('HandleDrawer', true)
    }
  } catch (error) {
    console.log('Login error from authmodal:', error)
    snackbarStore.showSnackbar('Error al iniciar sesión. Verifique sus credenciales.', 'error')
  }
}

const closeDialog = () => {
  dialogModel.value = false
  emit('update:isOpen', false)
}

const validateEmail = () => {
  v$.value.email.$touch()
}

const handleNameInput = (field) => {
  registerForm.value[field] = registerForm.value[field].toUpperCase()
  v$.value[field].$touch()
}

const closeModalAndNavigate = () => {
  dialogModel.value = false
  router.push({ name: 'EmailConfirmation' })
}

const forgotPasswordDialog = ref(false)
const resetEmail = ref('')
const resetLoading = ref(false)
const resetError = ref('')
const passwordResetSent = ref(false)
const resetForm = ref(null)

const openForgotPasswordDialog = () => {
  resetEmail.value = loginForm.value.email || ''
  resetError.value = ''
  passwordResetSent.value = false
  forgotPasswordDialog.value = true
}

const sendPasswordReset = async () => {
  const { valid } = await resetForm.value.validate()

  if (!valid) return

  resetLoading.value = true
  resetError.value = ''

  try {
    await pb.collection('users').requestPasswordReset(resetEmail.value)
    passwordResetSent.value = true
    snackbarStore.showSnackbar('Enlace de recuperación enviado', 'success')
  } catch (error) {
    console.error('Error al solicitar recuperación de contraseña:', error)
    resetError.value = 'No pudimos procesar su solicitud. Verifique su email e intente nuevamente.'
    snackbarStore.showSnackbar('Error al enviar enlace de recuperación', 'error')
  } finally {
    resetLoading.value = false
  }
}
</script>

<style scoped></style>

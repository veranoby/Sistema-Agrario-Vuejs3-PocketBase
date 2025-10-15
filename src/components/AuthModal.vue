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
          <v-icon icon="mdi-login"></v-icon> &nbsp; {{ t('auth.login') }}
        </v-tab>
        <v-tab value="register" :class="tab === 'register' ? 'bg-cyan-darken-1' : 'bg-white'">
          <v-icon icon="mdi-account-plus"></v-icon> &nbsp; {{ t('auth.register') }}
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
                  <v-row justify="center">
                    <v-col cols="6">
                      {{ t('auth.login_by_user') }}
                      <v-text-field
                        v-model="loginForm.username"
                        class="pt-4"
                        :label="t('auth.username')"
                        variant="outlined"
                        required
                        color="success"
                        density="compact"
                        prepend-inner-icon="mdi-account-outline"
                        @input="loginForm.username = loginForm.username.toUpperCase()"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="6">
                      {{ t('auth.login_by_email') }}
                      <v-text-field
                        v-model="loginForm.email"
                        class="pt-4"
                        :label="t('auth.email')"
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
                        :label="t('auth.password')"
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
                        :label="t('auth.remember_me')"
                      ></v-checkbox>
                    </v-col>
                    <v-col class="pt-4">
                      <a
                        class="text-caption text-decoration-none text-green"
                        href="#"
                        rel="noopener noreferrer"
                        @click.prevent="openForgotPasswordDialog"
                        ><strong>{{ t('auth.forgot_password') }}</strong></a
                      >
                    </v-col>
                  </v-row>
                  <v-btn type="submit" @click="login" color="green" block>{{ t('auth.login') }}</v-btn>
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
                    <v-col cols="12"> {{ t('auth.please_register') }} </v-col>
                    <v-col cols="6">
                      <v-text-field
                        v-model="registerForm.username"
                        class="p-0"
                        :label="t('auth.username')"
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
                        :label="t('auth.email')"
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
                        :label="t('auth.firstname')"
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
                        :label="t('auth.lastname')"
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
                        :label="t('auth.hacienda')"
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
                        :label="t('auth.password')"
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
                        :label="t('auth.confirm_password')"
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
                    <v-btn type="submit" @click="register" color="blue" block :disabled="!formValid">{{
                      t('auth.register_now')
                    }}</v-btn>
                  </v-row>
                  <v-row justify="center" no-gutters v-else>
                    <v-col cols="12"
                      ><br />
                      <h3 class="text-center text-primary">{{ t('auth.registration_success_title') }}</h3>
                      <br />
                      <p class="text-center text-sm">
                        {{ t('auth.registration_success_message') }}
                      </p>
                      <br />
                    </v-col>
                    <v-btn @click="closeModalAndNavigate" color="primary" size="small" block>
                      {{ t('auth.verify_email') }}
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
        <v-toolbar-title>{{ t('auth.recover_password_title') }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="forgotPasswordDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pt-6">
        <div v-if="!passwordResetSent">
          <p class="text-body-1 mb-4">
            {{ t('auth.recover_password_instructions') }}
          </p>

          <v-form @submit.prevent="sendPasswordReset" ref="resetForm">
            <v-text-field
              v-model="resetEmail"
              :label="t('auth.email')"
              variant="outlined"
              type="email"
              required
              :rules="[
                (v) => !!v || t('auth.required_field', { field: 'Email' }),
                (v) => /.+@.+\..+/.test(v) || t('auth.invalid_email')
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
              {{ t('auth.send_recovery_link') }}
            </v-btn>
          </v-form>
        </div>

        <div v-else class="text-center py-6">
          <v-icon color="success" size="64" class="mb-4">mdi-email-check-outline</v-icon>
          <h3 class="text-h5 mb-2">{{ t('auth.email_sent_title') }}</h3>
          <p class="text-body-1 mb-6">
            {{ t('auth.email_sent_message', { email: resetEmail }) }}
          </p>
          <v-btn color="success" @click="forgotPasswordDialog = false"> {{ t('auth.got_it') }} </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
//import { ref, computed, watch, onMounted } from 'vue'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'

import { useValidationStore } from '../stores/validationStore'

import { useSnackbarStore } from '../stores/snackbarStore'
import loginLogo from '../assets/login-logo.png'
import registerLogo from '../assets/register-logo.png'
import { useVuelidate } from '@vuelidate/core'
import { required, minLength, sameAs, helpers } from '@vuelidate/validators'
//import { required, email, minLength, sameAs, helpers } from '@vuelidate/validators'
import { useSyncStore } from '@/stores/syncStore'
//import { debounce } from 'lodash'
import { useRouter } from 'vue-router'

const props = defineProps({
  isOpen: Boolean,
  initialTab: {
    type: String,
    default: 'login'
  }
})

const emit = defineEmits(['update:isOpen', 'loginSuccess', 'HandleDrawer'])
const { t } = useI18n()
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
  const rememberedUserData = syncStore.loadFromLocalStorage('rememberedUser')
  // New log to always show what was loaded, before deciding to fill
  console.log(
    '[AUTHMODAL MOUNTED] Checking for rememberedUser in localStorage. Found:',
    JSON.parse(JSON.stringify(rememberedUserData))
  )

  if (rememberedUserData && (rememberedUserData.username || rememberedUserData.email)) {
    // Ensure there's actually data to fill
    console.log(
      '[AUTHMODAL MOUNTED] Pre-filling login form with rememberedUser data:',
      JSON.parse(JSON.stringify(rememberedUserData))
    )
    loginForm.value.username = rememberedUserData.username || ''
    loginForm.value.email = rememberedUserData.email || ''
    loginForm.value.rememberMe = true // If we found data, assume rememberMe was true when it was saved
  } else {
    console.log(
      '[AUTHMODAL MOUNTED] No valid rememberedUser data found, form will not be pre-filled by rememberedUser logic.'
    )
    // Explicitly clear the fields if no rememberedUser data, to counteract potential stale state
    // if the modal is re-used without full re-creation.
    // loginForm.value.username = ''; // Consider if this is too aggressive or if default empty state is fine
    // loginForm.value.email = '';
    // loginForm.value.rememberMe = false;
  }
})

const registerForm = ref({
  username: '',
  email: '',
  firstname: '',
  lastname: '',
  password: '',
  passwordConfirm: '',
  hacienda: ''
})

const rules = computed(() => ({
  username: {
    required: helpers.withMessage(t('auth.required_field', { field: t('auth.username') }), required),
    noSpecialChars: helpers.withMessage(
      t('auth.no_special_chars'),
      (value) => !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(value)
    )
  },
  email: {
    required: helpers.withMessage(t('auth.required_field', { field: t('auth.email') }), required),
    email: helpers.withMessage(t('auth.invalid_email'), (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    )
  },
  firstname: {
    required: helpers.withMessage(t('auth.required_field', { field: t('auth.firstname') }), required),
    noSpecialChars: helpers.withMessage(
      t('auth.no_special_chars'),
      (value) => !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(value)
    )
  },
  lastname: {
    required: helpers.withMessage(t('auth.required_field', { field: t('auth.lastname') }), required),
    noSpecialChars: helpers.withMessage(
      t('auth.no_special_chars'),
      (value) => !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(value)
    )
  },
  password: { required, minLength: minLength(8) },
  passwordConfirm: {
    required,
    sameAsPassword: sameAs(computed(() => registerForm.value.password))
  },
  hacienda: {
    required: helpers.withMessage(t('auth.required_field', { field: t('auth.hacienda') }), required),
    noSpecialChars: helpers.withMessage(
      t('auth.no_special_chars'),
      (value) => !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(value)
    )
  }
}));

const v$ = useVuelidate(rules, registerForm);

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
    snackbarStore.showSnackbar(t('auth.registration_error', { message: 'Please correct the errors in the form' }), 'error')
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
      snackbarStore.showSnackbar(t('auth.username_in_use'), 'error')
      return
    }
    if (!fieldsAvailable.email) {
      snackbarStore.showSnackbar(t('auth.email_in_use'), 'error')
      return
    }
    if (!fieldsAvailable.name) {
      snackbarStore.showSnackbar(t('auth.hacienda_in_use'), 'error')
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
    snackbarStore.showSnackbar(t('auth.registration_error', { message: error.message }), 'error')
  }
}

const login = async () => {
  // Validar que al menos uno de los campos esté presente
  if (!loginForm.value.username && !loginForm.value.email) {
    snackbarStore.showSnackbar(t('auth.enter_username_or_email'), 'error')
    return
  }

  if (!syncStore.isOnline) {
    useSnackbarStore().showError('Se requiere conexión a internet para iniciar sesión')
    return
  }

  // Validar que el password esté presente
  if (!loginForm.value.password) {
    snackbarStore.showSnackbar(t('auth.enter_password'), 'error')
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
    snackbarStore.showSnackbar(t('auth.login_error'), 'error')
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

// Reemplazar el método actual con:
const sendPasswordReset = async () => {
  const { valid } = await resetForm.value.validate()
  if (!valid) return

  resetLoading.value = true
  resetError.value = ''

  try {
    await authStore.requestPasswordReset(resetEmail.value)
    passwordResetSent.value = true
    snackbarStore.showSnackbar(t('auth.send_recovery_link'), 'success')
  } catch (error) {
    resetError.value = t('auth.recover_password_error')
  } finally {
    resetLoading.value = false
  }
}
</script>

<style scoped></style>

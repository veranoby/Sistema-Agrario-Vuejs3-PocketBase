<template>
  <v-dialog
    v-model="dialogModel"
    max-width="600px"
    :persistent="false"
    transition="dialog-bottom-transition"
    scrollable
    role="dialog"
    aria-modal="true"
    aria-labelledby="auth-dialog-title"
    @click:outside="closeDialog"
    @keydown.esc="closeDialog"
  >
    <v-card class="rounded-xl overflow-hidden elevation-10">
      <v-row no-gutters>
        <!-- Columna Izquierda: Arte y Branding -->
        <v-col cols="12" md="5" class="bg-primary d-none d-md-flex align-center justify-center position-relative">
          <div class="position-absolute w-100 h-100 bg-black opacity-20"></div>
          <v-img :src="loginLogo" cover class="position-absolute w-100 h-100" style="opacity: 0.15;"></v-img>
          <div class="pa-8 text-center position-relative" style="z-index: 2;">
            <v-icon icon="mdi-leaf" size="64" color="white" class="mb-4"></v-icon>
            <h2 class="text-h4 font-weight-bold mb-4 text-white">ConAgri</h2>
            <p class="text-body-1 text-white opacity-90">Plataforma integral inteligente para la gestión y precisión del ecosistema agrícola.</p>
          </div>
        </v-col>

        <!-- Columna Derecha: Formularios -->
        <v-col cols="12" md="7" class="bg-white">
          <v-card-text class="pa-6 pa-md-10 h-100 d-flex flex-column justify-center">
            <v-window v-model="tab" :touch="false">
              <!-- VISTA DE LOGIN -->
              <v-window-item value="login">
                <div class="text-center mb-8">
                  <h3 class="text-h5 font-weight-bold text-grey-darken-4 mb-2">{{ t('auth.login') }}</h3>
                  <p class="text-body-2 text-grey-darken-1">Ingresa tus credenciales para acceder a tu panel</p>
                </div>
                
                <v-form @submit.prevent="login" aria-label="Formulario de inicio de sesión">
                  <v-row dense>
                    <v-col cols="12">
                      <label :for="usernameInputId" class="text-caption font-weight-bold text-grey-darken-2 ml-1">{{ t('auth.login_by_user') }}</label>
                      <v-text-field
                        v-model="loginForm.username"
                        :id="usernameInputId"
                        class="mt-1"
                        :label="t('auth.username')"
                        variant="outlined"
                        required
                        color="primary"
                        density="compact"
                        prepend-inner-icon="mdi-account-outline"
                        @input="loginForm.username = loginForm.username.toUpperCase()"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <label :for="emailInputId" class="text-caption font-weight-bold text-grey-darken-2 ml-1">{{ t('auth.login_by_email') }}</label>
                      <v-text-field
                        v-model="loginForm.email"
                        :id="emailInputId"
                        class="mt-1"
                        :label="t('auth.email')"
                        variant="outlined"
                        type="email"
                        required
                        color="primary"
                        density="compact"
                        prepend-inner-icon="mdi-email-outline"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <v-text-field
                        v-model="loginForm.password"
                        :id="passwordInputId"
                        :label="t('auth.password')"
                        variant="outlined"
                        required
                        color="primary"
                        :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                        :type="visible ? 'text' : 'password'"
                        density="compact"
                        prepend-inner-icon="mdi-lock-outline"
                        @click:append-inner="visible = !visible"
                      ></v-text-field>
                    </v-col>
                  </v-row>

                  <div class="d-flex align-center justify-space-between mt-1 mb-6">
                    <v-checkbox
                      v-model="loginForm.rememberMe"
                      :label="t('auth.remember_me')"
                      color="primary"
                      density="compact"
                      hide-details
                      class="text-body-2"
                    ></v-checkbox>
                    <a
                      class="text-caption font-weight-bold text-primary text-decoration-none cursor-pointer"
                      @click.prevent="openForgotPasswordDialog"
                      tabindex="0"
                    >
                      {{ t('auth.forgot_password') }}
                    </a>
                  </div>

                  <v-btn type="submit" color="primary" block size="large" class="text-button font-weight-bold rounded-lg mb-6" :loading="uiFeedbackStore.globalLoading">
                    {{ t('auth.login') }}
                  </v-btn>

                  <div class="text-center">
                    <p class="text-body-2 text-grey-darken-1">
                      ¿No tienes cuenta? 
                      <a @click.prevent="tab = 'register'" class="text-primary font-weight-bold text-decoration-none cursor-pointer">
                        Regístrate aquí
                      </a>
                    </p>
                  </div>
                </v-form>
              </v-window-item>
              <!-- VISTA DE REGISTRO -->
              <v-window-item value="register">
                <div class="text-center mb-6">
                  <h3 class="text-h5 font-weight-bold text-grey-darken-4 mb-2">{{ t('auth.register') }}</h3>
                  <p class="text-body-2 text-grey-darken-1">Crea tu cuenta y únete a la red inteligente</p>
                </div>
                
                <v-form @submit.prevent="register">
                  <v-row justify="center" v-if="!authStore.registrationSuccess" dense>
                    <v-col cols="12" class="text-center mb-2">
                      <v-btn-toggle v-model="accountType" color="primary" mandatory variant="outlined" class="w-100 d-flex rounded-lg">
                        <v-btn value="hacienda" class="flex-grow-1 text-caption font-weight-bold">
                          <v-icon start>mdi-home-silo</v-icon> Hacienda
                        </v-btn>
                        <v-btn value="asesor" class="flex-grow-1 text-caption font-weight-bold">
                          <v-icon start>mdi-account-hard-hat</v-icon> Asesor
                        </v-btn>
                      </v-btn-toggle>
                      
                      <v-alert v-if="accountType === 'asesor'" type="warning" variant="tonal" class="mt-3 text-left text-caption" density="compact" icon="mdi-cash">
                        El perfil de Asesor Técnico tiene un costo de $5.00/mes.
                        Completa tu registro y envía tu comprobante.
                      </v-alert>
                    </v-col>
                    
                    <v-col cols="12" class="pb-0">
                      <label class="text-caption font-weight-bold text-grey-darken-2 ml-1">{{ t('auth.username') }}</label>
                      <v-text-field
                        v-model="registerForm.username"
                        class="mt-1"
                        :label="t('auth.username')"
                        variant="outlined"
                        required
                        :error="v$.username.$error || (usernameChecked && !usernameAvailable)"
                        :error-messages="[
                          ...v$.username.$errors.map((e) => e.$message),
                          ...(usernameChecked && !usernameAvailable ? [t('auth.username_in_use')] : [])
                        ]"
                        color="primary"
                        density="compact"
                        prepend-inner-icon="mdi-account-circle-outline"
                        :loading="checkingUsername"
                      >
                        <template v-if="usernameChecked && usernameAvailable && !checkingUsername" v-slot:append-inner>
                          <v-icon color="success">mdi-check-circle</v-icon>
                        </template>
                      </v-text-field>
                    </v-col>

                    <v-col cols="12" class="pb-0">
                      <label class="text-caption font-weight-bold text-grey-darken-2 ml-1">{{ t('auth.email') }}</label>
                      <v-text-field
                        v-model="registerForm.email"
                        class="mt-1"
                        :label="t('auth.email')"
                        variant="outlined"
                        type="email"
                        required
                        :error="v$.email.$error || (emailChecked && !emailAvailable)"
                        :error-messages="[
                          ...v$.email.$errors.map((e) => e.$message),
                          ...(emailChecked && !emailAvailable ? [t('auth.email_in_use')] : [])
                        ]"
                        color="primary"
                        density="compact"
                        prepend-inner-icon="mdi-email-outline"
                        :loading="checkingEmail"
                      >
                        <template v-if="emailChecked && emailAvailable && !checkingEmail" v-slot:append-inner>
                          <v-icon color="success">mdi-check-circle</v-icon>
                        </template>
                      </v-text-field>
                    </v-col>

                    <v-col cols="12" class="pb-0">
                      <v-text-field
                        v-model="registerForm.firstname"
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

                    <v-col cols="12" class="pb-0">
                      <v-text-field
                        v-model="registerForm.lastname"
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

                    <v-col cols="12" v-if="accountType === 'hacienda'" class="pb-0">
                      <label class="text-caption font-weight-bold text-grey-darken-2 ml-1">{{ t('auth.hacienda') }}</label>
                      <v-text-field
                        v-model="registerForm.hacienda"
                        class="mt-1"
                        :label="t('auth.hacienda')"
                        variant="outlined"
                        required
                        :error="v$.hacienda.$error || (haciendaChecked && !haciendaAvailable)"
                        :error-messages="[
                          ...v$.hacienda.$errors.map((e) => e.$message),
                          ...(haciendaChecked && !haciendaAvailable ? [t('auth.hacienda_in_use')] : [])
                        ]"
                        density="compact"
                        prepend-inner-icon="mdi-home-outline"
                        :loading="checkingHacienda"
                      >
                        <template v-if="haciendaChecked && haciendaAvailable && !checkingHacienda" v-slot:append-inner>
                          <v-icon color="success">mdi-check-circle</v-icon>
                        </template>
                      </v-text-field>
                    </v-col>

                    <template v-if="accountType === 'asesor'">
                      <v-col cols="12" class="pb-0">
                        <v-text-field
                          v-model="registerForm.numero_colegiatura"
                          label="Nro. de Colegiatura SENESCYT"
                          variant="outlined"
                          required
                          :error-messages="v$.numero_colegiatura.$errors.map((e) => e.$message)"
                          color="primary"
                          density="compact"
                          prepend-inner-icon="mdi-badge-account-horizontal-outline"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" class="pb-0">
                        <v-select
                          v-model="registerForm.especialidades"
                          :items="ESPECIALIDADES_ASESOR"
                          label="Especialidades"
                          multiple
                          chips
                          variant="outlined"
                          required
                          :error-messages="v$.especialidades.$errors.map((e) => e.$message)"
                          color="primary"
                          density="compact"
                          prepend-inner-icon="mdi-sprout-outline"
                        ></v-select>
                      </v-col>
                      <v-col cols="12" class="pb-0">
                        <v-select
                          v-model="registerForm.zonas_cobertura"
                          :items="PROVINCIAS_ECUADOR"
                          label="Provincias de Cobertura"
                          multiple
                          chips
                          variant="outlined"
                          required
                          :error-messages="v$.zonas_cobertura.$errors.map((e) => e.$message)"
                          color="primary"
                          density="compact"
                          prepend-inner-icon="mdi-map-marker-outline"
                        ></v-select>
                      </v-col>
                      <v-col cols="12" class="pb-0">
                        <v-textarea
                          v-model="registerForm.bio_corta"
                          label="Biografía Corta (Opcional)"
                          variant="outlined"
                          rows="2"
                          maxlength="280"
                          counter
                          color="primary"
                          density="compact"
                          prepend-inner-icon="mdi-text-box-outline"
                        ></v-textarea>
                      </v-col>
                    </template>

                    <v-col cols="12" class="pb-0">
                      <v-text-field
                        v-model="registerForm.password"
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
                      <v-progress-linear
                        v-if="registerForm.password"
                        :model-value="passwordStrength"
                        :color="strengthColor"
                        :height="4"
                        rounded
                        class="mt-1"
                      ></v-progress-linear>
                      <p v-if="registerForm.password" class="text-caption mt-1" :class="`text-${strengthColor}`">
                        {{ strengthLabel }}
                      </p>
                    </v-col>

                    <v-col cols="12" class="pb-0">
                      <v-text-field
                        v-model="registerForm.passwordConfirm"
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

                    <v-col cols="12" class="mt-4">
                      <v-btn type="submit" color="primary" block size="large" class="text-button font-weight-bold rounded-lg" :disabled="!formValid" :loading="uiFeedbackStore.globalLoading">
                        {{ t('auth.register_now') }}
                      </v-btn>
                    </v-col>

                    <v-col cols="12" class="text-center mt-2">
                      <p class="text-body-2 text-grey-darken-1">
                        ¿Ya tienes cuenta? 
                        <a @click.prevent="tab = 'login'" class="text-primary font-weight-bold text-decoration-none cursor-pointer">
                          Inicia sesión aquí
                        </a>
                      </p>
                    </v-col>
                  </v-row>

                  <v-row justify="center" align="center" class="h-100" no-gutters v-else>
                    <v-col cols="12" class="text-center">
                      <v-icon icon="mdi-check-circle" color="success" size="64" class="mb-4"></v-icon>
                      <h3 class="text-h5 font-weight-bold text-primary mb-2">{{ t('auth.registration_success_title') }}</h3>
                      <p class="text-body-2 text-grey-darken-1 mb-6">
                        {{ t('auth.registration_success_message') }}
                      </p>
                      <v-btn @click="closeModalAndNavigate" color="primary" size="large" class="rounded-lg font-weight-bold" block>
                        {{ t('auth.verify_email') }}
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-form>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-col>
      </v-row>
    </v-card>
  </v-dialog>

  <!-- Modal de recuperación de contraseña -->
  <v-dialog v-model="forgotPasswordDialog" max-width="500px" transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar color="primary" dark>
        <v-toolbar-title>{{ t('auth.recover_password_title') }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="forgotPasswordDialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-toolbar>

      <v-card-text class="pt-6">
        <div v-if="!passwordResetSent">
          <p class="  mb-4">
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
              color="primary"
              density="compact"
              prepend-inner-icon="mdi-email-outline"
              class="mb-4"
            ></v-text-field>

            <v-alert v-if="resetError" type="error" variant="tonal" class="mb-4" density="compact">
              {{ resetError }}
            </v-alert>

            <v-btn
              type="submit"
              color="primary"
              block
              :loading="resetLoading"
              :disabled="!resetEmail || resetLoading"
            >
              {{ t('auth.send_recovery_link') }}
            </v-btn>
          </v-form>
        </div>

        <div v-else class="text-center py-6">
          <v-icon color="primary" size="64" class="mb-4">mdi-email-check-outline</v-icon>
          <h3 class="text-md mb-2">{{ t('auth.email_sent_title') }}</h3>
          <p class="  mb-6">
            {{ t('auth.email_sent_message', { email: resetEmail }) }}
          </p>
          <v-btn color="primary" @click="forgotPasswordDialog = false"> {{ t('auth.got_it') }} </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/authStore'

import { useValidation } from '@/composables/useValidation'

import { useUiFeedbackStore } from '@/stores/uiFeedbackStore'
import loginLogo from '@/assets/login-logo.png'
import registerLogo from '@/assets/register-logo.png'
import { useVuelidate } from '@vuelidate/core'
import { required, minLength, sameAs, helpers } from '@vuelidate/validators'
import { useSyncStore } from '@/stores/sync'
import { debounce } from '@/utils/debounce'
import { useRouter } from 'vue-router'
import { calculatePasswordStrength, getPasswordStrengthColor, getPasswordStrengthLabel } from '@/utils/validators/index'

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
const { checkFieldsTaken, loading: validationLoading } = useValidation()
const uiFeedbackStore = useUiFeedbackStore()
const tab = ref(props.initialTab)
const visible = ref(false)
const usernameAvailable = ref(true)
const emailAvailable = ref(true)
const haciendaAvailable = ref(true)
const syncStore = useSyncStore()
const router = useRouter()

// Estado para validación en tiempo real
const checkingUsername = ref(false)
const checkingEmail = ref(false)
const checkingHacienda = ref(false)
const usernameChecked = ref(false)
const emailChecked = ref(false)
const haciendaChecked = ref(false)

// Store debounced function references for cleanup
let debouncedUsernameCheck = null
let debouncedEmailCheck = null
let debouncedHaciendaCheck = null

const accountType = ref('hacienda') // 'hacienda' | 'asesor'
const PROVINCIAS_ECUADOR = ["Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo de los Tsáchilas", "Sucumbíos", "Tungurahua", "Zamora Chinchipe"]
const ESPECIALIDADES_ASESOR = ["Banano", "Cacao", "Suelos", "Flores", "Frutales","Pitahaya","Riego", "Cítricos", "Hortalizas", "Ganadería", "Otro"]

const dialogModel = computed({
  get: () => props.isOpen,
  set: (value) => emit('update:isOpen', value)
})

// Unique IDs for accessibility
const usernameInputId = `username-input-${Date.now()}`
const emailInputId = `email-input-${Date.now()}`
const passwordInputId = `password-input-${Date.now()}`

const loginForm = ref({
  username: '',
  email: '',
  password: '',
  rememberMe: false
})

onMounted(async () => {
  const rememberedUserData = await syncStore.loadFromLocalStorage('rememberedUser')
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
  hacienda: '',
  numero_colegiatura: '',
  especialidades: [],
  zonas_cobertura: [],
  bio_corta: ''
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
    required: helpers.withMessage(t('auth.required_field', { field: t('auth.hacienda') }), (val) => accountType.value === 'asesor' || !!val),
    noSpecialChars: helpers.withMessage(
      t('auth.no_special_chars'),
      (value) => accountType.value === 'asesor' || !/["'`!@#$%^&*()+=<>?\/\\{}[\]|~:;]/.test(value)
    )
  },
  numero_colegiatura: {
    required: helpers.withMessage(t('auth.required_field', { field: 'Nro. Colegiatura' }), (val) => accountType.value === 'hacienda' || !!val)
  },
  especialidades: {
    required: helpers.withMessage(t('auth.required_field', { field: 'Especialidades' }), (val) => accountType.value === 'hacienda' || val.length > 0)
  },
  zonas_cobertura: {
    required: helpers.withMessage(t('auth.required_field', { field: 'Zonas de cobertura' }), (val) => accountType.value === 'hacienda' || val.length > 0)
  }
}));

const v$ = useVuelidate(rules, registerForm);

const formValid = computed(() => {
  return (
    !v$.value.$invalid && usernameAvailable.value && emailAvailable.value && haciendaAvailable.value
  )
})

// Password strength calculation (using shared utility)
const passwordStrength = computed(() =>
  calculatePasswordStrength(registerForm.value.password)
)

const strengthColor = computed(() =>
  getPasswordStrengthColor(passwordStrength.value)
)

const strengthLabel = computed(() =>
  getPasswordStrengthLabel(passwordStrength.value, t)
)

const checkFields = async () => {
  try {
    const validationResults = await checkFieldsTaken([
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

// Funciones debounced para validación en tiempo real
const checkUsernameAvailability = debounce(async (username) => {
  if (!username || username.length < 3) {
    usernameAvailable.value = true
    usernameChecked.value = false
    return
  }

  checkingUsername.value = true
  try {
    const result = await checkFieldsTaken([
      { collection: 'users', field: 'username', value: username.toUpperCase() }
    ])
    usernameAvailable.value = result.username
    usernameChecked.value = true
  } catch (error) {
    console.error('Error checking username:', error)
  } finally {
    checkingUsername.value = false
  }
}, 500)

const checkEmailAvailability = debounce(async (email) => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailAvailable.value = true
    emailChecked.value = false
    return
  }

  checkingEmail.value = true
  try {
    const result = await checkFieldsTaken([
      { collection: 'users', field: 'email', value: email }
    ])
    emailAvailable.value = result.email
    emailChecked.value = true
  } catch (error) {
    console.error('Error checking email:', error)
  } finally {
    checkingEmail.value = false
  }
}, 500)

const checkHaciendaAvailability = debounce(async (hacienda) => {
  if (!hacienda || hacienda.length < 3) {
    haciendaAvailable.value = true
    haciendaChecked.value = false
    return
  }

  checkingHacienda.value = true
  try {
    const result = await checkFieldsTaken([
      { collection: 'Haciendas', field: 'name', value: hacienda.toUpperCase() }
    ])
    haciendaAvailable.value = result.name
    haciendaChecked.value = true
  } catch (error) {
    console.error('Error checking hacienda:', error)
  } finally {
    checkingHacienda.value = false
  }
}, 500)

// Store references for cleanup
debouncedUsernameCheck = checkUsernameAvailability
debouncedEmailCheck = checkEmailAvailability
debouncedHaciendaCheck = checkHaciendaAvailability

// Cleanup on unmount
onUnmounted(() => {
  if (debouncedUsernameCheck) debouncedUsernameCheck.cancel()
  if (debouncedEmailCheck) debouncedEmailCheck.cancel()
  if (debouncedHaciendaCheck) debouncedHaciendaCheck.cancel()
})

// Watchers para validación en tiempo real
watch(() => registerForm.value.username, (newUsername) => {
  if (newUsername) {
    const upperUsername = newUsername.toUpperCase()
    registerForm.value.username = upperUsername
    checkUsernameAvailability(upperUsername)
  }
})

watch(() => registerForm.value.email, (newEmail) => {
  checkEmailAvailability(newEmail)
})

watch(() => registerForm.value.hacienda, (newHacienda) => {
  if (newHacienda) {
    const upperHacienda = newHacienda.toUpperCase()
    registerForm.value.hacienda = upperHacienda
    checkHaciendaAvailability(upperHacienda)
  }
})

const register = async () => {
  const isValid = await v$.value.$validate()
  if (!isValid) {
    uiFeedbackStore.showSnackbar(t('auth.registration_error', { message: 'Please correct the errors in the form' }), 'error')
    return
  }

  try {
    // Verificar disponibilidad de campos solo al submit
    const fieldsToCheck = [
      {
        collection: 'users',
        field: 'username',
        value: registerForm.value.username.toUpperCase()
      },
      {
        collection: 'users',
        field: 'email',
        value: registerForm.value.email
      }
    ]
    
    if (accountType.value === 'hacienda') {
      fieldsToCheck.push({
        collection: 'Haciendas',
        field: 'name',
        value: registerForm.value.hacienda.toUpperCase()
      })
    }

    const fieldsAvailable = await checkFieldsTaken(fieldsToCheck)

    // Mostrar errores específicos
    if (!fieldsAvailable.username) {
      uiFeedbackStore.showSnackbar(t('auth.username_in_use'), 'error')
      return
    }
    if (!fieldsAvailable.email) {
      uiFeedbackStore.showSnackbar(t('auth.email_in_use'), 'error')
      return
    }
    if (accountType.value === 'hacienda' && !fieldsAvailable.name) {
      uiFeedbackStore.showSnackbar(t('auth.hacienda_in_use'), 'error')
      return
    }

    const registrationData = {
      username: registerForm.value.username,
      email: registerForm.value.email,
      firstname: registerForm.value.firstname,
      lastname: registerForm.value.lastname,
      password: registerForm.value.password,
      hacienda: registerForm.value.hacienda,
      numero_colegiatura: registerForm.value.numero_colegiatura,
      especialidades: registerForm.value.especialidades,
      zonas_cobertura: registerForm.value.zonas_cobertura,
      bio_corta: registerForm.value.bio_corta
    }

    if (accountType.value === 'asesor') {
      await authStore.registerAsesor(registrationData)
    } else {
      await authStore.register(registrationData, 'administrador')
    }
  } catch (error) {
    console.log('Registration error from Authmodal:', error.message)
    uiFeedbackStore.showSnackbar(t('auth.registration_error', { message: error.message }), 'error')
  }
}

const login = async () => {
  // Validar que al menos uno de los campos esté presente
  if (!loginForm.value.username && !loginForm.value.email) {
    uiFeedbackStore.showSnackbar(t('auth.enter_username_or_email'), 'error')
    return
  }

  if (!syncStore.isOnline) {
    useUiFeedbackStore().showError('Se requiere conexión a internet para iniciar sesión')
    return
  }

  // Validar que el password esté presente
  if (!loginForm.value.password) {
    uiFeedbackStore.showSnackbar(t('auth.enter_password'), 'error')
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
    uiFeedbackStore.showSnackbar(t('auth.login_error'), 'error')
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
    uiFeedbackStore.showSnackbar(t('auth.send_recovery_link'), 'success')
  } catch (error) {
    resetError.value = t('auth.recover_password_error')
  } finally {
    resetLoading.value = false
  }
}
</script>

<style scoped></style>

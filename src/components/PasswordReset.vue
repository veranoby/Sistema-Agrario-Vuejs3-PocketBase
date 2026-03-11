<template>
  <v-container class="fill-height justify-center bg-grey-lighten-4">
    <v-col cols="12" sm="8" md="6" lg="4">
      <v-card class="elevation-8">
        <v-toolbar color="success" dark flat>
          <v-toolbar-title>{{ t('auth.recover_password_title') }}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon to="/">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-toolbar>

        <v-card-text class="pt-6">
          <!-- Token inválido o expirado -->
          <v-alert v-if="tokenError" type="error" variant="tonal" class="mb-4" density="compact">
            <v-alert-title>{{ t('auth.recover_password_error') }}</v-alert-title>
            <p>{{ tokenError }}</p>
            <v-btn
              variant="text"
              color="white"
              class="mt-2"
              to="/"
            >
              {{ t('auth.got_it') }}
            </v-btn>
          </v-alert>

          <!-- Estado de éxito -->
          <div v-else-if="resetSuccess" class="text-center py-6">
            <v-icon color="success" size="64" class="mb-4">mdi-check-circle-outline</v-icon>
            <h3 class="text-h5 mb-2">{{ t('auth.password_reset_success_title') }}</h3>
            <p class="text-body-1 mb-6">
              {{ t('auth.password_reset_success_message') }}
            </p>
            <v-btn color="success" to="/" block>{{ t('auth.login') }}</v-btn>
          </div>

          <!-- Formulario de reset -->
          <v-form v-else @submit.prevent="handlePasswordReset" ref="resetForm">
            <p class="text-body-1 mb-4">
              {{ t('auth.enter_new_password') }}
            </p>

            <v-text-field
              v-model="password"
              :label="t('auth.new_password')"
              variant="outlined"
              required
              :rules="[
                (v) => !!v || t('auth.required_field', { field: t('auth.new_password') }),
                (v) => v.length >= 8 || t('auth.new_password_min_length')
              ]"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              :type="showPassword ? 'text' : 'password'"
              color="success"
              density="compact"
              prepend-inner-icon="mdi-lock-outline"
              class="mb-4"
              @click:append-inner="showPassword = !showPassword"
            ></v-text-field>

            <v-text-field
              v-model="passwordConfirm"
              :label="t('auth.confirm_new_password')"
              variant="outlined"
              required
              :rules="[
                (v) => !!v || t('auth.required_field', { field: t('auth.confirm_new_password') }),
                (v) => v === password || t('auth.passwords_do_not_match')
              ]"
              :append-inner-icon="showConfirm ? 'mdi-eye-off' : 'mdi-eye'"
              :type="showConfirm ? 'text' : 'password'"
              color="success"
              density="compact"
              prepend-inner-icon="mdi-lock-check-outline"
              class="mb-4"
              @click:append-inner="showConfirm = !showConfirm"
            ></v-text-field>

            <!-- Indicador de fuerza de contraseña -->
            <v-progress-linear
              v-if="password"
              :model-value="passwordStrength"
              :color="strengthColor"
              :height="8"
              rounded
              class="mb-2"
            ></v-progress-linear>
            <p v-if="password" class="text-caption mb-4" :class="`text-${strengthColor}`">
              {{ strengthLabel }}
            </p>

            <v-alert v-if="resetError" type="error" variant="tonal" class="mb-4" density="compact">
              {{ resetError }}
            </v-alert>

            <v-btn
              type="submit"
              color="success"
              block
              :loading="loading"
              :disabled="!canSubmit"
            >
              {{ t('auth.reset_password') }}
            </v-btn>
          </v-form>
        </v-card-text>

        <v-card-actions class="justify-center pa-4">
          <router-link to="/" class="text-decoration-none text-success">
            <small>{{ t('auth.back_to_login') }}</small>
          </router-link>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { pb } from '@/utils/pocketbase'
import { useSnackbarStore } from '@/stores/snackbarStore'
import { calculatePasswordStrength, getPasswordStrengthColor, getPasswordStrengthLabel } from '@/utils/validationUtils'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const snackbarStore = useSnackbarStore()

// Estado del componente
const token = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const resetError = ref('')
const tokenError = ref('')
const resetSuccess = ref(false)
const resetForm = ref(null)

// Store timer reference for cleanup
let redirectTimer = null

// Validar que el token esté presente
onMounted(() => {
  token.value = route.params.token

  if (!token.value) {
    tokenError.value = t('auth.invalid_reset_token')
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (redirectTimer) {
    clearTimeout(redirectTimer)
  }
})

// Calcular fuerza de contraseña (using shared utility)
const passwordStrength = computed(() =>
  calculatePasswordStrength(password.value)
)

const strengthColor = computed(() =>
  getPasswordStrengthColor(passwordStrength.value)
)

const strengthLabel = computed(() =>
  getPasswordStrengthLabel(passwordStrength.value, t)
)

// Verificar si el formulario puede ser enviado
const canSubmit = computed(() => {
  return password.value &&
         passwordConfirm.value &&
         password.value === passwordConfirm.value &&
         password.value.length >= 8 &&
         !loading.value
})

// Manejar el reset de contraseña
const handlePasswordReset = async () => {
  const { valid } = await resetForm.value.validate()
  if (!valid) return

  loading.value = true
  resetError.value = ''

  try {
    await pb.collection('users').confirmPasswordReset(
      token.value,
      password.value,
      passwordConfirm.value
    )

    resetSuccess.value = true
    snackbarStore.showSnackbar(t('auth.password_reset_success'), 'success')

    // Redirigir a login después de 3 segundos
    redirectTimer = setTimeout(() => {
      router.push('/')
    }, 3000)
  } catch (error) {
    console.error('Error al resetear contraseña:', error)

    // Manejar errores específicos de PocketBase
    if (error.message?.includes('invalid')) {
      resetError.value = t('auth.invalid_reset_token')
    } else if (error.message?.includes('expired')) {
      resetError.value = t('auth.expired_reset_token')
    } else {
      resetError.value = error.message || t('auth.recover_password_error')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>

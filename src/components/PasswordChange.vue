<template>
  <v-form @submit.prevent="changePassword" class="mt-8">
    <div class="grid grid-cols-1 rounded-lg border-2 px-2 py-2">
      <h2 class="text-l font-bold">Cambiar contraseña</h2>

      <div class="grid grid-cols-3 gap-2">
        <v-text-field
          v-model="oldPassword"
          label="Contraseña actual"
          variant="outlined"
          type="password"
          density="compact"
          class="compact-form"
          :error-messages="errors.oldPassword"
        ></v-text-field>

        <v-text-field
          v-model="newPassword"
          label="Nueva contraseña"
          variant="outlined"
          type="password"
          density="compact"
          class="compact-form"
          :error-messages="errors.newPassword"
        ></v-text-field>

        <v-text-field
          v-model="confirmPassword"
          label="Confirmar nueva contraseña"
          variant="outlined"
          type="password"
          density="compact"
          class="compact-form"
          :error-messages="errors.confirmPassword"
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
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useProfileStore } from '@/stores/profileStore'
// import { useSnackbarStore } from '@/stores/snackbarStore'

export default defineComponent({
  name: 'PasswordChange',
  setup() {
    const profileStore = useProfileStore()
    //   const snackbarStore = useSnackbarStore()

    const oldPassword = ref('')
    const newPassword = ref('')
    const confirmPassword = ref('')
    const isLoading = ref(false)
    const errors = ref({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })

    const validateForm = () => {
      errors.value = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      }

      if (!oldPassword.value) {
        errors.value.oldPassword = 'La contraseña actual es requerida'
      }

      if (!newPassword.value) {
        errors.value.newPassword = 'La nueva contraseña es requerida'
      } else if (newPassword.value.length < 8) {
        errors.value.newPassword = 'La nueva contraseña debe tener al menos 8 caracteres'
      }

      if (!confirmPassword.value) {
        errors.value.confirmPassword = 'Confirmar la nueva contraseña es requerido'
      } else if (newPassword.value !== confirmPassword.value) {
        errors.value.confirmPassword = 'Las contraseñas no coinciden'
      }

      return Object.values(errors.value).every((error) => !error)
    }

    const changePassword = async () => {
      if (!validateForm()) {
        return
      }

      isLoading.value = true
      try {
        await profileStore.changePassword(oldPassword.value, newPassword.value)
        //  snackbarStore.showSnackbar('Contraseña cambiada exitosamente', 'success')
        oldPassword.value = ''
        newPassword.value = ''
        confirmPassword.value = ''
      } catch (error) {
        //  snackbarStore.showSnackbar('Error al cambiar la contraseña: ' + error.message, 'error')
      } finally {
        isLoading.value = false
      }
    }

    return {
      oldPassword,
      newPassword,
      confirmPassword,
      isLoading,
      errors,
      changePassword
    }
  }
})
</script>

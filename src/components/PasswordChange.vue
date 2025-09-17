<template>
  <div class="m-6">
    <v-btn
      min-width="210"
      size="small"
      variant="flat"
      rounded="lg"
      color="grey-lighten-1"
      prepend-icon="mdi-lock"
      @click="openDialog"
    >
      Cambiar Contraseña
    </v-btn>

    <!-- Diálogo para cambiar la contraseña -->
    <v-dialog
      v-model="dialogOpen"
      max-width="500px"
      persistent
      transition="dialog-bottom-transition"
      scrollable
    >
      <v-card>
        <v-toolbar color="success" dark>
          <v-toolbar-title>Cambiar contraseña</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-card-text>
          <v-form @submit.prevent="changePassword">
            <v-text-field
              class=""
              v-model="oldPassword"
              label="Contraseña actual"
              variant="outlined"
              type="password"
              density="compact"
              :error-messages="errors.oldPassword"
              prepend-icon="mdi-lock-outline"
            ></v-text-field>

            <v-text-field
              class=""
              v-model="newPassword"
              label="Nueva contraseña"
              variant="outlined"
              type="password"
              density="compact"
              :error-messages="errors.newPassword"
              prepend-icon="mdi-lock-plus"
            ></v-text-field>

            <v-text-field
              v-model="confirmPassword"
              class=""
              label="Confirmar nueva contraseña"
              variant="outlined"
              type="password"
              density="compact"
              :error-messages="errors.confirmPassword"
              prepend-icon="mdi-lock-check"
            ></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-cancel"
            color="red-lighten-3"
            @click="dialogOpen = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            size="small"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-check"
            color="green-lighten-3"
            @click="changePassword"
            :loading="isLoading"
          >
            Cambiar contraseña
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
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

    const dialogOpen = ref(false)
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
        dialogOpen.value = false // Cerrar el diálogo después de cambiar la contraseña
      } catch (error) {
        //  snackbarStore.showSnackbar('Error al cambiar la contraseña: ' + error.message, 'error')
      } finally {
        isLoading.value = false
      }
    }

    const openDialog = () => {
      dialogOpen.value = true
    }

    return {
      dialogOpen,
      oldPassword,
      newPassword,
      confirmPassword,
      isLoading,
      errors,
      changePassword,
      openDialog
    }
  }
})
</script>

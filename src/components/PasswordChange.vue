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
      {{ t('password_change.change_password') }}
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
          <v-toolbar-title>{{ t('password_change.change_password') }}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-card-text>
          <v-form @submit.prevent="changePassword">
            <v-text-field
              class=""
              v-model="oldPassword"
              :label="t('password_change.current_password')"
              variant="outlined"
              type="password"
              density="compact"
              :error-messages="errors.oldPassword"
              prepend-icon="mdi-lock-outline"
            ></v-text-field>

            <v-text-field
              class=""
              v-model="newPassword"
              :label="t('password_change.new_password')"
              variant="outlined"
              type="password"
              density="compact"
              :error-messages="errors.newPassword"
              prepend-icon="mdi-lock-plus"
            ></v-text-field>

            <v-text-field
              v-model="confirmPassword"
              class=""
              :label="t('password_change.confirm_new_password')"
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
            {{ t('password_change.cancel') }}
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
            {{ t('password_change.change_password') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useProfileStore } from '@/stores/profileStore'
import { useSnackbarStore } from '@/stores/snackbarStore'

export default defineComponent({
  name: 'PasswordChange',
  setup() {
    const profileStore = useProfileStore()
    const snackbarStore = useSnackbarStore()
    const { t } = useI18n()

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
        errors.value.oldPassword = t('password_change.current_password_required')
      }

      if (!newPassword.value) {
        errors.value.newPassword = t('password_change.new_password_required')
      } else if (newPassword.value.length < 8) {
        errors.value.newPassword = t('password_change.new_password_min_length')
      }

      if (!confirmPassword.value) {
        errors.value.confirmPassword = t('password_change.confirm_password_required')
      } else if (newPassword.value !== confirmPassword.value) {
        errors.value.confirmPassword = t('password_change.passwords_do_not_match')
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
        snackbarStore.showSnackbar(t('password_change.password_changed_successfully'), 'success')
        oldPassword.value = ''
        newPassword.value = ''
        confirmPassword.value = ''
        dialogOpen.value = false
      } catch (error) {
        snackbarStore.showSnackbar(t('password_change.failed_to_change_password') + ': ' + error.message, 'error')
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
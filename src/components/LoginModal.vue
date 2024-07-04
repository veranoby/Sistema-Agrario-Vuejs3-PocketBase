<template>
  <v-dialog :model-value="isOpen" @input="$emit('close')">
    <v-card>
      <v-card-title>Login</v-card-title>
      <v-card-text>
        <v-text-field label="Username/Email" v-model="usernameOrEmail" required />
        <v-text-field label="Password" v-model="password" type="password" required />
      </v-card-text>
      <v-card-actions>
        <v-btn @click="submit">Login</v-btn>
        <v-btn text @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSnackbarStore } from '../stores/snackbarStore'

export default {
  props: {
    isOpen: {
      type: Boolean
    }
  },
  setup(props, { emit }) {
    const authStore = useAuthStore()
    const usernameOrEmail = ref('')
    const password = ref('')
    const snackbarStore = useSnackbarStore()

    const close = () => {
      emit('update:isOpen', false)
    }

    const submit = async () => {
      // Implement login logic using PocketBase API call here
      await authStore.login(usernameOrEmail.value, password.value)

      if (authStore.isLoggedIn) {
        emit('update:isOpen', false)
        snackbarStore.showSnackbar('Login successful!', 'success', 2000)
        // Clear form fields (optional)
        usernameOrEmail.value = ''
        password.value = ''
      } else {
        snackbarStore.showSnackbar('Login failed!', 'error', 2000)
      }
    }

    return {
      usernameOrEmail,
      password,
      close,
      submit
    }
  }
}
</script>

<style scoped>
/* Add your styles for the modal layout */
</style>

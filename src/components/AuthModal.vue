<template>
  <v-dialog v-model="dialogModel" max-width="500px">
    <!-- <v-dialog :model-value="isOpen" @update:model-value="$emit('update:isOpen', $event)">
-->
    <v-card>
      <v-tabs v-model="tab">
        <v-tab value="login">Login</v-tab>
        <v-tab value="register">Register</v-tab>
      </v-tabs>

      <v-card-text>
        <v-window v-model="tab">
          <v-window-item value="login">
            <v-form @submit.prevent="login">
              <v-text-field
                v-model="loginForm.usernameOrEmail"
                label="Username/Email"
                required
              ></v-text-field>
              <v-text-field
                v-model="loginForm.password"
                label="Password"
                type="password"
                required
              ></v-text-field>
              <v-checkbox v-model="loginForm.rememberMe" label="Remember me"></v-checkbox>
              <v-btn type="submit" color="primary" block>Login</v-btn>
            </v-form>
          </v-window-item>

          <v-window-item value="register">
            <v-form @submit.prevent="register">
              <v-text-field
                v-model="registerForm.username"
                label="Username"
                required
              ></v-text-field>
              <v-text-field
                v-model="registerForm.email"
                label="Email"
                type="email"
                required
              ></v-text-field>
              <v-text-field
                v-model="registerForm.password"
                label="Password"
                type="password"
                required
              ></v-text-field>
              <v-text-field
                v-model="registerForm.passwordConfirm"
                label="Confirm Password"
                type="password"
                required
              ></v-text-field>
              <v-btn type="submit" color="primary" block>Register</v-btn>
            </v-form>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSnackbarStore } from '../stores/snackbarStore'

export default {
  props: {
    isOpen: Boolean,
    initialTab: {
      type: String,
      default: 'login'
    }
  },
  emits: ['update:isOpen'],
  setup(props, { emit }) {
    const authStore = useAuthStore()
    const snackbarStore = useSnackbarStore()
    const tab = ref(props.initialTab)

    const dialogModel = computed({
      get: () => props.isOpen,
      set: (value) => emit('update:isOpen', value)
    })

    const loginForm = ref({
      usernameOrEmail: '',
      password: '',
      rememberMe: false
    })

    const registerForm = ref({
      username: '',
      email: '',
      password: '',
      passwordConfirm: ''
    })

    const login = async () => {
      try {
        await authStore.login(
          loginForm.value.usernameOrEmail,
          loginForm.value.password,
          loginForm.value.rememberMe
        )
        snackbarStore.showSnackbar('Login successful!', 'success')
        dialogModel.value = false
      } catch (error) {
        snackbarStore.showSnackbar('Login failed: ' + error.message, 'error')
      }
    }

    const register = async () => {
      if (registerForm.value.password !== registerForm.value.passwordConfirm) {
        snackbarStore.showSnackbar('Passwords do not match', 'error')
        return
      }
      try {
        await authStore.register(
          registerForm.value.username,
          registerForm.value.email,
          registerForm.value.password
        )
        snackbarStore.showSnackbar('Registration successful!', 'success')
        dialogModel.value = false
      } catch (error) {
        snackbarStore.showSnackbar('Registration failed: ' + error.message, 'error')
      }
    }

    return {
      tab,
      dialogModel,
      loginForm,
      registerForm,
      login,
      register
    }
  }
}
</script>

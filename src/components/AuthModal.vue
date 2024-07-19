<template>
  <v-dialog v-model="dialogModel" max-width="500px">
    <v-card>
      <v-tabs v-model="tab" fixed-tabs>
        <v-tab value="login"><v-icon icon="mdi-login"></v-icon> &nbsp; Login</v-tab>
        <v-tab value="register"><v-icon icon="mdi-account-plus"></v-icon> &nbsp; Register</v-tab>
      </v-tabs>

      <v-card-text>
        <v-window v-model="tab">
          <v-window-item value="login">
            <v-row justify="center" align="center" style="height: 100px">
              <v-col cols="3" justify="center">
                <v-img
                  lazy-src="https://picsum.photos/id/11/100/60"
                  width="80"
                  height="80"
                  :src="loginLogo"
                  alt="Login Logo"
                />
              </v-col>
              <v-col cols="6" justify="center">
                <h3 class="text-xl font-bold">Ingrese a su cuenta</h3>
              </v-col>
            </v-row>

            <v-form @submit.prevent="login">
              <v-row justify="center">
                <v-col cols="12">
                  <v-text-field
                    v-model="loginForm.usernameOrEmail"
                    class="compact-form"
                    label="Nomnbre de usuario/Email"
                    variant="outlined"
                    required
                    color="success"
                    density="compact"
                    prepend-inner-icon="mdi-account-outline"
                  ></v-text-field>
                  <v-text-field
                    v-model="loginForm.password"
                    class="compact-form"
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
              <v-row>
                <v-col></v-col>
                <v-col>
                  <a
                    class="text-caption text-decoration-none text-green"
                    href="#"
                    rel="noopener noreferrer"
                    target="_blank"
                    ><strong class="compact-form">Olvido su contraseña?</strong></a
                  >
                </v-col>
              </v-row>

              <v-checkbox
                class="compact-form"
                v-model="loginForm.rememberMe"
                label="Remember me"
              ></v-checkbox>
              <v-btn type="submit" color="green" block>Login</v-btn>
            </v-form>
          </v-window-item>

          <v-window-item value="register">
            <v-row justify="center" align="center" style="height: 100px" no-gutters>
              <v-col justify="center" cols="3">
                <v-img
                  lazy-src="https://picsum.photos/id/11/100/60"
                  width="80"
                  height="80"
                  :src="registerLogo"
                  alt="Register Logo"
                />
              </v-col>
              <v-col cols="6">
                <h3 class="text-xl font-bold">Crea tu cuenta para empezar.</h3>
              </v-col>
            </v-row>
            <v-form @submit.prevent="register">
              <v-row justify="center" no-gutters>
                <v-col cols="6">
                  <v-text-field
                    class="compact-form"
                    v-model="registerForm.username"
                    label="Nombre de usuario"
                    variant="outlined"
                    required
                    color="primary"
                    density="compact"
                    clearable
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="registerForm.email"
                    class="compact-form"
                    label="Email"
                    variant="outlined"
                    type="email"
                    required
                    color="primary"
                    density="compact"
                    clearable
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    class="compact-form"
                    v-model="registerForm.firstname"
                    label="Nombre"
                    variant="outlined"
                    required
                    color="primary"
                    density="compact"
                    clearable
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    class="compact-form"
                    v-model="registerForm.lastname"
                    label="Apellido"
                    variant="outlined"
                    required
                    color="primary"
                    density="compact"
                    clearable
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="registerForm.hacienda"
                    class="compact-form"
                    label="Hacienda"
                    variant="outlined"
                    required
                    color="primary"
                    density="compact"
                    clearable
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="registerForm.password"
                    class="compact-form"
                    label="Password"
                    variant="outlined"
                    type="password"
                    required
                    color="primary"
                    density="compact"
                    clearable
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="registerForm.passwordConfirm"
                    class="compact-form"
                    label="Confirm Password"
                    variant="outlined"
                    type="password"
                    required
                    color="primary"
                    density="compact"
                    clearable
                  ></v-text-field>
                </v-col>
                <v-btn type="submit" color="primary" block>Register</v-btn>
              </v-row>
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
import loginLogo from '../assets/login-logo.png'
import registerLogo from '../assets/register-logo.png'

export default {
  data: () => ({
    visible: false
  }),
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
      firstname: '',
      lastname: '',
      password: '',
      passwordConfirm: '',
      hacienda: ''
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
        snackbarStore.showSnackbar('Error de Ingreso: ' + error.message, 'error')
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
          registerForm.value.firstname,
          registerForm.value.lastname,
          registerForm.value.password,
          registerForm.value.hacienda
        )
        snackbarStore.showSnackbar(
          'Registro Exitoso! Por favor, consulte su correo electronico para  confirmacion e ingreso.',
          'success'
        )
        dialogModel.value = false
      } catch (error) {
        snackbarStore.showSnackbar('Fallo de Registro: ' + error.message, 'error')
      }
    }

    return {
      tab,
      dialogModel,
      loginForm,
      registerForm,
      login,
      register,
      loginLogo,
      registerLogo
    }
  }
}
</script>

<style scoped></style>

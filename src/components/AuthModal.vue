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
                    label="Nombre de usuario/Email"
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
            <v-row justify="center" style="height: 100px" no-gutters>
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
              <v-row justify="center" no-gutters v-if="!authStore.registrationSuccess">
                <v-col cols="6">
                  <v-text-field
                    class="compact-form"
                    v-model="registerForm.username"
                    label="Nombre de usuario"
                    variant="outlined"
                    required
                    :error-messages="v$.username.$errors.map((e) => e.$message)"
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
                    :error-messages="v$.email.$errors.map((e) => e.$message)"
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
                    :error-messages="v$.firstname.$errors.map((e) => e.$message)"
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
                    :error-messages="v$.lastname.$errors.map((e) => e.$message)"
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
                    :error-messages="v$.hacienda.$errors.map((e) => e.$message)"
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
                    required
                    :error-messages="v$.password.$errors.map((e) => e.$message)"
                    color="primary"
                    :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                    :type="visible ? 'text' : 'password'"
                    density="compact"
                    prepend-inner-icon="mdi-lock-outline"
                    @click:append-inner="visible = !visible"
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="registerForm.passwordConfirm"
                    class="compact-form"
                    label="Confirm Password"
                    variant="outlined"
                    required
                    :error-messages="v$.passwordConfirm.$errors.map((e) => e.$message)"
                    color="primary"
                    :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
                    :type="visible ? 'text' : 'password'"
                    density="compact"
                    prepend-inner-icon="mdi-lock-outline"
                    @click:append-inner="visible = !visible"
                  ></v-text-field>
                </v-col>
                <v-btn type="submit" color="primary" block>Register</v-btn>
              </v-row>
              <v-row justify="center" no-gutters v-else>
                <v-col cols="12">
                  <h3 class="text-center">
                    ¡Registro exitoso! Por favor, revise su correo electrónico para confirmar su
                    cuenta.
                  </h3>
                </v-col>
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
import { useVuelidate } from '@vuelidate/core'
import { required, email, minLength, sameAs } from '@vuelidate/validators'

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
    const visible = ref(false)

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

    const rules = {
      username: { required, minLength: minLength(3) },
      email: { required, email },
      firstname: { required },
      lastname: { required },
      hacienda: { required },
      password: { required, minLength: minLength(8) },
      passwordConfirm: {
        required,
        sameAsPassword: sameAs(computed(() => registerForm.value.password))
      }
    }

    const v$ = useVuelidate(rules, registerForm)

    const login = async () => {
      if (!loginForm.value.usernameOrEmail || !loginForm.value.password) {
        snackbarStore.showSnackbar('Please fill in all fields', 'error')
        return
      }

      try {
        await authStore.login(
          loginForm.value.usernameOrEmail,
          loginForm.value.password,
          loginForm.value.rememberMe
        )
        dialogModel.value = false
      } catch (error) {
        console.error('Login error from authmodal:', error)
      }
    }

    const register = async () => {
      const isValid = await v$.value.$validate()
      if (!isValid) {
        snackbarStore.showSnackbar('Please correct the errors in the form', 'error')
        return
      }

      try {
        await authStore.register({ ...registerForm.value })
        // Clear the form and close the dialog only if registration was successful
        Object.keys(registerForm.value).forEach((key) => (registerForm.value[key] = ''))
        //   dialogModel.value = false
      } catch (error) {
        console.log('Registration error from Authmodal:', error.message)
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
      registerLogo,
      authStore,
      visible,
      v$
    }
  }
}
</script>

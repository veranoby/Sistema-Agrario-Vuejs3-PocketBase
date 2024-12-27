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
                  width="60"
                  height="60"
                  :src="loginLogo"
                  alt="Login Logo"
                />
              </v-col>
              <v-col cols="6" justify="center">
                <h3 class="text-xl font-bold">Ingrese a su cuenta</h3>
              </v-col>
            </v-row>

            <v-form @submit.prevent="login">
              <!--     <v-form @submit.prevent="handleLogin"> -->
              <v-row justify="center">
                <v-col cols="12"
                  ><br />
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
                <v-col>
                  <v-checkbox
                    class="compact-form"
                    v-model="loginForm.rememberMe"
                    label="Remember me"
                  ></v-checkbox
                ></v-col>
                <v-col
                  ><br />
                  <a
                    class="text-caption text-decoration-none text-green"
                    href="#"
                    rel="noopener noreferrer"
                    target="_blank"
                    ><strong class="compact-form">Olvido su contraseña?</strong></a
                  >
                </v-col>
              </v-row>

              <v-btn type="submit" @click="login" color="green" block>Login</v-btn>
            </v-form>
          </v-window-item>

          <v-window-item value="register">
            <v-row justify="center" style="height: 100px" no-gutters>
              <v-col justify="center" cols="3">
                <v-img
                  lazy-src="https://picsum.photos/id/11/100/60"
                  width="60"
                  height="60"
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
                    :class="usernameAvailable ? 'compact-form' : 'compact-form text-red'"
                    v-model="registerForm.username"
                    label="Nombre de usuario"
                    variant="outlined"
                    required
                    :error-messages="v$.username.$errors.map((e) => e.$message)"
                    :color="usernameAvailable ? 'primary' : 'error'"
                    @input="v$.username.$touch()"
                    density="compact"
                    @blur="checkUsername"
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="registerForm.email"
                    :class="emailAvailable ? 'compact-form' : 'compact-form text-red'"
                    label="Email"
                    variant="outlined"
                    type="email"
                    required
                    :error-messages="v$.email.$errors.map((e) => e.$message)"
                    :color="emailAvailable ? 'primary' : 'error'"
                    density="compact"
                    @input="v$.email.$touch()"
                    @blur="checkEmail"
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
                    @input="v$.firstname.$touch()"
                    color="primary"
                    density="compact"
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
                    @input="v$.lastname.$touch()"
                    density="compact"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="registerForm.hacienda"
                    :class="haciendaAvailable ? 'compact-form' : 'compact-form text-red'"
                    label="Hacienda"
                    variant="outlined"
                    required
                    :error-messages="v$.hacienda.$errors.map((e) => e.$message)"
                    density="compact"
                    @blur="checkHacienda"
                    @input="v$.hacienda.$touch()"
                    :color="haciendaAvailable ? 'primary' : 'error'"
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
                    @input="v$.password.$touch()"
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
                    @input="v$.passwordConfirm.$touch()"
                    @click:append-inner="visible = !visible"
                  ></v-text-field>
                </v-col>
                <v-btn type="submit" @click="register" color="blue" block :disabled="!formValid"
                  >Register</v-btn
                >
              </v-row>
              <v-row justify="center" no-gutters v-else>
                <v-col cols="12"
                  ><br />
                  <h3 class="text-center text-primary">¡Registro exitoso!</h3>
                  <br />
                  <p class="text-center text-sm">
                    Por favor, revise su correo electrónico para confirmar su cuenta.
                  </p>
                  <br />
                </v-col>
                <v-btn @click="closeModalAndNavigate" color="primary" size="small" block>
                  Verify Email
                </v-btn>
              </v-row>
            </v-form>
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup>
//import { ref, computed, watch } from 'vue'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'

import { useValidationStore } from '../stores/validationStore'

import { useSnackbarStore } from '../stores/snackbarStore'
import loginLogo from '../assets/login-logo.png'
import registerLogo from '../assets/register-logo.png'
import { useVuelidate } from '@vuelidate/core'
import { required, email, minLength, sameAs } from '@vuelidate/validators'
import { useSyncStore } from '@/stores/syncStore'

const props = defineProps({
  isOpen: Boolean,
  initialTab: {
    type: String,
    default: 'login'
  }
})

const emit = defineEmits(['update:isOpen', 'loginSuccess', 'HandleDrawer'])

const authStore = useAuthStore()
const validationStore = useValidationStore()
const snackbarStore = useSnackbarStore()
const tab = ref(props.initialTab)
const visible = ref(false)
const usernameAvailable = ref(true)
const emailAvailable = ref(true)
const haciendaAvailable = ref(true)
const syncStore = useSyncStore()

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
  username: {
    required,
    minLength: minLength(3)
  },
  email: {
    required,
    email
  },
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

const formValid = computed(() => {
  return (
    !v$.value.$invalid && usernameAvailable.value && emailAvailable.value && haciendaAvailable.value
  )
})

const checkUsername = async () => {
  if (registerForm.value.username.length >= 3) {
    try {
      usernameAvailable.value = await validationStore.checkUsernameTaken(
        registerForm.value.username
      )

      console.log('pedido responde', usernameAvailable.value)
    } catch (error) {
      //   console.error('Error checking username:', error)
      usernameAvailable.value = false
    }
  } else {
    usernameAvailable.value = true
  }
}
const checkEmail = async () => {
  if (registerForm.value.email) {
    try {
      emailAvailable.value = await validationStore.checkEmailTaken(registerForm.value.email)
      console.log('checking Email availability:', registerForm.value.email)
    } catch (error) {
      console.log('Error checking email:', error)
      emailAvailable.value = false
    }
  } else {
    emailAvailable.value = true
  }
}

const checkHacienda = async () => {
  if (registerForm.value.hacienda) {
    try {
      haciendaAvailable.value = await validationStore.checkHaciendaTaken(
        registerForm.value.hacienda
      )
      console.log('checking Hacienda availability:', registerForm.value.hacienda)
    } catch (error) {
      console.error('Error checking hacienda:', error)
      haciendaAvailable.value = false
    }
  } else {
    haciendaAvailable.value = true
  }
}

const login = async () => {
  if (!loginForm.value.usernameOrEmail || !loginForm.value.password) {
    snackbarStore.showSnackbar('Please fill in all fields', 'error')
    return
  }

  try {
    if (!syncStore.isOnline) {
      useSnackbarStore().showError('Se requiere conexión a internet para iniciar sesión')
      return
    }

    const success = await authStore.login(
      loginForm.value.usernameOrEmail,
      loginForm.value.password,
      loginForm.value.rememberMe
    )
    if (success) {
      emit('loginSuccess')
      console.log('emit loginSuccess', success)
      dialogModel.value = false
      console.log('HandleDrawer', success)

      emit('HandleDrawer', true)
    }
  } catch (error) {
    console.log('Login error from authmodal:', error)
  }
}

const register = async () => {
  const isValid = await v$.value.$validate()
  if (!isValid) {
    snackbarStore.showSnackbar('Please correct the errors in the form', 'error')
    return
  }

  try {
    const registrationData = {
      username: registerForm.value.username,
      email: registerForm.value.email,
      firstname: registerForm.value.firstname,
      lastname: registerForm.value.lastname,
      password: registerForm.value.password,
      hacienda: registerForm.value.hacienda
    }

    await authStore.register(registrationData, 'administrador')

    //     await authStore.register({ ...registerForm.value }, 'administrador', 1)

    // Clear the form and close the dialog only if registration was successful
    //   Object.keys(registerForm.value).forEach((key) => (registerForm.value[key] = ''))
    //   dialogModel.value = false
  } catch (error) {
    console.log('Registration error from Authmodal:', error.message)
  }
}

const closeDialog = () => {
  dialogModel.value = false
  emit('update:isOpen', false)
}
</script>

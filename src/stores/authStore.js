import { defineStore } from 'pinia'
import PocketBase from 'pocketbase'
import { useSnackbarStore } from './snackbarStore'
import router from '@/router'

const pb = new PocketBase('http://127.0.0.1:8090')

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    isLoggedIn: false,
    registrationSuccess: false
  }),
  actions: {
    async login(usernameOrEmail, password, rememberMe = false) {
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const authData = await pb.collection('users').authWithPassword(usernameOrEmail, password)

        if (pb.authStore.isValid) {
          this.user = authData.record
          this.token = authData.token
          this.isLoggedIn = true

          if (rememberMe) {
            localStorage.setItem('rememberMe', JSON.stringify({ usernameOrEmail, password }))
            localStorage.setItem('token', this.token)
          } else {
            localStorage.removeItem('rememberMe')
            localStorage.removeItem('token')
          }
          snackbarStore.showSnackbar('Login successful!', 'success')
          router.push('/dashboard')
        } else {
          throw new Error('Login failed')
        }
      } catch (error) {
        console.error(error)
        snackbarStore.showSnackbar('Login failed: ' + error.message, 'error')
        throw error
      }
    },
    async register({ username, email, firstname, lastname, password, hacienda }) {
      const snackbarStore = useSnackbarStore()

      try {
        // Perform all checks before any database operations
        await this.checkUsernameTaken(username)
        await this.checkEmailTaken(email)
        await this.checkHaciendaTaken(hacienda)

        // If all checks pass, proceed with creating hacienda and user
        const newHacienda = await this.createHacienda(hacienda)
        const userData = this.createUserData(
          username,
          email,
          firstname,
          lastname,
          password,
          newHacienda.id
        )
        const record = await pb.collection('users').create(userData)

        // Send an email verification request
        await pb.collection('users').requestVerification(email)

        snackbarStore.showSnackbar(
          'Registrado con éxito. Por favor, consulte su correo electrónico para confirmación.',
          'success'
        )
        console.log('record:', record)
        this.registrationSuccess = true
      } catch (error) {
        this.registrationSuccess = false
        this.handleRegistrationError(error)
      }
    },
    async checkUsernameTaken(username) {
      const usernameCheck = await pb
        .collection('users')
        .getList(1, 1, { filter: `username="${username}"` })
      if (usernameCheck.totalItems > 0) {
        throw new Error('USERNAME_TAKEN')
      }
    },
    async checkEmailTaken(email) {
      const emailCheck = await pb.collection('users').getList(1, 1, { filter: `email="${email}"` })
      if (emailCheck.totalItems > 0) {
        throw new Error('EMAIL_TAKEN')
      }
    },
    async checkHaciendaTaken(hacienda) {
      const haciendaCheck = await pb
        .collection('HaciendaLabel')
        .getList(1, 1, { filter: `name="${hacienda}"` })
      if (haciendaCheck.totalItems > 0) {
        throw new Error('HACIENDA_TAKEN')
      }
    },
    async createHacienda(hacienda) {
      const haciendaData = {
        name: hacienda,
        location: '',
        info: ''
      }
      return await pb.collection('HaciendaLabel').create(haciendaData)
    },
    createUserData(username, email, firstname, lastname, password, haciendaId) {
      return {
        username,
        email,
        emailVisibility: true,
        password,
        passwordConfirm: password,
        name: firstname,
        lastname,
        role: 'administrador',
        hacienda: haciendaId
      }
    },
    handleRegistrationError(error) {
      const snackbarStore = useSnackbarStore()
      let errorMessage
      switch (error.message) {
        case 'USERNAME_TAKEN':
          errorMessage = 'Este nombre de usuario ya está en uso.'
          break
        case 'EMAIL_TAKEN':
          errorMessage = 'Este correo electrónico ya está registrado.'
          break
        case 'HACIENDA_TAKEN':
          errorMessage =
            'Esta hacienda ya está registrada. No se puede crear otro administrador para la misma hacienda.'
          break
        default:
          errorMessage = 'Error de registro: ' + error.message
      }
      snackbarStore.showSnackbar(errorMessage, 'error')
      console.log(errorMessage)
      throw new Error(errorMessage)
    },
    async confirmEmail(token) {
      const snackbarStore = useSnackbarStore()

      try {
        await pb.collection('users').authConfirm(token)
        snackbarStore.showSnackbar(
          'Email confirmed successfully! Please Login with your credentials',
          'success'
        )
        router.push('/login')
      } catch (error) {
        snackbarStore.showSnackbar('Error confirming email: ' + error.message, 'error')
      }
    },

    async checkAuth() {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const authData = await pb.collection('users').authRefresh(token)
          this.user = authData.user
          this.token = authData.token
        } catch (error) {
          localStorage.removeItem('token')
        }
      }
    },
    logout() {
      pb.authStore.clear()
      this.user = null
      this.token = null
      this.isLoggedIn = false

      localStorage.removeItem('rememberMe')
      localStorage.removeItem('token')

      const snackbarStore = useSnackbarStore()
      snackbarStore.showSnackbar('Logged out successfully', 'success')
      router.push('/')
    }
  }
})

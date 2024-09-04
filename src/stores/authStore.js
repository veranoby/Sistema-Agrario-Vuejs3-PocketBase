import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useProfileStore } from './profileStore'
import { useHaciendaStore } from './haciendaStore'
import { usePlanStore } from './planStore'
import { useValidationStore } from './validationStore'
import router from '@/router'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    registrationSuccess: false,
    loading: false,

    isLoggedIn: false,
    token: null
  }),

  actions: {
    async login(usernameOrEmail, password, rememberMe = false) {
      if (this.loading) return // Prevent multiple calls while loading
      this.loading = true

      const snackbarStore = useSnackbarStore()
      const profileStore = useProfileStore()
      const haciendaStore = useHaciendaStore()
      const planStore = usePlanStore()

      snackbarStore.showLoading()

      try {
        const authData = await pb.collection('users').authWithPassword(usernameOrEmail, password)

        if (pb.authStore.isValid) {
          profileStore.setUser(authData.record)

          this.isLoggedIn = true
          this.token = pb.authStore.token

          console.log('usuario:', profileStore.user)
          console.log('isLoggedIn:', this.isLoggedIn)
          console.log('token:', this.token)

          await planStore.fetchAvailablePlans()
          await haciendaStore.fetchHacienda(authData.record.hacienda)

          if (rememberMe) {
            localStorage.setItem('rememberMe', JSON.stringify({ usernameOrEmail, password }))
            localStorage.setItem('token', this.token)
          } else {
            localStorage.removeItem('rememberMe')
            localStorage.removeItem('token')
          }

          snackbarStore.showSnackbar('Login successful!', 'success')

          router.push('/dashboard') // Navigate to dashboard.vue

          return true
        } else {
          throw new Error('Login failed: Invalid credentials')
        }
      } catch (error) {
        handleError(error, 'Invalid credentials')

        return false
      } finally {
        this.loading = false
        snackbarStore.hideLoading()
      }
    },

    async register(formData, new_role) {
      const snackbarStore = useSnackbarStore()
      const validationStore = useValidationStore()
      const haciendaStore = useHaciendaStore()
      const planStore = usePlanStore()

      snackbarStore.showLoading()

      console.log('new_role:', new_role)

      try {
        const emailExists = await validationStore.checkEmailTaken(formData.email)

        if (!emailExists) {
          return
        }

        let haciendaId
        let verified_user

        if (new_role === 'administrador') {
          console.log('entrando a administrador en registro:')

          // Get the "gratis" plan
          await planStore.fetchAvailablePlans()
          const gratisPlan = await planStore.getGratisPlan()

          // Use the existing createHacienda method from haciendaStore
          const newHacienda = await haciendaStore.createHacienda(formData.hacienda, gratisPlan.id)

          haciendaId = newHacienda.id
          verified_user = false
        } else {
          console.log('entrando a NO administrador en registro:')

          haciendaId = formData.hacienda
          //        verified_user = true //should be true, but at the time, pocketbase doesnt handle
          verified_user = false
        }

        const userData = this.createUserData(
          formData.username,
          formData.email,
          formData.firstname,
          formData.lastname,
          formData.password,
          new_role,
          haciendaId,
          verified_user
        )

        console.log('user_data:', userData)

        await pb.collection('users').create(userData)

        if (new_role === 'administrador') {
          await this.sendVerificationEmail(formData.email)

          snackbarStore.showSnackbar(
            'Registrado con éxito. Por favor, consulte su correo electrónico para confirmación.',
            'success'
          )
          this.registrationSuccess = true
        } else {
          snackbarStore.showSnackbar('Usuario ' + new_role + ' Registrado con éxito', 'success')
        }
      } catch (error) {
        if (new_role === 'administrador') {
          this.registrationSuccess = false
        }
        if (error.message === 'Validation failed') {
          validationStore.handleRegistrationError(error)
        } else {
          handleError(error, 'Registration failed')
        }
      } finally {
        snackbarStore.hideLoading()
      }
    },

    createUserData(
      username,
      email,
      firstname,
      lastname,
      password,
      new_role,
      new_hacienda,
      verified
    ) {
      return {
        username,
        email,
        emailVisibility: true,
        password,
        passwordConfirm: password,
        name: firstname,
        lastname,
        role: new_role,
        info: 'Usuario de hacienda',
        hacienda: new_hacienda,
        verified: verified
      }
    },

    async sendVerificationEmail(email) {
      //listo
      try {
        await pb.collection('users').requestVerification(email)
        return true
      } catch (error) {
        handleError(error, 'Failed to send verification email')
      }
    },

    async confirmEmail(token) {
      const snackbarStore = useSnackbarStore()

      try {
        await pb.collection('users').confirmVerification(token)
        snackbarStore.showSnackbar(
          'Email confirmed successfully! You can now log in with your credentials.',
          'success'
        )
      } catch (error) {
        handleError(error, 'Failed to confirm email')
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async checkAuth() {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const authData = await pb.collection('users').authRefresh()
          const profileStore = useProfileStore()
          profileStore.setUser(authData.record)
        } catch (error) {
          localStorage.removeItem('token')
          this.logout()
        }
      }
    },

    logout() {
      const snackbarStore = useSnackbarStore()
      const profileStore = useProfileStore()

      snackbarStore.showLoading()

      pb.authStore.clear()
      profileStore.setUser(null)

      this.$state.isLoggedIn = false
      this.$state.token = null

      localStorage.removeItem('rememberMe')
      localStorage.removeItem('token')

      snackbarStore.showSnackbar('Logged out successfully', 'success')
      router.push('/')
    }
  }
})

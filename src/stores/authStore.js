import { defineStore } from 'pinia'
import { pb } from '@/utils/pocketbase'
import { handleError } from '@/utils/errorHandler'
import { useSnackbarStore } from './snackbarStore'
import { useProfileStore } from './profileStore'
import { useHaciendaStore } from './haciendaStore'
import { usePlanStore } from './planStore'
import { useValidationStore } from './validationStore'
import router from '@/router'
import { useSyncStore } from './syncStore'
import { useActividadesStore } from '@/stores/actividadesStore'
import { useZonasStore } from '@/stores/zonasStore'
import { useSiembrasStore } from '@/stores/siembrasStore'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    registrationSuccess: false,
    loading: false,
    user: null,
    token: null,
    isLoggedIn: false,
    rememberMe: null
  }),

  actions: {
    async init() {
      const syncStore = useSyncStore()
      const token = syncStore.loadFromLocalStorage('token')
      if (token) {
        try {
          const authData = await pb.collection('users').authRefresh()
          this.setSession(authData)
        } catch (error) {
          this.logout()
        }
      }
    },

    async login(usernameOrEmail, password, rememberMe = false) {
      const syncStore = useSyncStore()
      if (this.loading) return // Prevent multiple calls while loading
      this.loading = true

      const snackbarStore = useSnackbarStore()
      const profileStore = useProfileStore()
      const haciendaStore = useHaciendaStore()
      const planStore = usePlanStore()
      const actividadesStore = useActividadesStore()
      const zonasStore = useZonasStore()
      const siembrasStore = useSiembrasStore()

      if (!syncStore.isOnline) {
        throw new Error('Se requiere conexión a internet para el primer inicio de sesión')
      }

      snackbarStore.showLoading()

      try {
        const authData = await pb.collection('users').authWithPassword(usernameOrEmail, password)

        if (pb.authStore.isValid) {
          profileStore.setUser(authData.record)

          this.setSession(authData)

          console.log('usuario:', profileStore.user)
          console.log('isLoggedIn:', this.isLoggedIn)
          console.log('token:', this.token)

          await planStore.fetchAvailablePlans()
          await haciendaStore.fetchHacienda(authData.record.hacienda)
          await siembrasStore.cargarSiembras()
          await zonasStore.init()
          await actividadesStore.init()

          router.push('/dashboard') // Navigate to dashboard.vue
          if (rememberMe) {
            syncStore.saveToLocalStorage('token', this.token)
            syncStore.saveToLocalStorage('user', authData.record)
          }

          //    await syncStore.queueOperation({ type: 'login', data: { usernameOrEmail, password } })
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

    setSession(authData) {
      this.user = authData.record
      this.token = pb.authStore.token
      this.isLoggedIn = true

      const syncStore = useSyncStore()
      syncStore.init()
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
        console.log('Token encontrado en localStorage:', token)
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

    async logout() {
      const snackbarStore = useSnackbarStore()
      //    const syncStore = useSyncStore()

      try {
        router.push('/dashboard')
        //     pb.authStore.clear()
        //    this.user = null
        this.token = null
        this.isLoggedIn = false

        // Limpiar todo el localStorage
        localStorage.clear()

        // O si prefieres usar syncStore para mantener la consistencia
        // syncStore.removeFromLocalStorage('token')
        // syncStore.removeFromLocalStorage('user')
        // syncStore.removeFromLocalStorage('rememberMe')
        // syncStore.removeFromLocalStorage('zonas')
        // syncStore.removeFromLocalStorage('tiposZonas')
        // syncStore.removeFromLocalStorage('actividades')
        // syncStore.removeFromLocalStorage('tiposActividades')
        // syncStore.removeFromLocalStorage('siembras')

        snackbarStore.showSnackbar('Logged out successfully', 'success')

        // Redirigir después de limpiar el estado
      } catch (error) {
        console.error('Error during logout:', error)
        snackbarStore.showSnackbar('Error al cerrar sesión', 'error')
      }
    }
  }
})

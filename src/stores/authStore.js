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
import { useRecordatoriosStore } from '@/stores/recordatoriosStore'
import { useProgramacionesStore } from '@/stores/programacionesStore'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    registrationSuccess: false,
    loading: false,
    user: null,
    token: null,
    isLoggedIn: false,
    rememberMe: null,
    showLoginDialog: false
  }),

  actions: {
    async init() {
      const syncStore = useSyncStore()

      // Usar la misma clave que se usa al guardar
      const authData = syncStore.loadFromLocalStorage('pocketbase_auth')

      if (authData) {
        try {
          // Restaurar el estado de autenticación en PocketBase
          pb.authStore.save(authData.token, authData)

          // Si se restauró correctamente, intentar actualizar con el servidor
          if (pb.authStore.isValid) {
            try {
              // Intentar refrescar la autenticación con el servidor
              const freshAuthData = await pb.collection('users').authRefresh()
              this.setSession(freshAuthData)
              return true
            } catch (refreshError) {
              // Si falla el refresh pero tenemos datos válidos localmente, usar esos
              console.log('No se pudo actualizar la sesión con el servidor. Usando datos locales.')
              this.setSession({ record: authData })
              return true
            }
          }
        } catch (error) {
          console.error('Error restaurando sesión:', error)
          this.logout()
          return false
        }
      }
      return false
    },

    async login(username, email, password, rememberMe = false) {
      const syncStore = useSyncStore()
      if (this.loading) return // Prevent multiple calls while loading
      this.loading = true

      const snackbarStore = useSnackbarStore()

      if (!syncStore.isOnline) {
        throw new Error('Se requiere conexión a internet para el primer inicio de sesión')
      }

      snackbarStore.showLoading()

      try {
        // Intentar login con username primero
        if (username) {
          const authData = await pb
            .collection('users')
            .authWithPassword(username.toUpperCase(), password)
          if (pb.authStore.isValid) {
            this.handleSuccessfulLogin(authData, rememberMe)
            return true
          }
        }

        // Si falla con username, intentar con email
        if (email) {
          const authData = await pb.collection('users').authWithPassword(email, password)
          if (pb.authStore.isValid) {
            this.handleSuccessfulLogin(authData, rememberMe)
            return true
          }
        }

        throw new Error('Invalid credentials')
      } catch (error) {
        handleError(error, 'Invalid credentials')
        return false
      } finally {
        this.loading = false
        snackbarStore.hideLoading()
      }
    },

    async handleSuccessfulLogin(authData, rememberMe = false) {
      // Set auth state
      this.setSession(authData)
      const syncStore = useSyncStore()

      // Guardar datos de autenticación en localStorage
      syncStore.saveToLocalStorage('pocketbase_auth', pb.authStore.model, true) // Siempre usar localStorage
      syncStore.saveToLocalStorage('last_auth_success', Date.now(), true)

      // RESTAURAR EL FLUJO ORIGINAL: primero inicializar syncStore
      // y luego cargar los demás stores
      syncStore.init()

      const profileStore = useProfileStore()
      const haciendaStore = useHaciendaStore()
      const planStore = usePlanStore()
      const actividadesStore = useActividadesStore()
      const zonasStore = useZonasStore()
      const siembrasStore = useSiembrasStore()
      const recordatoriosStore = useRecordatoriosStore()
      const programacionesStore = useProgramacionesStore()

      // Load user profile
      profileStore.setUser(authData.record)

      // Load hacienda data
      if (authData.record.hacienda) {
        await haciendaStore.fetchHacienda(authData.record.hacienda)
      }

      // Load other necessary data in sequence to avoid race conditions
      try {
        await planStore.fetchAvailablePlans()
        await actividadesStore.init()
        await zonasStore.init()
        await siembrasStore.init()
        await recordatoriosStore.init()
        await programacionesStore.init()
      } catch (error) {
        handleError(error, 'Error loading initial data')
      }

      // Redirect to dashboard
      router.push('/dashboard')
    },

    setSession(authData) {
      this.user = authData.record
      this.token = pb.authStore.token
      this.isLoggedIn = true
    },

    async register(formData, new_role) {
      const snackbarStore = useSnackbarStore()
      const validationStore = useValidationStore()
      const haciendaStore = useHaciendaStore()
      const planStore = usePlanStore()

      snackbarStore.showLoading()

      try {
        // Obtener plan gratuito
        const gratisPlan = await planStore.getGratisPlan()
        if (!gratisPlan || !gratisPlan.id) {
          throw new Error('No se pudo obtener el plan gratuito')
        }

        // Crear hacienda
        const newHacienda = await haciendaStore.createHacienda(formData.hacienda, gratisPlan.id)

        // Crear usuario
        const userData = this.createUserData(
          formData.username,
          formData.email,
          formData.firstname,
          formData.lastname,
          formData.password,
          new_role,
          newHacienda.id,
          false
        )

        await pb.collection('users').create(userData)

        // Enviar email de verificación
        await this.sendVerificationEmail(formData.email)

        snackbarStore.showSnackbar(
          'Registrado con éxito. Por favor, verifique su email.',
          'success'
        )
        this.registrationSuccess = true
      } catch (error) {
        this.registrationSuccess = false
        handleError(error, 'Error en el registro')
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
          'Email confirmado exitosamente! Ya puede iniciar sesión.',
          'success'
        )
        return true
      } catch (error) {
        handleError(error, 'Error al confirmar el email')
        throw error
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

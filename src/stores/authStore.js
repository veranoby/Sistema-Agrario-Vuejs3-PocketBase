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
    showLoginDialog: false,
    initialized: false
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
              // Solo refrescar si realmente es necesario
              if (this.tokenNeedsRefresh()) {
                // Intentar refrescar la autenticación con el servidor
                const freshAuthData = await pb.collection('users').authRefresh()
                this.setSession(freshAuthData)

                // Si hay rememberMe, reiniciar el timer de refresco
                const rememberMe = syncStore.loadFromLocalStorage('rememberMe')
                if (rememberMe) {
                  this.startRefreshTimer()
                }

                return true
              } else {
                // No necesitamos refrescar, usar datos actuales
                this.setSession({ record: authData })

                // Si hay rememberMe, reiniciar el timer de refresco
                const rememberMe = syncStore.loadFromLocalStorage('rememberMe')
                if (rememberMe) {
                  this.startRefreshTimer()
                }

                return true
              }
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

    // Método para iniciar el timer de refresco
    startRefreshTimer() {
      // Detener cualquier timer existente primero
      this.stopRefreshTimer()

      // Refrescar cada 15 minutos
      // Esta frecuencia debe ajustarse según la expiración configurada en PocketBase
      this.refreshTimer = setInterval(
        async () => {
          if (this.isLoggedIn) {
            try {
              // Solo intentar refrescar si es necesario
              if (this.tokenNeedsRefresh()) {
                await this.refreshToken()
              }
            } catch (error) {
              console.error('Error en refresco automático:', error)
            }
          } else {
            // Si ya no estamos logueados, detener el timer
            this.stopRefreshTimer()
          }
        },
        15 * 60 * 1000
      ) // 15 minutos
    },

    // Método para detener el timer de refresco
    stopRefreshTimer() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },

    async login(username, email, password, rememberMe = false) {
      const syncStore = useSyncStore()
      if (this.loading) return // Prevent multiple calls while loading
      this.loading = true

      const snackbarStore = useSnackbarStore()

      if (!syncStore.isOnline) {
        this.loading = false
        throw new Error('Se requiere conexión a internet para el primer inicio de sesión')
      }

      snackbarStore.showLoading()

      try {
        let authData = null

        // Intentar login con username primero
        if (username) {
          try {
            authData = await pb
              .collection('users')
              .authWithPassword(username.toUpperCase(), password)
            if (pb.authStore.isValid) {
              this.handleSuccessfulLogin(authData, rememberMe)
              return true
            }
          } catch (error) {
            console.log('Error al intentar login con username:', error)
            // Continuamos intentando con email
          }
        }

        // Si falla con username o no se proporcionó username, intentar con email
        if (email && !authData) {
          try {
            authData = await pb.collection('users').authWithPassword(email, password)
            if (pb.authStore.isValid) {
              this.handleSuccessfulLogin(authData, rememberMe)
              return true
            }
          } catch (error) {
            console.log('Error al intentar login con email:', error)
            // Si llegamos aquí, ambos intentos fallaron
          }
        }

        // Si llegamos aquí sin haber obtenido authData, es porque fallaron ambos intentos
        if (!authData) {
          throw new Error('Credenciales incorrectas')
        }

        return true
      } catch (error) {
        handleError(error, 'Credenciales incorrectas')
        return false
      } finally {
        this.loading = false
        snackbarStore.hideLoading()
      }
    },

    async refreshToken() {
      const syncStore = useSyncStore()

      // Verificar si el token es válido antes de intentar refrescarlo
      if (!pb.authStore.isValid) {
        // No tenemos token válido
        return false
      }

      // Verificar si el token está por expirar
      const token = pb.authStore.token
      if (token) {
        try {
          // Solo refrescar si es necesario
          const needsRefresh = this.tokenNeedsRefresh()

          if (needsRefresh) {
            const freshAuthData = await pb.collection('users').authRefresh()
            this.setSession(freshAuthData)

            // Actualizar token en localStorage
            syncStore.saveToLocalStorage('pocketbase_auth', pb.authStore.model)
            syncStore.saveToLocalStorage('last_auth_success', Date.now())

            return true
          }

          // Token todavía válido y no necesita ser refrescado
          return true
        } catch (error) {
          console.error('Error al refrescar token:', error)
          return false
        }
      }

      return false
    },

    // Método para determinar si el token necesita ser refrescado
    tokenNeedsRefresh() {
      const syncStore = useSyncStore()

      // Obtener timestamp del último login exitoso
      const lastSuccess = syncStore.loadFromLocalStorage('last_auth_success')

      if (!lastSuccess) {
        // Si no hay registro, asumimos que sí necesita refresco
        return true
      }

      const now = Date.now()
      const timeSinceLastSuccess = now - lastSuccess

      // Refrescar si han pasado más de 20 minutos desde el último éxito
      // Ajustar este tiempo según la configuración de expiración de token de PocketBase
      const refreshThreshold = 20 * 60 * 1000 // 20 minutos

      return timeSinceLastSuccess > refreshThreshold
    },

    async handleSuccessfulLogin(authData, rememberMe = false) {
      // Set auth state
      this.setSession(authData)
      const syncStore = useSyncStore()

      // Guardar datos de autenticación usando syncStore
      syncStore.saveToLocalStorage('pocketbase_auth', pb.authStore.model)
      syncStore.saveToLocalStorage('last_auth_success', Date.now())

      // Si rememberMe es true, guardar información mínima necesaria para auto-login
      if (rememberMe) {
        const credentials = {
          usernameOrEmail: authData.record.username || authData.record.email,
          // No guardamos la password completa, solo un indicador
          tokenOnly: true,
          timestamp: Date.now()
        }
        syncStore.saveToLocalStorage('rememberMe', credentials)

        // También iniciar el timer de refresco
        this.startRefreshTimer()
      } else {
        syncStore.removeFromLocalStorage('rememberMe')
      }

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
        if (!formData.hacienda) {
          const newHacienda = await haciendaStore.createHacienda(formData.hacienda, gratisPlan.id)
          formData.hacienda = newHacienda.id
        }

        // Crear usuario
        const userData = this.createUserData(
          formData.username,
          formData.email,
          formData.firstname,
          formData.lastname,
          formData.password,
          new_role,
          formData.hacienda,
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
      const syncStore = useSyncStore()

      try {
        // Detener el timer de refresco si está activo
        this.stopRefreshTimer()

        // Limpiar datos de autenticación
        pb.authStore.clear()
        this.user = null
        this.token = null
        this.isLoggedIn = false

        // Limpiar datos en syncStore
        syncStore.removeFromLocalStorage('pocketbase_auth')
        syncStore.removeFromLocalStorage('rememberMe')
        syncStore.removeFromLocalStorage('last_auth_success')
        localStorage.clear

        // Redirigir
        router.push('/')
        snackbarStore.showSnackbar('Logged out successfully', 'success')
      } catch (error) {
        console.error('Error during logout:', error)
        snackbarStore.showSnackbar('Error al cerrar sesión', 'error')
      }
    }
  }
})

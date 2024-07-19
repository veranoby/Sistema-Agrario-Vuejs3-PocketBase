import { defineStore } from 'pinia'
import PocketBase from 'pocketbase'
import { useSnackbarStore } from './snackbarStore'
import router from '@/router'

const pb = new PocketBase('http://127.0.0.1:8090')

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    isLoggedIn: false
  }),
  actions: {
    async login(usernameOrEmail, password, rememberMe = false) {
      const snackbarStore = useSnackbarStore()

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
    async register(username, email, firstname, lastname, password, hacienda) {
      const data = {
        username,
        email,
        firstname,
        lastname,
        hacienda,
        password,
        passwordConfirm: password,
        roles: 'administrador'
      }

      try {
        await pb.collection('users').create(data)
        useSnackbarStore().showSnackbar(
          'Registrado con exito. Por favor, consulte su correo electronico para confirmacion.',
          'success'
        )
      } catch (error) {
        useSnackbarStore().showSnackbar('Error de registro: ' + error.message, 'error')
      }
    },
    async confirmEmail(token) {
      try {
        await pb.collection('users').authConfirm(token)
        useSnackbarStore().showSnackbar('Email confirmed successfully!', 'success')
        router.push('/login')
      } catch (error) {
        useSnackbarStore().showSnackbar('Error confirming email: ' + error.message, 'error')
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

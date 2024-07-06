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
    async register(username, email, password) {
      const snackbarStore = useSnackbarStore()

      try {
        const data = {
          username,
          email,
          password,
          passwordConfirm: password
        }

        const record = await pb.collection('users').create(data)
        console.log('Registration successful:', record)

        await this.login(email, password)
        snackbarStore.showSnackbar('Registration successful!', 'success')
        router.push('/dashboard')
      } catch (error) {
        snackbarStore.showSnackbar('Registration failed: ' + error.message, 'error')
        console.error('Registration error:', error)
        throw error
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

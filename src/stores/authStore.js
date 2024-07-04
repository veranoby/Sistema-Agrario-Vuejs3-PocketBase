import { defineStore } from 'pinia'
import axios from 'axios'

import PocketBase from 'pocketbase'
import { useRouter } from 'vue-router' // Add this import

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    isLoggedIn: false
  }),
  actions: {
    async login(usernameOrEmail, password) {
      const pb = new PocketBase('http://127.0.0.1:8090') // Replace with your PocketBase URL
      const router = useRouter() // Get the router instance

      try {
        const response = await pb.collection('users').authWithPassword(usernameOrEmail, password)

        if (pb.authStore.isValid) {
          this.user = pb.authStore.model.id
          this.token = response.token
          this.isLoggedIn = true

          // Navigation
          router.push('/dashboard') // Assuming you have a dashboard route
          console.log('router:' + this.$router)

          // Success Message (using injected $toast)
          this.$toast.success('Login successful!')
        } else {
          console.log('Login failed:' + pb.authStore.message)
          // Display error message (refer to Login Failures section)
        }
      } catch (error) {
        console.log('Login error:', error)
        // Handle API call errors (refer to Error Handling Mechanisms section)
      }
    },
    async register(name, email, password) {
      const router = useRouter() // Get the router instance

      const url = 'http://localhost:8090/auth/register' // Replace with your PocketBase registration URL
      const data = {
        name,
        email,
        password
      }

      try {
        const response = await axios.post(url, data)

        if (response.data.status === 200) {
          // Assuming the API returns user data and token upon successful registration
          this.user = response.data.user
          this.token = response.data.token
          this.isLoggedIn = true
          console.log('Registration successful!')

          // Navigation
          router.push('/dashboard')

          // Success Message (using injected $toast)
          this.$toast.success('Registration successful!')
        } else {
          console.error('Registration failed:', response.data.message)
          // Display error message
          // Display error message using injected $toast
          this.$toast.error('An error occurred during registration. Please try again later.')
        }
      } catch (error) {
        console.error('Registration error:', error)
        // Handle API call errors using injected $toast
        this.$toast.error('An error occurred during registration. Please try again later.')
      }
    },
    logout() {
      this.user = null
      this.token = null
      this.isLoggedIn = false

      // Redirect to login page or handle logout logic
      this.$router.push('/login')
    }
  },
  setup() {}
})

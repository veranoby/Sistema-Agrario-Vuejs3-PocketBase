import { defineStore } from 'pinia'
import PocketBase from 'pocketbase'
import { useSnackbarStore } from './snackbarStore'
import router from '@/router'

const pb = new PocketBase('http://127.0.0.1:8090')

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    mi_hacienda: null,
    token: null,
    isLoggedIn: false,
    registrationSuccess: false
  }),

  getters: {
    avatarUrl: (state) => {
      //profilestore.js
      if (state.user && state.user.avatar) {
        return `${pb.baseUrl}/api/files/${state.user.collectionName}/${state.user.id}/${state.user.avatar}`
      }
      return '../assets/placeholder-user.jpg'
    }
  },

  actions: {
    async fetchHaciendaUsers() {
      //haciendastore.js
      try {
        const users = await pb.collection('users').getFullList({
          filter: `hacienda = "${this.mi_hacienda.id}" && role != "administrador"`,
          sort: 'created'
        })
        return users
      } catch (error) {
        console.error('Error fetching hacienda users:', error)
        throw error
      }
    },

    async createHaciendaUser(userData) {
      //haciendastore.js
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const newUser = await pb.collection('users').create(userData)
        snackbarStore.showSnackbar('User created successfully', 'success')
        return newUser
      } catch (error) {
        console.error('Error creating hacienda user:', error)
        snackbarStore.showSnackbar('Failed to create user: ' + error.message, 'error')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async deleteHaciendaUser(userId) {
      //haciendastore.js
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        await pb.collection('users').delete(userId)
        snackbarStore.showSnackbar('User deleted successfully', 'success')
      } catch (error) {
        console.error('Error deleting hacienda user:', error)
        snackbarStore.showSnackbar('Failed to delete user: ' + error.message, 'error')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async fetchAvailablePlans() {
      //planstore.js
      try {
        const plans = await pb.collection('planes').getFullList({
          sort: 'precio'
        })
        return plans
      } catch (error) {
        console.error('Error fetching available plans:', error)
        throw error
      }
    },

    async changePlan(newPlanId) {
      //planstore.js
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const currentPlan = this.mi_hacienda.plan
        const newPlan = await pb.collection('planes').getOne(newPlanId)

        if (
          newPlan.nombre === 'gratis' ||
          (currentPlan && currentPlan.auditores > newPlan.auditores) ||
          (currentPlan && currentPlan.operadores > newPlan.operadores)
        ) {
          const confirmReset = await this.confirmUserReset()
          if (!confirmReset) {
            throw new Error('Plan change cancelled')
          }
          await this.resetHaciendaUsers()
        }

        const updatedHacienda = await pb.collection('HaciendaLabel').update(this.mi_hacienda.id, {
          plan: newPlanId
        })

        this.mi_hacienda = updatedHacienda
        snackbarStore.showSnackbar('Plan updated successfully', 'success')
      } catch (error) {
        console.error('Error changing plan:', error)
        snackbarStore.showSnackbar('Failed to change plan: ' + error.message, 'error')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async confirmUserReset() {
      //planstore.js
      return new Promise((resolve) => {
        if (
          confirm(
            'This will reset the auditores and operadores users. Are you sure you want to continue?'
          )
        ) {
          resolve(true)
        } else {
          resolve(false)
        }
      })
    },

    async resetHaciendaUsers() {
      //planstore.js
      try {
        const users = await pb.collection('users').getFullList({
          filter: `hacienda = "${this.mi_hacienda.id}" && role != "administrador"`
        })

        for (const user of users) {
          await pb.collection('users').delete(user.id)
        }
      } catch (error) {
        console.error('Error resetting hacienda users:', error)
        throw error
      }
    },

    async changePassword(oldPassword, newPassword) {
      //profilestore.js
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        await pb.collection('users').update(this.user.id, {
          oldPassword: oldPassword,
          password: newPassword,
          passwordConfirm: newPassword
        })
        snackbarStore.showSnackbar('Password changed successfully', 'success')
      } catch (error) {
        console.error('Error changing password:', error)
        let errorMessage = 'Failed to change password'
        if (error.data && error.data.data) {
          const errors = error.data.data
          if (errors.oldPassword) {
            errorMessage = 'Old password error: ' + errors.oldPassword.message
          } else if (errors.password) {
            errorMessage = 'New password error: ' + errors.password.message
          }
        }
        snackbarStore.showSnackbar(errorMessage, 'error')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateProfile(profileData) {
      //profilestore.js
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const updatedUser = await pb.collection('users').update(this.user.id, profileData)
        this.user = updatedUser
        snackbarStore.showSnackbar('Profile updated successfully', 'success')
      } catch (error) {
        console.error('Error updating profile:', error)
        let errorMessage = 'Failed to update profile'
        if (error.data && error.data.data) {
          const errors = error.data.data
          if (errors.username) {
            errorMessage = 'Username error: ' + errors.username.message
          } else if (errors.email) {
            errorMessage = 'Email error: ' + errors.email.message
          }
        }
        snackbarStore.showSnackbar(errorMessage, 'error')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateHacienda(haciendaData) {
      //haciendastore.js
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const updatedHacienda = await pb
          .collection('HaciendaLabel')
          .update(this.mi_hacienda.id, haciendaData)
        this.mi_hacienda = updatedHacienda
        snackbarStore.showSnackbar('Hacienda information updated successfully', 'success')
      } catch (error) {
        console.error('Error updating hacienda:', error)
        let errorMessage = 'Failed to update hacienda information'
        if (error.data && error.data.data) {
          const errors = error.data.data
          if (errors.name) {
            errorMessage = 'Hacienda name error: ' + errors.name.message
          }
        }
        snackbarStore.showSnackbar(errorMessage, 'error')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async updateAvatar(file) {
      //ProfileStore.js
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const formData = new FormData()
        formData.append('avatar', file)

        const updatedUser = await pb.collection('users').update(this.user.id, formData)
        this.user = updatedUser
        snackbarStore.showSnackbar('Avatar updated successfully', 'success')
      } catch (error) {
        console.error('Error updating avatar:', error)
        snackbarStore.showSnackbar('Failed to update avatar: ' + error.message, 'error')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async login(usernameOrEmail, password, rememberMe = false) {
      //authstore.js
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        const authData = await pb.collection('users').authWithPassword(usernameOrEmail, password)

        if (pb.authStore.isValid) {
          //COMIENZO A CARGAR LA INFO IMPORTANTE DEL USUARIO PARA TODOS LOS COMPONENTES:
          this.user = authData.record
          console.log('usuario:', this.user)

          this.token = authData.token
          this.isLoggedIn = true

          try {
            const hacienda = await pb.collection('HaciendaLabel').getOne(this.user.hacienda)
            console.log('hacienda:', hacienda)
            this.mi_hacienda = hacienda // Store the entire hacienda object
          } catch (haciendaError) {
            console.error('Error fetching hacienda:', haciendaError)
            snackbarStore.showSnackbar('Error loading hacienda information', 'error')
          }

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

    async checkUsernameTaken(username) {
      //validationstore.js
      try {
        const result = await pb.collection('users').getList(1, 1, {
          filter: `username = "${username}"`
        })
        console.log(' result username:', result)

        if (result.totalItems === 0) {
          // Returns true if username is available (not taken)
          return true
        } else {
          this.handleRegistrationError('USERNAME_TAKEN')
          return false
        }
      } catch (error) {
        this.handleRegistrationError('USERNAME_TAKEN')
        console.error('Error checking username:', error)
        return false // Assume username is taken if there's an error
      }
    },

    async checkEmailTaken(email) {
      //validationstore.js
      try {
        const result = await pb.collection('users').getList(1, 1, {
          filter: `email = "${email}"`
        })
        console.log('result emailCheck:', result)

        if (result.totalItems === 0) {
          // Returns true if email is available (not taken)
          return true
        } else {
          this.handleRegistrationError('EMAIL_TAKEN')
          return false
        }
      } catch (error) {
        this.handleRegistrationError('EMAIL_TAKEN')
        console.error('Error checking email:', error)
        return false // Assume email is taken if there's an error
      }
    },

    async checkHaciendaTaken(hacienda) {
      //validationstore.js
      try {
        const result = await pb.collection('HaciendaLabel').getList(1, 1, {
          filter: `name = "${hacienda.toUpperCase()}"`
        })
        console.log('Chequeando hacienda:', hacienda)
        console.log('result haciendaCheck:', result)

        if (result.totalItems === 0) {
          // Returns true if hacienda is available (not taken)
          return true
        } else {
          this.handleRegistrationError('HACIENDA_TAKEN')
          return false
        }
      } catch (error) {
        this.handleRegistrationError('HACIENDA_TAKEN')

        console.error('Error checking hacienda:', error)
        return false // Assume hacienda is taken if there's an error
      }
    },

    async createHacienda(hacienda) {
      //haciendastore.js
      const haciendaData = {
        name: hacienda,
        location: '',
        info: ''
      }
      return await pb.collection('HaciendaLabel').create(haciendaData)
    },

    createUserData(username, email, firstname, lastname, password, roletemp, haciendatemp) {
      //authstore.js
      if (haciendatemp == 1) {
        return {
          username,
          email,
          emailVisibility: true,
          password,
          passwordConfirm: password,
          name: firstname,
          lastname,
          role: roletemp,
          info: 'Usuario de hacienda'
        }
      } else {
        return {
          username,
          email,
          emailVisibility: true,
          password,
          passwordConfirm: password,
          name: firstname,
          lastname,
          role: roletemp,
          info: 'Usuario de hacienda',
          hacienda: haciendatemp
        }
      }
    },

    async register({ username, email, firstname, lastname, password, hacienda }) {
      //authstore.js
      const snackbarStore = useSnackbarStore()
      snackbarStore.showLoading()

      try {
        // If all checks pass, proceed with creating hacienda and user
        const userData = this.createUserData(
          username,
          email,
          firstname,
          lastname,
          password,
          'administrador',
          1
        )

        // If user creation is successful, create the hacienda
        const record = await pb.collection('users').create(userData)

        const newHacienda = await this.createHacienda(hacienda.toUpperCase())

        // Update the user with the actual hacienda ID
        await pb.collection('users').update(record.id, {
          hacienda: newHacienda.id
        })

        // Send a verification email
        await this.sendVerificationEmail(email)

        snackbarStore.showSnackbar(
          'Registrado con éxito. Por favor, consulte su correo electrónico para confirmación.',
          'success'
        )
        console.log('record:', record)
        this.registrationSuccess = true
      } catch (error) {
        this.registrationSuccess = false
        this.handleRegistrationError(error)
        throw error // Re-throw the error to be caught in the component
      } finally {
        snackbarStore.hideLoading()
      }
    },

    handleRegistrationError(error) {
      //validationstore.js
      const snackbarStore = useSnackbarStore()
      let errorMessage

      console.log('error:', error)

      switch (error) {
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
          errorMessage = 'Error de registro: '

          if (error.data && error.data.data) {
            // Handle PocketBase validation errors
            const errors = error.data.data
            if (errors.username) {
              errorMessage = 'Username error: ' + errors.username.message
            } else if (errors.email) {
              errorMessage = 'Email error: ' + errors.email.message
            } else {
              errorMessage = 'Registration error: '
            }
          } else {
            errorMessage += error.message || 'Unknown error'
          }
      }
      snackbarStore.showSnackbar(errorMessage, 'error')
      console.log(errorMessage)
      //throw new Error(errorMessage)
    },

    async sendVerificationEmail(email) {
      //authstore.js
      try {
        await pb.collection('users').requestVerification(email)
        return true
      } catch (error) {
        console.error('Error sending verification email:', error)
        throw new Error('Failed to send verification email')
      }
    },

    async confirmEmail(token) {
      //authstore.js
      const snackbarStore = useSnackbarStore()

      try {
        await pb.collection('users').confirmVerification(token)
        snackbarStore.showSnackbar(
          'Email confirmed successfully! You can now log in with your credentials.',
          'success'
        )
        //  router.push('/login')
      } catch (error) {
        console.error('Error confirming email:', error)
        snackbarStore.showSnackbar('Failed to confirm email: ' + error.message, 'error')
        throw error
      } finally {
        snackbarStore.hideLoading()
      }
    },

    async checkAuth() {
      //authstore.js
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const authData = await pb.collection('users').authRefresh()
          this.user = authData.record
          this.token = authData.token
          this.isLoggedIn = true
        } catch (error) {
          localStorage.removeItem('token')
          this.logout()
        }
      }
    },
    logout() {
      //authstore.js
      const snackbarStore = useSnackbarStore()

      snackbarStore.showLoading()

      pb.authStore.clear()
      this.user = null
      this.token = null
      this.isLoggedIn = false

      localStorage.removeItem('rememberMe')
      localStorage.removeItem('token')

      snackbarStore.showSnackbar('Logged out successfully', 'success')
      router.push('/')
    }
  }
})

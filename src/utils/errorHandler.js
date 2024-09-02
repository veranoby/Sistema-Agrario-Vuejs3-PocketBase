import { useSnackbarStore } from '@/stores/snackbarStore'

export function handleError(error, defaultMessage = 'An error occurred') {
  const snackbarStore = useSnackbarStore()

  let errorMessage = defaultMessage

  if (error.data && error.data.message) {
    errorMessage = error.data.message
  } else if (error.message) {
    errorMessage = error.message
  }

  console.log('entrada error:', error.data)

  if (error.data && error.data.data) {
    const errors = error.data.data
    if (errors.username) {
      console.log('errors.username:', errors.username)
      errorMessage += ': ' + errors.username.message
    } else if (errors.email) {
      console.log('errors.email:', errors.email)

      errorMessage += ': ' + errors.email.message
    } else if (errors.password) {
      console.log('errors.password:', errors.password)
      errorMessage += ': ' + errors.password.message
    } else if (errors.oldPassword) {
      console.log('errors.oldPassword:', errors.oldPassword)
      errorMessage = 'Old password error: ' + errors.oldPassword.message
    }
  }

  console.log('error fuera de filtro:', error)
  snackbarStore.showSnackbar(errorMessage, 'error')
}

import { useAuthStore } from '@/stores/authStore'
import { PERMISSIONS, hasPermission } from '@/constants/permissions'

export const vRole = {
  mounted(el, binding) {
    checkPermission(el, binding)
  },
  updated(el, binding) {
    checkPermission(el, binding)
  }
}

function checkPermission(el, binding) {
  const authStore = useAuthStore()
  const userRole = authStore.userRole

  const action = binding.value // e.g. 'FINANZAS_EDIT' or ['admin', 'tecnico']
  
  let requiredRoles = []
  
  if (typeof action === 'string' && PERMISSIONS[action]) {
    requiredRoles = PERMISSIONS[action]
  } else if (Array.isArray(action)) {
    requiredRoles = action
  } else if (typeof action === 'string') {
    requiredRoles = [action] // Just a direct role string
  }

  const hasAccess = hasPermission(userRole, requiredRoles)

  if (!hasAccess) {
    // Hide element visually
    el.style.display = 'none'
  } else {
    // Restore display if it was previously hidden
    el.style.display = '' 
  }
}

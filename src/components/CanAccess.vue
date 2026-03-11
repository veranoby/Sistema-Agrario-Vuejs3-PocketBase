<template>
  <slot v-if="canAccess" />
  <slot v-else-if="showFallback" name="fallback" />
</template>

<script>
/**
 * CanAccess Component - Role-Based UI Conditional Rendering
 * 
 * Usage:
 * <CanAccess :roles="['administrador', 'auditor']">
 *   <v-btn @click="deleteItem">Delete</v-btn>
 * </CanAccess>
 * 
 * <CanAccess module="finanzas">
 *   <FinanceDashboard />
 *   <template #fallback>
 *     <div>Module not available</div>
 *   </template>
 * </CanAccess>
 */
import { computed, defineComponent } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'

export default defineComponent({
  name: 'CanAccess',
  
  props: {
    // Array of roles that can access this content
    roles: {
      type: Array,
      default: null
    },
    
    // Specific role (shorthand for :roles="[role]")
    role: {
      type: String,
      default: null
    },
    
    // Module name for marketplace-based access
    module: {
      type: String,
      default: null
    },
    
    // Show fallback content when access denied
    showFallback: {
      type: Boolean,
      default: false
    },
    
    // Require exact role match (no hierarchy)
    exact: {
      type: Boolean,
      default: false
    }
  },
  
  setup(props) {
    const authStore = useAuthStore()
    const haciendaStore = useHaciendaStore()
    
    const userRole = computed(() => authStore.user?.role || '')
    
    // Role hierarchy: superadmin > administrador > auditor > operador
    const ROLE_HIERARCHY = {
      superadmin: 4,
      administrador: 3,
      auditor: 2,
      operador: 1
    }
    
    const hasRolePermission = computed(() => {
      if (!props.roles && !props.role) {
        // No role requirement, check module only
        return true
      }
      
      const requiredRoles = props.roles || [props.role]
      
      if (props.exact) {
        // Exact role match required
        return requiredRoles.includes(userRole.value)
      }
      
      // Check role hierarchy
      const userLevel = ROLE_HIERARCHY[userRole.value] || 0
      
      // Check if user has any of the required roles or higher
      for (const requiredRole of requiredRoles) {
        const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0
        
        // If user has same or higher role level
        if (userLevel >= requiredLevel) {
          return true
        }
      }
      
      return false
    })
    
    const hasModuleAccess = computed(() => {
      if (!props.module) {
        return true
      }
      
      return haciendaStore.isModuleActive(props.module)
    })
    
    const canAccess = computed(() => {
      // Must pass both role and module checks
      return hasRolePermission.value && hasModuleAccess.value
    })
    
    return {
      canAccess,
      userRole
    }
  }
})
</script>

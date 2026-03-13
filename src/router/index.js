import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import HomeComp from '@/components/Home.vue'
import AboutUs from '@/components/AboutUs.vue'
import OurPlans from '@/components/OurPlans.vue'
import DocumentationComponent from '@/components/Documentation.vue'
import ContactUs from '@/components/ContactUs.vue'
import FAQ from '@/components/FAQ.vue'
import EmailConfirmation from '@/components/Confirmation.vue'

// Role definitions
const ROLES = {
  SUPERADMIN: 'superadmin', // Future: multi-tenant admin
  ADMINISTRADOR: 'administrador', // Hacienda admin
  AUDITOR: 'auditor', // Read-only with BPA audit permissions
  OPERADOR: 'operador' // Field worker, limited permissions
}

// Route access matrix by role
const ROUTE_ROLE_MATRIX = {
  // Public routes - no auth required
  public: ['/', '/about', '/plans', '/documentation', '/contact', '/faq'],
  
  // Admin-only routes
  admin: ['/admin'], // Future: Super admin panel
  
  // Hacienda management - administrador + auditor
  hacienda: ['/siembras', '/zonas', '/actividades', '/programaciones', '/recordatorios'],
  
  // Financial management - administrador only
  finanzas: ['/finanzas'],
  
  // User profile - all authenticated users
  profile: ['/profile', '/dashboard']
}

const routes = [
  { path: '/', component: HomeComp },
  { path: '/about', component: AboutUs },
  { path: '/plans', component: OurPlans },
  { path: '/documentation', component: DocumentationComponent },
  { path: '/contact', component: ContactUs },
  { path: '/faq', component: FAQ },
  {
    path: '/profile',
    component: () => import('@/components/UserProfile.vue'),
    name: 'Perfil de Usuario',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/auth/confirm-verification/:token?',
    component: EmailConfirmation,
    name: 'EmailConfirmation'
  },
  {
    path: '/auth/reset-password/:token',
    component: () => import('@/components/PasswordReset.vue'),
    name: 'PasswordReset'
  },
  {
    path: '/dashboard',
    component: () => import('@/components/Dashboard.vue'),
    name: 'Dashboard de Inicio',
    meta: { 
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/siembras',
    component: () => import('@/components/SiembrasConfig.vue'),
    name: 'Gestion de Siembras y Proyectos',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/siembras/:id',
    component: () => import('@/components/SiembraWorkspace.vue'),
    name: 'Ver Siembra/Proyecto',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/actividades',
    component: () => import('@/components/actividadesConfig.vue'),
    name: 'Gestion de Actividades',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/actividades/:id',
    component: () => import('@/components/actividadesWorkspace.vue'),
    name: 'Ver Actividad',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },

  {
    path: '/programaciones',
    component: () => import('@/components/ProgramacionesList.vue'),
    name: 'Gestion de Programas de Actividades',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/zonas',
    component: () => import('@/components/zonasConfig.vue'),
    name: 'Gestion de Zonas de trabajo',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/finanzas',
    component: () => import('@/components/FinanzasConfig.vue'),
    name: 'Gestion rapida financiera',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR], // Operador NO puede ver finanzas
      module: 'finanzas' // For module-based access control
    }
  },
  {
    path: '/recordatorios',
    component: () => import('@/components/Recordatorios.vue'),
    name: 'Gestion de Recordatorios y Emergencias',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  }
  // Future: Super Admin Dashboard
  // {
  //   path: '/admin',
  //   component: () => import('@/components/admin/SuperAdminDashboard.vue'),
  //   name: 'Super Admin Dashboard',
  //   meta: { 
  //     requiresAuth: true,
  //     requiresSuperAdmin: true,
  //     roles: [ROLES.SUPERADMIN]
  //   }
  // }
]

// Enable /admin route for superadmin
const adminRoute = {
  path: '/admin',
  component: () => import('@/components/admin/SuperAdminDashboard.vue'),
  name: 'Super Admin Dashboard',
  meta: { 
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

// Add admin route to routes array
routes.push(adminRoute)

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Router Guard - Role Based Access Control
router.beforeEach(async (to, from, next) => {
  // Short-circuit: rutas públicas no necesitan autenticación
  if (ROUTE_ROLE_MATRIX.public.includes(to.path)) {
    next()
    return
  }

  const authStore = useAuthStore()

  // Ensure auth is initialized
  await authStore.ensureAuthInitialized()

  const isAuthenticated = authStore.isLoggedIn
  const user = authStore.user
  const userRole = user?.role
  
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      // Redirect to home with login prompt
      next({ 
        path: '/', 
        query: { redirect: to.fullPath, loginRequired: 'true' }
      })
      return
    }
    
    // Check if route requires specific roles
    if (to.meta.roles && Array.isArray(to.meta.roles)) {
      if (!to.meta.roles.includes(userRole)) {
        // User doesn't have required role
        next({ 
          path: '/dashboard', 
          query: { accessDenied: 'role' }
        })
        return
      }
    }
    
    // Check if route requires super admin
    if (to.meta.requiresSuperAdmin) {
      if (userRole !== ROLES.SUPERADMIN) {
        next({ 
          path: '/dashboard', 
          query: { accessDenied: 'superadmin' }
        })
        return
      }
    }
    
    // Check module-based access (for marketplace modules)
    if (to.meta.module) {
      const haciendaStore = useHaciendaStore()

      const moduleActive = haciendaStore.isModuleActive(to.meta.module)
      if (!moduleActive) {
        // Module not active for this hacienda
        next({ 
          path: '/dashboard', 
          query: { moduleDisabled: to.meta.module }
        })
        return
      }
    }
  }
  
  // Prevent authenticated users from accessing auth pages (login/register)
  // if we had dedicated auth pages
  
  // All checks passed
  next()
})

export default router
export { ROLES, ROUTE_ROLE_MATRIX }

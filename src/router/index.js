import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import LandingPage from '@/components/LandingPage.vue'
import AboutUs from '@/components/public/AboutUs.vue'
import OurPlans from '@/components/hacienda/OurPlans.vue'
import DocumentationComponent from '@/components/public/Documentation.vue'
import ContactUs from '@/components/public/ContactUs.vue'
import FAQ from '@/components/public/FAQ.vue'
import EmailConfirmation from '@/components/dialogs/ConfirmationDialog.vue'

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
  { path: '/', component: LandingPage },
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
    component: () => import('@/components/forms/auth/PasswordReset.vue'),
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
    component: () => import('@/components/siembras/SiembrasDashboard.vue'),
    name: 'Dashboard de Siembras',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/siembras/nueva',
    component: () => import('@/components/siembras/SiembraWorkspace.vue'),
    name: 'Nueva Siembra',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/siembras/:id',
    component: () => import('@/components/siembras/SiembraWorkspace.vue'),
    name: 'Ver Siembra/Proyecto',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/actividades',
    component: () => import('@/components/actividades/ActividadesDashboard.vue'),
    name: 'Gestion de Actividades',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/actividades/:id',
    component: () => import('@/components/actividades/ActividadesWorkspace.vue'),
    name: 'Ver Actividad',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },

  {
    path: '/programaciones',
    component: () => import('@/components/programaciones/ProgramacionesList.vue'),
    name: 'Gestion de Programas de Actividades',
    meta: {
      requiresAuth: true,
      roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
    }
  },
  {
    path: '/bitacora',
    component: () => import('@/components/bitacora/BitacoraView.vue'),
    name: 'Bitácora',
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
    component: () => import('@/components/recordatorios/Recordatorios.vue'),
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

// Add admin analytics route for superadmin
const adminAnalyticsRoute = {
  path: '/admin/analytics',
  component: () => import('@/components/admin/SuperAdminAnalytics.vue'),
  name: 'Super Admin Analytics',
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

// Add admin usage metrics route
const adminUsageMetricsRoute = {
  path: '/admin/metrics',
  component: () => import('@/components/admin/UsageMetrics.vue'),
  name: 'Usage Metrics',
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

// Add admin data mining route
const adminDataMiningRoute = {
  path: '/admin/data-mining',
  component: () => import('@/components/admin/DataMiningTools.vue'),
  name: 'Data Mining Tools',
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

// Nuevas rutas Admin Panel - Gestión de Usuarios y Haciendas
const adminUsersRoute = {
  path: '/admin/users',
  component: () => import('@/components/admin/UsersManagement.vue'),
  name: 'Gestión de Usuarios',
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

const adminHaciendasRoute = {
  path: '/admin/haciendas',
  component: () => import('@/components/admin/HaciendasManagement.vue'),
  name: 'Gestión de Haciendas',
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

const adminSettingsRoute = {
  path: '/admin/settings',
  component: () => import('@/components/admin/SystemSettings.vue'),
  name: 'Configuración del Sistema',
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

const adminLogsRoute = {
  path: '/admin/logs',
  component: () => import('@/components/admin/LogsViewer.vue'),
  name: 'Visor de Logs',
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

const adminExportsRoute = {
  path: '/admin/exports',
  component: () => import('@/components/admin/AdminExports.vue'),
  name: 'Exportaciones',
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

// Add admin routes to routes array
routes.push(adminRoute)
routes.push(adminAnalyticsRoute)
routes.push(adminUsageMetricsRoute)
routes.push(adminDataMiningRoute)
routes.push(adminUsersRoute)
routes.push(adminHaciendasRoute)
routes.push(adminSettingsRoute)
routes.push(adminLogsRoute)
routes.push(adminExportsRoute)

// Rutas Knowledge Hub
const knowledgeSearchRoute = {
  path: '/knowledge/search',
  component: () => import('@/components/knowledge/UnifiedSearch.vue'),
  name: 'Búsqueda Unificada',
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

const knowledgeExportRoute = {
  path: '/knowledge/export',
  component: () => import('@/components/admin/AdminExports.vue'),
  name: 'Exportar Conocimiento',
  meta: {
    requiresAuth: true,
    requiresSuperAdmin: true,
    roles: [ROLES.SUPERADMIN]
  }
}

const knowledgeActivitiesRoute = {
  path: '/knowledge/activities',
  component: () => import('@/components/knowledge/ActivitiesCatalog.vue'),
  name: 'Catálogo de Actividades',
  meta: {
    requiresAuth: true,
    roles: [ROLES.SUPERADMIN, ROLES.ADMINISTRADOR, ROLES.AUDITOR]
  }
}

const knowledgeProgramDetailRoute = {
  path: '/knowledge/program/:id',
  component: () => import('@/components/knowledge/ProgramDetailView.vue'),
  name: 'Detalle de Programación',
  meta: {
    requiresAuth: true,
    roles: [ROLES.SUPERADMIN, ROLES.ADMINISTRADOR, ROLES.AUDITOR]
  }
}

const knowledgeSiembraRoute = {
  path: '/knowledge/siembra/:id',
  component: () => import('@/components/knowledge/SiembraKnowledge.vue'),
  name: 'Conocimiento de Siembra',
  meta: {
    requiresAuth: true,
    roles: [ROLES.SUPERADMIN, ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
  }
}

routes.push(knowledgeSearchRoute)
routes.push(knowledgeExportRoute)
routes.push(knowledgeActivitiesRoute)
routes.push(knowledgeProgramDetailRoute)
routes.push(knowledgeSiembraRoute)

// Add reports route for authenticated users
const reportsRoute = {
  path: '/reports',
  component: () => import('@/components/reports/ReportsView.vue'),
  name: 'Reports',
  meta: {
    requiresAuth: true,
    roles: [ROLES.ADMINISTRADOR, ROLES.AUDITOR, ROLES.OPERADOR]
  }
}

routes.push(reportsRoute)

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Route validation cache to avoid repeated checks
// Using FIFO with bulk eviction to prevent unbounded growth
const routeValidationCache = new Map()
const MAX_CACHE_SIZE = 100
const CACHE_EVICTION_BATCH = 20 // Remove 20 entries when over limit

/**
 * Generates a cache key based on path and user role
 */
function getCacheKey(path, userRole) {
  return `${path}:${userRole || 'anonymous'}`
}

/**
 * Checks if route validation result is cached
 */
function getCachedValidation(path, userRole) {
  const key = getCacheKey(path, userRole)
  return routeValidationCache.get(key)
}

/**
 * Caches route validation result with bulk eviction to prevent unbounded growth
 */
function setCachedValidation(path, userRole, result) {
  const key = getCacheKey(path, userRole)
  routeValidationCache.set(key, result)

  // Bulk eviction when over limit to prevent unbounded growth in high-traffic scenarios
  if (routeValidationCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(routeValidationCache.keys()).slice(0, CACHE_EVICTION_BATCH)
    keysToDelete.forEach(k => routeValidationCache.delete(k))
  }
}

/**
 * Clears route validation cache (call when auth state changes)
 */
export function clearRouteCache() {
  routeValidationCache.clear()
}

// Router Guard - Role Based Access Control
router.beforeEach(async (to, from, next) => {
  // Short-circuit: rutas públicas no necesitan autenticación
  if (ROUTE_ROLE_MATRIX.public.includes(to.path)) {
    next()
    return
  }

  const authStore = useAuthStore()

  // Ensure auth is initialized (only if not already initialized)
  if (!authStore.initialized) {
    await authStore.ensureAuthInitialized()
  }

  const isAuthenticated = authStore.isLoggedIn
  const user = authStore.user
  const userRole = user?.role

  // Check cache for public routes that don't require auth
  if (!to.meta.requiresAuth) {
    next()
    return
  }

  // For protected routes, check cache if user is authenticated
  if (isAuthenticated) {
    const cached = getCachedValidation(to.path, userRole)
    if (cached && cached.allowed) {
      next()
      return
    }
  }

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
        // User doesn't have required role - cache this result
        setCachedValidation(to.path, userRole, { allowed: false })
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
        setCachedValidation(to.path, userRole, { allowed: false })
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
        setCachedValidation(to.path, userRole, { allowed: false })
        next({
          path: '/dashboard',
          query: { moduleDisabled: to.meta.module }
        })
        return
      }
    }

    // All checks passed - cache this result
    setCachedValidation(to.path, userRole, { allowed: true })
  }

  // All checks passed
  next()
})

export default router
export { ROLES, ROUTE_ROLE_MATRIX }

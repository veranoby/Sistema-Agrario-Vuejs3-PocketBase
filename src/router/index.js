import { createRouter, createWebHistory } from 'vue-router'
import HomeComp from '@/components/Home.vue'
import AboutUs from '@/components/AboutUs.vue'
import OurPlans from '@/components/OurPlans.vue'
import DocumentationComponent from '@/components/Documentation.vue'
import ContactUs from '@/components/ContactUs.vue'
import FAQ from '@/components/FAQ.vue'
import EmailConfirmation from '@/components/Confirmation.vue'
import ProfileComponent from '@/components/UserProfile.vue'
import SiembrasConfig from '@/components/SiembrasConfig.vue'
import SiembraWorkspace from '@/components/SiembraWorkspace.vue'
import ZonasConfig from '@/components/zonasConfig.vue'

import ActividadesConfig from '@/components/actividadesConfig.vue'
import ActividadesWorkspace from '@/components/actividadesWorkspace.vue'

const routes = [
  { path: '/', component: HomeComp },
  { path: '/about', component: AboutUs },
  { path: '/plans', component: OurPlans },
  { path: '/documentation', component: DocumentationComponent },
  { path: '/contact', component: ContactUs },
  { path: '/faq', component: FAQ },
  { path: '/profile', component: ProfileComponent },
  {
    path: '/auth/confirm-verification/:token?',
    component: EmailConfirmation,
    name: 'EmailConfirmation'
  },
  {
    path: '/dashboard',
    component: () => import('@/components/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/siembras',
    component: SiembrasConfig,
    meta: { requiresAuth: true }
  },
  {
    path: '/siembras/:id',
    component: SiembraWorkspace,
    meta: { requiresAuth: true }
  },
  {
    path: '/zonas',
    component: ZonasConfig,
    meta: { requiresAuth: true }
  },
  {
    path: '/actividades',
    component: ActividadesConfig,
    meta: { requiresAuth: true }
  },
  {
    path: '/actividades/:id',
    component: ActividadesWorkspace,
    meta: { requiresAuth: true }
  },
  {
    path: '/recordatorios',
    component: () => import('@/components/Recordatorios.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

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
import ProgramacionesList from '@/components/ProgramacionesList.vue'
import Recordatorios from '@/components/Recordatorios.vue'
import Finanzas from '@/components/FinanzasConfig.vue'

const routes = [
  { path: '/', component: HomeComp },
  { path: '/about', component: AboutUs },
  { path: '/plans', component: OurPlans },
  { path: '/documentation', component: DocumentationComponent },
  { path: '/contact', component: ContactUs },
  { path: '/faq', component: FAQ },
  { path: '/profile', component: ProfileComponent, meta: { requiresAuth: true } },
  {
    path: '/auth/confirm-verification/:token?',
    component: EmailConfirmation,
    name: 'EmailConfirmation'
  },
  {
    path: '/dashboard',
    component: () => import('@/components/Dashboard.vue'),
    name: 'Dashboard de Inicio',
    meta: { requiresAuth: true }
  },
  {
    path: '/siembras',
    component: SiembrasConfig,
    name: 'Gestion de Siembras y Proyectos',
    meta: { requiresAuth: true }
  },
  {
    path: '/siembras/:id',
    component: SiembraWorkspace,
    name: 'Ver Siembra/Proyecto',
    meta: { requiresAuth: true }
  },
  {
    path: '/actividades',
    component: ActividadesConfig,
    name: 'Gestion de Actividades',
    meta: { requiresAuth: true }
  },
  {
    path: '/actividades/:id',
    component: ActividadesWorkspace,
    name: 'Ver Actividad',
    meta: { requiresAuth: true }
  },

  {
    path: '/programaciones',
    component: ProgramacionesList,
    name: 'Gestion de Programas de Actividades',
    meta: { requiresAuth: true }
  },
  {
    path: '/zonas',
    component: ZonasConfig,
    name: 'Gestion de Zonas de trabajo',
    meta: { requiresAuth: true }
  },
  {
    path: '/finanzas',
    component: Finanzas,
    name: 'Gestion rapida financiera',
    meta: { requiresAuth: true }
  },
  {
    path: '/recordatorios',
    component: Recordatorios,
    name: 'Gestion de Recordatorios y Emergencias',
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

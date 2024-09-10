import { createRouter, createWebHistory } from 'vue-router'
import HomeComp from '@/components/Home.vue'
import AboutUs from '@/components/AboutUs.vue'
import OurPlans from '@/components/OurPlans.vue'
import DocumentationComponent from '@/components/Documentation.vue'
import ContactUs from '@/components/ContactUs.vue'
import FAQ from '@/components/FAQ.vue'
import Dashboard from '@/components/Dashboard.vue'
import EmailConfirmation from '@/components/Confirmation.vue' // Import the new page
import ProfileComponent from '@/components/UserProfile.vue'

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
    component: Dashboard,
    meta: { requiresAuth: true },
    children: [
      { path: 'siembras', component: () => import('@/components/SiembrasConfig.vue') }
      //    { path: 'hacienda', component: () => import('@/components/HaciendaConfig.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

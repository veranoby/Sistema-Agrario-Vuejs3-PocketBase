import { createRouter, createWebHistory } from 'vue-router'
import HomeComp from '@/components/Home.vue'
import AboutUs from '@/components/AboutUs.vue'
import DocumentationComponent from '@/components/Documentation.vue'
import ContactUs from '@/components/ContactUs.vue'
import FAQ from '@/components/FAQ.vue'
import Dashboard from '@/components/Dashboard.vue'

const routes = [
  { path: '/', component: HomeComp },
  { path: '/about', component: AboutUs },
  { path: '/documentation', component: DocumentationComponent },
  { path: '/contact', component: ContactUs },
  { path: '/faq', component: FAQ },
  {
    path: '/dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard/siembras' },
      { path: 'siembras', component: () => import('@/components/Siembras.vue') },
      { path: 'hacienda', component: () => import('@/components/Hacienda.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

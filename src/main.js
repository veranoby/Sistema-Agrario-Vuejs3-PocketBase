// main.js optimizado
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersist from 'pinia-plugin-persistedstate'
import { format } from 'date-fns' // Mantener porque se usa

import App from './App.vue'
import router from './router'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'
import { useAuthStore } from './stores/authStore'
import { useSyncStore } from './stores/syncStore'
import { useThemeStore } from './stores/themeStore'

// Estilos
import './assets/main.css'
import './index.css'
import 'vuetify/styles'
// Eliminar: import '@fortawesome/fontawesome-free/css/all.css'  // No necesario si solo usas MDI
import '@mdi/font/css/materialdesignicons.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import { useVuelidate } from '@vuelidate/core'

import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

// ... resto del código

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          background: '#FFFFFF',
          surface: '#FFFFFF',
          primary: '#1867C0',
          secondary: '#5CBBF6'
        }
      },
      dark: {
        dark: true,
        colors: {
          background: '#121212',
          surface: '#212121',
          primary: '#2196F3',
          secondary: '#424242'
        }
      }
    }
  },
  // Añade esta configuración para las fuentes
  defaults: {
    global: {
      font: {
        family: "'Plus Jakarta Sans', sans-serif"
      }
    },
    VCard: {
      style: [{ fontFamily: "'Plus Jakarta Sans', sans-serif" }]
    },
    VBtn: {
      style: [{ fontFamily: "'Plus Jakarta Sans', sans-serif" }]
    },
    VTextField: {
      style: [{ fontFamily: "'Plus Jakarta Sans', sans-serif" }]
    },
    VSelect: {
      style: [{ fontFamily: "'Plus Jakarta Sans', sans-serif" }]
    }
  }
})

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPersist)

app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(useVuelidate)
app.component('QuillEditor', QuillEditor)

app.config.globalProperties.$filters = {
  formatDate(value) {
    if (!value) return ''
    return format(new Date(value), 'dd/MM/yyyy')
  }
}

// Inicializar stores críticos antes de montar la app
const initApp = async () => {
  const authStore = useAuthStore()
  const syncStore = useSyncStore()
  const themeStore = useThemeStore()

  try {
    // Inicializar tema primero
    const currentTheme = themeStore.currentTheme
    document.documentElement.setAttribute('data-theme', currentTheme)

    // Inicializar auth store y esperar a que termine
    const isAuthenticated = await authStore.ensureAuthInitialized()
    
    // Solo inicializar sync si hay una sesión válida
    if (isAuthenticated) {
      try {
        await syncStore.init()
      } catch (syncError) {
        console.error('Error initializing sync store:', syncError)
        // Continuar con la aplicación incluso si hay error en sync
      }
    }
  } catch (error) {
    console.error('Error during app initialization:', error)
  } finally {
    // Montar la aplicación en cualquier caso
    app.mount('#app')
  }
}

initApp()

// Cleanup al cerrar
window.addEventListener('beforeunload', () => {
  const syncStore = useSyncStore()
  // Guardar estado pendiente si es necesario
  if (syncStore.syncQueue.queue.length > 0) {
    syncStore.syncQueue.saveQueue()
  }
})

// Exportar la instancia de la app para uso en otros archivos si es necesario
export { app, pinia }

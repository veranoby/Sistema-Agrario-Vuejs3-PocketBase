// main.js optimizado
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersist from 'pinia-plugin-persistedstate'
import { syncPlugin } from '@/stores/plugins/syncPlugin'
import { format } from 'date-fns' // Mantener porque se usa
import { handleError } from '@/utils/errorHandler'

import App from './App.vue'
import router from './router'
// Estilos
import 'vuetify/styles'
import './assets/main.css'
import '@mdi/font/css/materialdesignicons.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import { useVuelidate } from '@vuelidate/core'
import i18n from './i18n'; // Import the I18n instance

import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { useAuthStore } from './stores/authStore'
import { useSyncStore } from './stores/sync/index'
import { useThemeStore } from './stores/themeStore'
import { useHaciendaStore } from './stores/haciendaStore'

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
          primary: '#198f4c',
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
  defaults: {
    global: {
      density: 'comfortable',
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
      variant: 'outlined',
      density: 'comfortable'
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable'
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable'
    }
  }
})

const app = createApp(App)
const pinia = createPinia()
pinia.use(syncPlugin)
pinia.use(piniaPersist)

// Capturar errores de Vue
app.config.errorHandler = (error, instance, info) => {
  handleError(error, `Error en componente: ${info}`)
}

// Capturar errores de promesas
window.addEventListener('unhandledrejection', (event) => {
  const isNetworkError = event.reason?.message?.includes('Failed to fetch') ||
    event.reason?.message?.includes('NetworkError') ||
    event.reason?.status === 0;

  // Silenciar visualmente errores de red huérfanos (típicos de syncStore o background)
  handleError(event.reason, 'Error no manejado', { silent: isNetworkError })
  event.preventDefault()
})

// Capturar errores globales
window.addEventListener('error', (event) => {
  handleError(event.error, 'Error global')
})

app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(i18n)
app.use(useVuelidate)
app.component('QuillEditor', QuillEditor)

import { vRole } from '@/directives/v-role'
app.directive('role', vRole)

app.config.globalProperties.$filters = {
  formatDate(value) {
    if (!value) return ''
    return format(new Date(value), 'dd/MM/yyyy')
  }
}

// Registrar Service Worker para mapas offline
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-maps.js')
    .then(registration => {
      console.log('Map Service Worker registrado:', registration.scope)
    })
    .catch(error => {
      console.error('Map Service Worker falló:', error)
    })
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
         // console.warn('[App] Sync init falló o estamos offline, continuando...', syncError.message)
      }

      // Cargar hacienda tras syncStore (IndexedDB listo). 
      // haciendaId viene de this.user (seteado en setSession() dentro de authStore.init())
      try {
        const haciendaStore = useHaciendaStore()
        const rawHacienda = authStore.user?.hacienda
        const haciendaId = typeof rawHacienda === 'object' && rawHacienda?.id
          ? rawHacienda.id
          : rawHacienda

        if (haciendaId && !haciendaStore.mi_hacienda) {
          await haciendaStore.fetchHacienda(haciendaId)
        }
      } catch (haciendaError) {
         // console.warn('[App] Hacienda init falló, Dashboard mostrará fallback:', haciendaError.message)
      }
    }
  } catch (error) {
    // Enviar a handleError pero en modo silencioso si es de red
    const isNetworkError = error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('NetworkError') ||
      error?.status === 0;
    handleError(error, 'Error durante inicialización', { silent: isNetworkError })
  } finally {
    // Montar la aplicación en cualquier caso
    app.mount('#app')
  }
}

initApp()

// Cleanup al cerrar
window.addEventListener('beforeunload', () => {
  const syncStore = useSyncStore()
  // GUARDAR estado pendiente si es necesario
  if (syncStore.queue.length > 0) {
    syncStore.persistQueueState()
  }
})

// Exportar la instancia de la app para uso en otros archivos si es necesario
export { app, pinia }

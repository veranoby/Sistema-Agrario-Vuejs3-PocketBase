import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPersist from 'pinia-plugin-persistedstate'

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
import '@fortawesome/fontawesome-free/css/all.css'
import '@mdi/font/css/materialdesignicons.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import { useVuelidate } from '@vuelidate/core'

import CKEditor from '@ckeditor/ckeditor5-vue'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

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
  }
})

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPersist)

app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(useVuelidate)
app.use(CKEditor)

// Inicializar stores críticos antes de montar la app
const initApp = async () => {
  const authStore = useAuthStore()
  const syncStore = useSyncStore()
  const themeStore = useThemeStore()

  try {
    // Inicializar auth primero
    await authStore.init()

    // Inicializar tema
    const currentTheme = themeStore.currentTheme
    document.documentElement.setAttribute('data-theme', currentTheme)

    // Solo inicializar sync si hay sesión
    if (authStore.isLoggedIn) {
      await syncStore.init()
    }
  } catch (error) {
    console.error('Error initializing app:', error)
  }

  app.mount('#app')
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

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useVuelidate } from '@vuelidate/core'
import { createVuetify } from 'vuetify'
import { CkeditorPlugin } from '@ckeditor/ckeditor5-vue'
import App from './App.vue'
import router from './router'
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

// Vuetify
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { fa } from 'vuetify/iconsets/fa'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// Configuración de temas
const lightTheme = {
  dark: false,
  variables: {
    'font-family': '"Plus Jakarta Sans", sans-serif',
    'color-background': '#ffffff',
    'font-weight-light': '500',
    'font-weight-regular': '600',
    'font-weight-medium': '600',
    'font-weight-bold': '600',
    'font-weight-extrabold': '700',
    'font-weight-black': '800'
  },
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    primary: '#6200EE',
    'primary-darken-1': '#3700B3',
    secondary: '#03DAC6',
    'secondary-darken-1': '#018786',
    error: '#B00020',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00',
    fondo_claro: '#d2e7f085',
    fondo_claro_tabla: '#d2e7f024',
    color_titulo: '#000000'
  }
}

const darkTheme = {
  dark: true,
  variables: {
    'font-family': '"Plus Jakarta Sans", sans-serif',
    'font-weight-light': '500',
    'font-weight-regular': '600',
    'font-weight-medium': '600',
    'font-weight-bold': '600',
    'font-weight-extrabold': '700',
    'font-weight-black': '800',
    'color-background': '#121212'
  },
  colors: {
    background: '#121212',
    surface: '#121212',
    primary: '#BB86FC',
    'primary-darken-1': '#3700B3',
    secondary: '#03DAC6',
    'secondary-darken-1': '#03DAC6',
    error: '#CF6679',
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FB8C00',
    fondo_claro: '#d2e7f085',
    fondo_claro_tabla: '#d2e7f024',

    color_titulo: '#FFFFFF'
  }
}

// Configuración de Vuetify
const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { fa, mdi }
  },
  theme: {
    defaultTheme: 'lightTheme',
    themes: { lightTheme, darkTheme }
  },
  defaults: {
    VBtn: { fontWeight: '600' },
    VCard: { fontWeight: '600' },
    VTextField: { fontWeight: '600' }
  }
})

// Al final de la configuración de Vuetify, después de definir los temas
document.documentElement.style.setProperty('--fondo_claro', lightTheme.colors.fondo_claro)
document.documentElement.style.setProperty(
  '--fondo_claro_tabla',
  lightTheme.colors.fondo_claro_tabla
)
document.documentElement.style.setProperty('--color_titulo', lightTheme.colors.color_titulo)

// Creación de la aplicación
const app = createApp(App)
const pinia = createPinia()

// Uso de plugins
app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(useVuelidate)
app.use(CkeditorPlugin)

// Configuración del tema
const themeStore = useThemeStore()
vuetify.theme.global.name.value = themeStore.currentTheme

// Observar cambios en el tema
themeStore.$subscribe((mutation, state) => {
  vuetify.theme.global.name.value = state.currentTheme
  document.body.style.backgroundColor = vuetify.theme.global.current.value.colors.background
})

// Establecer color de fondo inicial
document.body.style.backgroundColor = vuetify.theme.global.current.value.colors.background

// Montar la aplicación
app.mount('#app')

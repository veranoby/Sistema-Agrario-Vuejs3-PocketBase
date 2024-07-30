import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { useVuelidate } from '@vuelidate/core'

// Vuetify
import 'vuetify/styles'
import '@fortawesome/fontawesome-free/css/all.css'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { fa } from 'vuetify/iconsets/fa'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/themeStore'

import './index.css'

const lightTheme = {
  dark: false,
  variables: {
    'color-background': '#ffffff'
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
    warning: '#FB8C00'
  }
}

const darkTheme = {
  dark: true,
  variables: {
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
    warning: '#FB8C00'
  }
}

const vuetify = createVuetify({
  components,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      fa,
      mdi
    }
  },
  theme: {
    defaultTheme: 'lightTheme',
    themes: {
      lightTheme,
      darkTheme
    }
  },
  directives
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(useVuelidate)

const themeStore = useThemeStore()

// Set the initial theme
vuetify.theme.global.name.value = themeStore.currentTheme

// Watch for theme changes
themeStore.$subscribe((mutation, state) => {
  vuetify.theme.global.name.value = state.currentTheme
  // Update body background color on theme change
  document.body.style.backgroundColor = vuetify.theme.global.current.value.colors.background
})
// Set initial body background color
document.body.style.backgroundColor = vuetify.theme.global.current.value.colors.background

app.mount('#app')

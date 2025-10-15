import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import es from './locales/es.json';

const i18n = createI18n({
  locale: localStorage.getItem('user-lang') || 'es', // set locale
  fallbackLocale: 'en', // set fallback locale
  messages: {
    en,
    es,
  },
  legacy: false, // you must set `legacy: false` to use Composition API
});

export default i18n;
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enLocale from './locales/en.json'
import hiLocale from './locales/hi.json'
import teLocale from './locales/te.json'
import taLocale from './locales/ta.json'
import knLocale from './locales/kn.json'
import mlLocale from './locales/ml.json'

const resources = {
  en: { translation: enLocale },
  hi: { translation: hiLocale },
  te: { translation: teLocale },
  ta: { translation: taLocale },
  kn: { translation: knLocale },
  ml: { translation: mlLocale },
}

// Get language from localStorage or default to English
const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('formflow_language')
    if (stored && resources[stored]) {
      return stored
    }
  }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('formflow_language', lng)
  }
})

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' },
  { code: 'te', name: 'తెలుగు' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'kn', name: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'മലയാളം' },
]

export default i18n

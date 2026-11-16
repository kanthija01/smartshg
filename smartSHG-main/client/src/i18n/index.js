import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import te from './locales/te.json';

const savedLang = localStorage.getItem('smartshg_lang');
// Only use saved language if it's a valid supported language
const activeLang = (savedLang === 'en' || savedLang === 'te') ? savedLang : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
  },
  lng: activeLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

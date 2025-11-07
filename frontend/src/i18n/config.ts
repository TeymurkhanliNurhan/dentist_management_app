import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enLogin from '../locales/en/login.json';
import enSignup from '../locales/en/signup.json';
import enCommon from '../locales/en/common.json';
import enDashboard from '../locales/en/dashboard.json';
import enHeader from '../locales/en/header.json';
import azLogin from '../locales/az/login.json';
import azSignup from '../locales/az/signup.json';
import azCommon from '../locales/az/common.json';
import azDashboard from '../locales/az/dashboard.json';
import azHeader from '../locales/az/header.json';
import ruLogin from '../locales/ru/login.json';
import ruSignup from '../locales/ru/signup.json';
import ruCommon from '../locales/ru/common.json';
import ruDashboard from '../locales/ru/dashboard.json';
import ruHeader from '../locales/ru/header.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        login: enLogin,
        signup: enSignup,
        common: enCommon,
        dashboard: enDashboard,
        header: enHeader,
      },
      az: {
        login: azLogin,
        signup: azSignup,
        common: azCommon,
        dashboard: azDashboard,
        header: azHeader,
      },
      ru: {
        login: ruLogin,
        signup: ruSignup,
        common: ruCommon,
        dashboard: ruDashboard,
        header: ruHeader,
      },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    supportedLngs: ['en', 'az', 'ru'],
  });

export default i18n;


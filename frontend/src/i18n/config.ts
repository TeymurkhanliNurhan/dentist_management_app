import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enLogin from '../locales/en/login.json';
import enSignup from '../locales/en/signup.json';
import enCommon from '../locales/en/common.json';
import azLogin from '../locales/az/login.json';
import azSignup from '../locales/az/signup.json';
import azCommon from '../locales/az/common.json';
import ruLogin from '../locales/ru/login.json';
import ruSignup from '../locales/ru/signup.json';
import ruCommon from '../locales/ru/common.json';

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
      },
      az: {
        login: azLogin,
        signup: azSignup,
        common: azCommon,
      },
      ru: {
        login: ruLogin,
        signup: ruSignup,
        common: ruCommon,
      },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    supportedLngs: ['en', 'az', 'ru'],
  });

export default i18n;


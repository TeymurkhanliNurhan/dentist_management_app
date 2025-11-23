import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enLogin from '../locales/en/login.json';
import enSignup from '../locales/en/signup.json';
import enCommon from '../locales/en/common.json';
import enDashboard from '../locales/en/dashboard.json';
import enHeader from '../locales/en/header.json';
import enPatients from '../locales/en/patients.json';
import enMedicines from '../locales/en/medicines.json';
import enTreatments from '../locales/en/treatments.json';
import enPatientDetail from '../locales/en/patientDetail.json';
import enTeethDiagram from '../locales/en/teethDiagram.json';
import enToothDetail from '../locales/en/toothDetail.json';
import enAppointments from '../locales/en/appointments.json';
import enSubscription from '../locales/en/subscription.json';
import azLogin from '../locales/az/login.json';
import azSignup from '../locales/az/signup.json';
import azCommon from '../locales/az/common.json';
import azDashboard from '../locales/az/dashboard.json';
import azHeader from '../locales/az/header.json';
import azPatients from '../locales/az/patients.json';
import azMedicines from '../locales/az/medicines.json';
import azTreatments from '../locales/az/treatments.json';
import azPatientDetail from '../locales/az/patientDetail.json';
import azTeethDiagram from '../locales/az/teethDiagram.json';
import azToothDetail from '../locales/az/toothDetail.json';
import azAppointments from '../locales/az/appointments.json';
import azSubscription from '../locales/az/subscription.json';
import ruLogin from '../locales/ru/login.json';
import ruSignup from '../locales/ru/signup.json';
import ruCommon from '../locales/ru/common.json';
import ruDashboard from '../locales/ru/dashboard.json';
import ruHeader from '../locales/ru/header.json';
import ruPatients from '../locales/ru/patients.json';
import ruMedicines from '../locales/ru/medicines.json';
import ruTreatments from '../locales/ru/treatments.json';
import ruPatientDetail from '../locales/ru/patientDetail.json';
import ruTeethDiagram from '../locales/ru/teethDiagram.json';
import ruToothDetail from '../locales/ru/toothDetail.json';
import ruAppointments from '../locales/ru/appointments.json';
import ruSubscription from '../locales/ru/subscription.json';

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
        medicines: enMedicines,
        treatments: enTreatments,
        patients: enPatients,
        patientDetail: enPatientDetail,
        teethDiagram: enTeethDiagram,
        toothDetail: enToothDetail,
        appointments: enAppointments,
        subscription: enSubscription,
      },
      az: {
        login: azLogin,
        signup: azSignup,
        common: azCommon,
        dashboard: azDashboard,
        header: azHeader,
        medicines: azMedicines,
        treatments: azTreatments,
        patients: azPatients,
        patientDetail: azPatientDetail,
        teethDiagram: azTeethDiagram,
        toothDetail: azToothDetail,
        appointments: azAppointments,
        subscription: azSubscription,
      },
      ru: {
        login: ruLogin,
        signup: ruSignup,
        common: ruCommon,
        dashboard: ruDashboard,
        header: ruHeader,
        medicines: ruMedicines,
        treatments: ruTreatments,
        patients: ruPatients,
        patientDetail: ruPatientDetail,
        teethDiagram: ruTeethDiagram,
        toothDetail: ruToothDetail,
        appointments: ruAppointments,
        subscription: ruSubscription,
      },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    supportedLngs: ['en', 'az', 'ru'],
  });

export default i18n;


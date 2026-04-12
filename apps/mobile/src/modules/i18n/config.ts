import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// English translations
import enCommon from '../../../../packages/shared/src/i18n/locales/en/common.json';
import enAuth from '../../../../packages/shared/src/i18n/locales/en/auth.json';

// Tibetan translations
import boCommon from '../../../../packages/shared/src/i18n/locales/bo/common.json';
import boAuth from '../../../../packages/shared/src/i18n/locales/bo/auth.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
  },
  bo: {
    common: boCommon,
    auth: boAuth,
  },
};

// Detect system language, prefer Tibetan if available
function getDeviceLanguage(): string {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const langCode = locales[0].languageCode;
      if (langCode === 'bo') return 'bo';
    }
  } catch {}
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  ns: ['common', 'auth', 'profile', 'discovery', 'chat'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;

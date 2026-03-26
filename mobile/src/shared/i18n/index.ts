import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import en from './locales/en.json';
import ar from './locales/ar.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

const LANG_KEY = 'APP_LANG';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    let savedLang: string | null = null;
    try {
      if (Platform.OS === 'web') {
        savedLang = localStorage.getItem(LANG_KEY);
      } else {
        savedLang = await SecureStore.getItemAsync(LANG_KEY);
      }
    } catch (err) {
      console.warn('Failed to detect saved language', err);
    }
    
    if (savedLang) {
      return callback(savedLang);
    }
    
    const locales = Localization.getLocales();
    callback(locales && locales.length > 0 && locales[0].languageCode ? locales[0].languageCode : 'en');
  },
  init: () => {},
  cacheUserLanguage: async (lang: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(LANG_KEY, lang);
      } else {
        await SecureStore.setItemAsync(LANG_KEY, lang);
      }
    } catch {}
  }
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  } as any);

// Setup RTL dynamically based on selected language
export const setAppLanguage = (language: string) => {
  return new Promise<void>((resolve) => {
    const isRtl = language === 'ar';
    // If layout direction changed, we need to enforce it
    if (I18nManager.isRTL !== isRtl) {
      I18nManager.forceRTL(isRtl);
      I18nManager.allowRTL(isRtl);
    }
    i18n.changeLanguage(language).then(() => resolve());
  });
};

export default i18n;

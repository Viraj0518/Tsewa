import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UseLanguageToggleReturn {
  language: string;
  toggleLanguage: () => void;
  isEnglish: boolean;
  isTibetan: boolean;
}

export function useLanguageToggle(): UseLanguageToggleReturn {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language || 'en');

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'en' ? 'bo' : 'en';
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  }, [language, i18n]);

  return {
    language,
    toggleLanguage,
    isEnglish: language === 'en',
    isTibetan: language === 'bo',
  };
}

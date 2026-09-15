import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language || 'en');

  useEffect(() => {
    const saved = localStorage.getItem('smartshg_lang') || 'en';
    if (saved !== language) {
      i18n.changeLanguage(saved);
      setLanguage(saved);
    }
  }, []);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('smartshg_lang', lang);
    setLanguage(lang);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'te' : 'en';
    changeLanguage(nextLang);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, toggleLanguage, isTelugu: language === 'te' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

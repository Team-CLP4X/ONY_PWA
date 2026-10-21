import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { AppLanguage, TranslationDictionary, getTranslation } from "./translations";

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: TranslationDictionary;
  trans: (key: keyof TranslationDictionary) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "English",
  setLanguage: () => {},
  t: getTranslation("English"),
  trans: (key) => getTranslation("English")[key] || String(key),
});

const STORAGE_KEY = "ony_preferred_language";

export function LanguageProvider({
  children,
  initialLanguage = "English",
  onLanguageChange,
}: {
  children: React.ReactNode;
  initialLanguage?: string;
  onLanguageChange?: (lang: AppLanguage) => void;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "Bahasa Melayu" || stored === "中文" || stored === "English") {
        return stored;
      }
      if (initialLanguage === "Bahasa Melayu" || initialLanguage === "中文" || initialLanguage === "English") {
        return initialLanguage;
      }
    } catch {
      // fallback
    }
    return "English";
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  const t = useMemo(() => getTranslation(language), [language]);

  const trans = useMemo(
    () => (key: keyof TranslationDictionary) => t[key] || String(key),
    [t]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, trans }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

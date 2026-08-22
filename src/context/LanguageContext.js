import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import en from "../i18n/en.json";
import ar from "../i18n/ar.json";

const dictionaries = { en, ar };
const STORAGE_KEY = "edel_lang";

const LanguageContext = createContext(null);

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

function interpolate(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`
  );
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "ar" || saved === "en") return saved;
    } catch (_) {
      /* ignore */
    }
    return "ar";
  });

  const setLang = useCallback((next) => {
    const value = next === "en" ? "en" : "ar";
    setLangState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {
      /* ignore */
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "ar" ? "en" : "ar");
  }, [lang, setLang]);

  const t = useCallback(
    (key, vars) => {
      const dict = dictionaries[lang] || dictionaries.ar;
      const fallback = dictionaries.en;
      const raw = getByPath(dict, key) ?? getByPath(fallback, key) ?? key;
      return typeof raw === "string" ? interpolate(raw, vars) : key;
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t }),
    [lang, setLang, toggleLang, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

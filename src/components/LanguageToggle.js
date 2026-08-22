import React from "react";
import { useLanguage } from "../context/LanguageContext";
import "./LanguageToggle.css";

export default function LanguageToggle({ className = "" }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className={`lang-toggle ${className}`.trim()} role="group" aria-label="Language">
      <button
        type="button"
        className={`lang-toggle-btn ${lang === "ar" ? "active" : ""}`}
        onClick={() => setLang("ar")}
      >
        {t("common.langAr")}
      </button>
      <button
        type="button"
        className={`lang-toggle-btn ${lang === "en" ? "active" : ""}`}
        onClick={() => setLang("en")}
      >
        {t("common.langEn")}
      </button>
    </div>
  );
}

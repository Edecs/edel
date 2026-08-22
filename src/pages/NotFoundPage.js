// src/pages/NotFoundPage.js
import React from "react";
import { useLanguage } from "../context/LanguageContext";

const NotFoundPage = () => {
  const { t } = useLanguage();
  return (
    <div className="not-found-page">
      <h1>{t("errors.pageNotFoundTitle")}</h1>
      <p>{t("errors.pageNotFoundBody")}</p>
    </div>
  );
};

export default NotFoundPage;

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ReactComponent as Logo } from "../photos/edecs logo white.svg";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";

import "./ResetPasswordPage.css";

const ResetPasswordPage = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await resetPassword(email);
      setMessage(t("auth.resetInstructionsSent"));
    } catch (error) {
      setMessage(t("auth.resetError", { error: error.message }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <LanguageToggle className="lang-toggle-login" />
      <nav className="navbar">
        <Logo className="navbar-logo" />
      </nav>
      <div className="login-page">
        <h2>{t("auth.resetPasswordTitle")}</h2>
        <form onSubmit={handleResetPassword}>
          <input
            type="email"
            placeholder={t("auth.enterYourEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? t("common.loading") : t("auth.resetPasswordButton")}
          </button>
        </form>
        {message && <p>{message}</p>}
      </div>
    </div>
  );
};

export default ResetPasswordPage;

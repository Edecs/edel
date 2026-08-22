import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import "./LoginPage.css";
import { ReactComponent as Logo } from "../photos/edecs logo white.svg";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";

function LoginPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/welcome", { replace: true });
    }
  }, [user, navigate]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (userCredential.user) {
        navigate("/welcome");
      } else {
        setError(t("auth.authFailed"));
      }
    } catch (error) {
      setError(t("auth.loginFailed", { error: error.message }));
    }
  };

  return (
    <div className="login-container">
      <LanguageToggle className="lang-toggle-login" />
      <nav className="navbar">
        <Logo className="navbar-logo" />
      </nav>
      <div className="login-page">
        <h2>{t("auth.loginTitle")}</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleLogin}>
          <label>{t("auth.emailLabel")}</label>
          <input
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label>{t("auth.passwordLabel")}</label>
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="password-toggle"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? t("auth.hide") : t("auth.show")}
            </span>
          </div>
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            {t("auth.rememberMe")}
          </label>
          <button type="submit">{t("auth.loginButton")}</button>
        </form>
        <div className="reset-password-link">
          <Link to="/reset-password">{t("auth.forgotPassword")}</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import "./LoginPage.css";
import { ReactComponent as Logo } from "../photos/edecs logo white.svg";
import { useNavigate, Link } from "react-router-dom"; // Import Link from React Router

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user) {
        if (rememberMe) {
          localStorage.setItem("userEmail", user.email);
        } else {
          sessionStorage.setItem("userEmail", user.email);
        }

        navigate("/welcome");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } catch (error) {
      setError("Login failed: " + error.message);
    }
  };

  return (
    <div className="login-container">
      <nav className="navbar">
        <Logo className="navbar-logo" />
      </nav>
      <div className="login-page">
        <h2>Login</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label>Password</label>
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="password-toggle"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          <button type="submit">Login</button>
        </form>
        <div className="reset-password-link">
          <Link to="/reset-password">Forgot Password?</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

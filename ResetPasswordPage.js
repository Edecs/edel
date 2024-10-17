import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./ResetPasswordPage.css"; // تأكد من أنك أنشأت ملف CSS لتنسيق الصفحة

const ResetPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { resetPassword } = useAuth();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await resetPassword(email);
      setMessage(
        "تم إرسال تعليمات إعادة تعيين كلمة المرور إلى بريدك الإلكتروني."
      );
    } catch (error) {
      setMessage("حدث خطأ: " + error.message);
    }
  };

  return (
    <div className="reset-password-container">
      <h2>إعادة تعيين كلمة المرور</h2>
      <form onSubmit={handleResetPassword}>
        <input
          type="email"
          placeholder="أدخل بريدك الإلكتروني"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">إعادة تعيين كلمة المرور</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default ResetPasswordPage;

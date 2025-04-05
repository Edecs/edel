import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth"; // استيراد الدوال المطلوبة
import { getDatabase, ref, get } from "firebase/database"; // استيراد دوال قاعدة البيانات

const sanitizeEmail = (email) => {
  return email.replace(/\./g, ",");
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserDepartment, setCurrentUserDepartment] = useState(null); // إضافة حالة للقسم

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        const email = sanitizeEmail(currentUser.email);
        const db = getDatabase();
        const userRef = ref(db, `users/${email}`);
        try {
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const role = userData.role || "User";
            const department = userData.department || null; // تأكد من أن الحقل موجود

            // ضبط الصلاحيات بناءً على الدور
            setIsSuperAdmin(role === "SuperAdmin");
            setIsAdmin(role === "admin" || role === "SuperAdmin");
            setCurrentUserDepartment(department || "Not Assigned"); // تعيين القسم هنا أو تعيين قيمة افتراضية
          } else {
            // إذا لم يكن هناك مستخدم، تعيين القيم الافتراضية
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setCurrentUserDepartment(null);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setCurrentUserDepartment(null); // في حالة حدوث خطأ
        }
      } else {
        // إذا لم يكن هناك مستخدم، تعيين القيم الافتراضية
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setCurrentUserDepartment(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const resetPassword = async (email) => {
    await sendPasswordResetEmail(getAuth(), email);
  };

  const logout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setCurrentUserDepartment(null); // إعادة تعيين القسم عند تسجيل الخروج
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const value = {
    user,
    loading,
    isAdmin,
    isSuperAdmin,
    currentUserDepartment, // إضافة القسم إلى القيمة المرجعة
    resetPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
 

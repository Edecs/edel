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

            // ضبط الصلاحيات بناءً على الدور
            setIsSuperAdmin(role === "SuperAdmin");
            setIsAdmin(role === "admin" || role === "SuperAdmin");
          } else {
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        } catch (error) {
          console.error("Error fetching user roles:", error);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
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
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const value = {
    user,
    loading,
    isAdmin,
    isSuperAdmin,
    resetPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

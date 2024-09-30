import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';

const sanitizeEmail = (email) => {
  return email.replace(/\./g, ",");
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    
    // التحقق من وجود معرف المستخدم في localStorage
    const storedUser = localStorage.getItem('userEmail');
    if (storedUser) {
      setUser({ email: storedUser }); // تعيين المستخدم بناءً على البريد المخزن
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        localStorage.setItem('userEmail', sanitizeEmail(user.email)); // حفظ البريد في localStorage

        const email = sanitizeEmail(user.email);
        const db = getDatabase();
        const userRef = ref(db, `users/${email}`);

        try {
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userData = snapshot.val();
            const role = userData.role || "User";

            if (role === "SuperAdmin" || role === "admin") {
              setIsSuperAdmin(true);
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
              setIsSuperAdmin(false);
            }
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
        localStorage.removeItem('userEmail'); // إزالة البريد من localStorage إذا لم يكن هناك مستخدم
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      localStorage.removeItem('userEmail'); // إزالة البريد من localStorage عند تسجيل الخروج
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isSuperAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import { emailToKey, normalizeRole } from "../utils/emailKey";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserDepartment, setCurrentUserDepartment] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      if (!currentUser) {
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setCurrentUserDepartment(null);
        setLoading(false);
        return;
      }

      try {
        const email = emailToKey(currentUser.email);
        const db = getDatabase();

        const disabledSnap = await get(ref(db, `disabledUsers/${email}`));
        if (disabledSnap.exists() && disabledSnap.val() === true) {
          await signOut(auth);
          setUser(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setCurrentUserDepartment(null);
          setLoading(false);
          return;
        }

        const snapshot = await get(ref(db, `users/${email}`));

        if (snapshot.exists()) {
          const userData = snapshot.val();
          if (userData.disabled === true) {
            await signOut(auth);
            setUser(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setCurrentUserDepartment(null);
            setLoading(false);
            return;
          }

          const role = normalizeRole(userData.role);
          setUser(currentUser);
          setIsSuperAdmin(role === "superadmin");
          setIsAdmin(role === "admin" || role === "superadmin");
          setCurrentUserDepartment(userData.department || "Not Assigned");
        } else {
          setUser(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setCurrentUserDepartment(null);
          await signOut(auth);
        }
      } catch (error) {
        console.error("Error fetching user roles:", error);
        setUser(currentUser);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setCurrentUserDepartment(null);
      } finally {
        setLoading(false);
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
      setCurrentUserDepartment(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const value = {
    user,
    loading,
    isAdmin,
    isSuperAdmin,
    currentUserDepartment,
    resetPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

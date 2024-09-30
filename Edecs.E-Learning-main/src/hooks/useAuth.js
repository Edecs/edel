import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database'; // For Realtime Database
// import { getFirestore, doc, getDoc } from 'firebase/firestore'; // For Firestore

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const email = user.email;

        // Fetch roles from Firebase
        try {
          const db = getDatabase(); // For Realtime Database
          // const db = getFirestore(); // For Firestore
          const userRef = ref(db, `users/${email}`); // For Realtime Database
          // const userRef = doc(db, `users/${email}`); // For Firestore
          
          // Get user roles
          const snapshot = await get(userRef); // For Realtime Database
          // const snapshot = await getDoc(userRef); // For Firestore
          
          if (snapshot.exists()) {
            const userData = snapshot.val(); // For Realtime Database
            // const userData = snapshot.data(); // For Firestore
            
            setIsAdmin(userData.roles.includes('admin'));
            setIsSuperAdmin(userData.roles.includes('superadmin'));
          } else {
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        } catch (error) {
          console.error('Error fetching user roles:', error);
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

  return (
    <AuthContext.Provider value={{ user, isAdmin, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

import React, { createContext, useState, useEffect } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [users] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const fetchCourses = async () => {
    const coursesRef = ref(db, "courses/mainCourses");
    const coursesSnapshot = await get(coursesRef);
    if (coursesSnapshot.exists()) {
      setCourses(coursesSnapshot.val());
    }
  };

  // Full users list is admin-only under RTDB rules; pages that need it fetch locally.
  const fetchUsers = async () => {};

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      if (authUser) {
        fetchCourses().catch((err) =>
          console.error("Error fetching courses:", err)
        );
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider
      value={{ courses, users, fetchCourses, fetchUsers, loading, user }}
    >
      {children}
    </UserContext.Provider>
  );
};

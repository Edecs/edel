import React, { createContext, useState, useEffect } from "react";
import { get, ref } from "firebase/database";
import { getDatabase } from "firebase/database";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); // حالة التحميل

  const fetchCourses = async () => {
    const db = getDatabase();
    const coursesRef = ref(db, "courses/mainCourses");
    const coursesSnapshot = await get(coursesRef);
    if (coursesSnapshot.exists()) {
      setCourses(coursesSnapshot.val());
    }
  };

  const fetchUsers = async () => {
    const db = getDatabase();
    const usersRef = ref(db, "users");
    const usersSnapshot = await get(usersRef);
    if (usersSnapshot.exists()) {
      const usersData = usersSnapshot.val();
      const sanitizedUsers = Object.keys(usersData).map((email) => {
        const sanitizedEmail = email.replace(/,/g, ".");
        return { ...usersData[email], email: sanitizedEmail };
      });
      setUsers(sanitizedUsers);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchCourses();
      await fetchUsers();
      setLoading(false); // الانتهاء من تحميل البيانات
    };

    loadData();
  }, []);

  return (
    <UserContext.Provider
      value={{ courses, users, fetchCourses, fetchUsers, loading }}
    >
      {children}
    </UserContext.Provider>
  );
};

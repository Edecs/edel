import React, { createContext, useState, useEffect } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '../firebase';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); // حالة التحميل

  const fetchCourses = async () => {
    const coursesRef = ref(db, "courses/mainCourses");
    const coursesSnapshot = await get(coursesRef);
    if (coursesSnapshot.exists()) {
      setCourses(coursesSnapshot.val());
    }
  };

  const fetchUsers = async () => {
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
    fetchCourses();
    fetchUsers();
    setLoading(false); // الانتهاء من تحميل البيانات
  }, []);

  return (
    <UserContext.Provider value={{ courses, users, fetchCourses, fetchUsers, loading }}>
      {children}
    </UserContext.Provider>
  );
};

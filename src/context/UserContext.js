import React, { createContext, useState, useEffect } from "react";
import { get, ref } from "firebase/database";
import { db } from "../firebase";
import { getAuth } from "firebase/auth"; // استيراد Firebase Auth

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); // حالة التحميل
  const [user, setUser] = useState(null); // لحالة المستخدم

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
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user); // تعيين حالة المستخدم عند تغيير حالة التوثيق
      if (user) {
        fetchCourses(); // جلب الدورات لما المستخدم يكون متوثق
        fetchUsers(); // جلب المستخدمين لما المستخدم يكون متوثق
      }
      setLoading(false); // إنهاء التحميل بعد جلب البيانات
    });

    return () => unsubscribe(); // تنظيف المستمع عند تفكيك المكون
  }, []);

  return (
    <UserContext.Provider
      value={{ courses, users, fetchCourses, fetchUsers, loading, user }}
    >
      {children}
    </UserContext.Provider>
  );
};

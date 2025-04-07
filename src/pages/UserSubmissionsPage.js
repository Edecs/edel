import React, { useEffect, useState } from "react";
import { db, ref, get } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom"; // استيراد useNavigate للتوجيه إلى شاشة الشهادة
import "./UserSubmissionsPage.css";

const UserSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [user, setUser] = useState(null); // لتمثيل المستخدم الحالي
  const [userName, setUserName] = useState(""); // لتمثيل اسم المستخدم
  const navigate = useNavigate(); // تهيئة useNavigate
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(); // تهيئة Firebase Auth
    const authStateListener = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserName(currentUser.email); // جلب اسم المستخدم بناءً على البريد الإلكتروني
        fetchUserSubmissions(currentUser.email); // أو استخدم currentUser.uid إذا كنت تستخدم ID المستخدم
      } else {
        setUser(null); // إذا لم يكن هناك مستخدم مسجل دخول
      }
    });

    // تنظيف الدالة عند التدمير
    return () => authStateListener();
  }, []);

  // جلب اسم المستخدم من قاعدة البيانات بناءً على البريد الإلكتروني
  const fetchUserName = async (userEmail) => {
    try {
      const usersRef = ref(db, "users"); // جدول المستخدمين في قاعدة البيانات
      const snapshot = await get(usersRef);
      const data = snapshot.val();

      let foundUserName = "Default User"; // اسم افتراضي إذا لم يتم العثور على المستخدم
      for (const key in data) {
        if (data[key].email.toLowerCase() === userEmail.toLowerCase()) {
          foundUserName = data[key].name || "Default User";
          break;
        }
      }
      setUserName(foundUserName);
    } catch (error) {
      console.error("Error fetching user name:", error);
      setUserName("Default User"); // اسم افتراضي في حالة حدوث خطأ
    }
  };

  const fetchUserSubmissions = async (userEmail) => {
    try {
      setLoading(true);
      const submissionsRef = ref(db, "submissions");
      const snapshot = await get(submissionsRef);
      const data = snapshot.val();

      const userSubmissions = [];
      for (const key in data) {
        if (data[key]) {
          // تأكد أن الـ data[key] ليس فارغًا
          // ابحث عن جميع الدورات التي تخص البريد الإلكتروني
          for (const courseId in data[key]) {
            const submission = data[key][courseId];
            if (
              submission.email &&
              submission.email.toLowerCase().trim() ===
                userEmail.toLowerCase().trim()
            ) {
              userSubmissions.push(submission);
            }
          }
        }
      }

      setSubmissions(userSubmissions);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setLoading(false);
    }
  };

  const handleNavigateToCertificate = (submission) => {
    if (submission.percentageSuccess > 80) {
      navigate("/certificates", {
        state: {
          userName, // تمرير اسم المستخدم
          courseId: submission.courseId,
          percentageSuccess: submission.percentageSuccess,
        },
      });
    } else {
      alert("Sorry, you must score above 80% to get the certificate.");
    }
  };

  return (
    <div className="user-submissions-page">
      <header>
        <h1 className="header-h1">My Submissions</h1>
      </header>
      {loading ? (
        <p className="user-submissions-loading">Loading...</p>
      ) : submissions.length === 0 ? (
        <p className="user-submissions-empty">No submissions found.</p>
      ) : (
        <ul className="user-submissions-list">
          {submissions.map((submission, index) => (
            <li
              key={index}
              className="user-submission-item"
              onClick={() => handleNavigateToCertificate(submission)}
            >
              <h3 className="user-submission-course">{submission.courseId}</h3>
              <p className="user-submission-status">
                Status: {submission.percentageSuccess}%
              </p>
              <p className="user-submission-date">
                Submitted on: {new Date(submission.startTime).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserSubmissionsPage;

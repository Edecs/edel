import React, { useEffect, useState } from "react";
import { db, ref, get } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "./UserSubmissionsPage.css";

const UserSubmissionsPage = () => {
  const { t } = useLanguage();
  const [submissions, setSubmissions] = useState([]);
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const authStateListener = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        fetchUserName(currentUser.email);
        fetchUserSubmissions(currentUser.uid);
      }
    });
    return () => authStateListener();
  }, [t]);

  const fetchUserName = async (userEmail) => {
    try {
      const safeEmailPath = userEmail.replace(/\./g, ",");
      const userRef = ref(db, `users/${safeEmailPath}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setUserName(snapshot.val().name || t("common.defaultUser"));
      } else {
        setUserName(t("common.defaultUser"));
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
      setUserName(t("common.defaultUser"));
    }
  };

  const fetchUserSubmissions = async (uid) => {
    try {
      setLoading(true);
      const submissionsRef = ref(db, `submissions/${uid}`);
      const snapshot = await get(submissionsRef);
      const data = snapshot.val() || {};

      const userSubmissions = Object.keys(data).map((courseId) => ({
        courseId,
        ...data[courseId],
      }));

      setSubmissions(userSubmissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToCertificate = (submission) => {
    if (submission.percentageSuccess >= 80) {
      navigate("/certificates", {
        state: {
          userName,
          courseId: submission.courseId,
          percentageSuccess: submission.percentageSuccess,
          userId: getAuth().currentUser?.uid,
        },
      });
    } else {
      alert(t("userSubmissions.certificateScoreRequired"));
    }
  };

  return (
    <div className="user-submissions-page">
      <header>
        <h1 className="header-h1">{t("userSubmissions.title")}</h1>
      </header>
      {loading ? (
        <p className="user-submissions-loading">{t("userSubmissions.loading")}</p>
      ) : submissions.length === 0 ? (
        <p className="user-submissions-empty">{t("userSubmissions.empty")}</p>
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
                {t("userSubmissions.status", {
                  percentage: submission.percentageSuccess,
                })}
              </p>
              <p className="user-submission-date">
                {t("userSubmissions.submittedOn", {
                  date: new Date(submission.startTime).toLocaleString(),
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserSubmissionsPage;

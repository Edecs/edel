import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db, auth } from "../firebase";
import "./CourseDetailPage.css";

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userAccess, setUserAccess] = useState({});
  const [subCourseExpirations, setSubCourseExpirations] = useState({});

  const fetchCourseDetails = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }

      const courseRef = ref(db, `courses/mainCourses/${courseId}`);
      const courseSnapshot = await get(courseRef);

      if (!courseSnapshot.exists()) {
        setError("Course not found.");
        setCourse(null);
        return;
      }

      const courseData = courseSnapshot.val();
      setCourse(courseData);

      // جلب صلاحيات المستخدم من Firebase
      const sanitizedEmail = user.email.replace(/\./g, ",");
      const userAccessRef = ref(
        db,
        `roles/${sanitizedEmail}/courses/${courseId}`
      );
      const userAccessSnapshot = await get(userAccessRef);

      if (userAccessSnapshot.exists()) {
        const accessData = userAccessSnapshot.val();
        setUserAccess(accessData);

        // إعداد توقيتات كل SubCourse
        const expirations = {};
        Object.entries(accessData).forEach(([key, value]) => {
          if (value.expirationTime) {
            const remainingTime = value.expirationTime - Date.now();

            expirations[key] = remainingTime > 0 ? remainingTime : 0;
          }
        });

        setSubCourseExpirations(expirations);
      } else {
        setUserAccess({});
      }

      setError(null);
    } catch (error) {
      console.error("❌ Error fetching course details:", error);
      setError("Error fetching course details.");
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseDetails();
  }, [fetchCourseDetails]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSubCourseExpirations((prevExpirations) => {
        let hasActiveTimers = false;
        const updatedExpirations = {};

        Object.keys(prevExpirations).forEach((key) => {
          if (prevExpirations[key] > 1000) {
            updatedExpirations[key] = prevExpirations[key] - 1000;
            hasActiveTimers = true;
          } else {
            updatedExpirations[key] = 0;
          }
        });

        // إذا لم يكن هناك أي عداد نشط، أوقف الـ interval
        if (!hasActiveTimers) {
          clearInterval(interval);
        }

        return updatedExpirations;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // تحويل الوقت إلى hh:mm:ss
  const formatTimeLeft = (milliseconds) => {
    if (milliseconds <= 0) return "00:00:00";
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="course-detail">
      <header>
        <h1 className="header-h1">{course ? course.name : "Loading..."}</h1>
      </header>
      <div className="course-detail-container">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="error-message">Error: {error}</p>
        ) : course ? (
          <div className="course-detail-content">
            {Object.values(course.subCourses || {}).filter(
              (subCourse) => userAccess[subCourse.name]?.hasAccess
            ).length > 0 ? (
              <ul className="sub-course-list">
                {Object.entries(course.subCourses)
                  .filter(
                    ([subCourseId, subCourse]) =>
                      userAccess[subCourse.name]?.hasAccess
                  )
                  .map(([subCourseId, subCourse]) => {
                    const expirationTime = userAccess[subCourse.name]?.expirationTime;
                    // استخدم subCourseExpirations في عرض الوقت المتبقي إذا كان موجودًا
                    const timeLeft =
                      subCourseExpirations[subCourse.name] !== undefined
                        ? subCourseExpirations[subCourse.name]
                        : (expirationTime ? Math.max(expirationTime - Date.now(), 0) : Infinity);
                    const isExpired = timeLeft === 0;

                    return (
                      <li key={subCourseId} className="sub-course-item">
                        {isExpired ? (
                          <span style={{ color: "gray", cursor: "not-allowed" }}>
                            {subCourse.name}{" "}
                            <span className="sub-course-timer">
                              {typeof formatTimeLeft === 'function' ? formatTimeLeft(timeLeft) : timeLeft}
                            </span>
                          </span>
                        ) : (
                          <Link
                            to={`/sub-courses/${subCourseId}?mainCourseId=${courseId}`}
                            style={{ display: "flex", alignItems: "center" }}
                          >
                            <span>{subCourse.name}</span>
                            {expirationTime && (
                              <span className="sub-course-timer">
                                {typeof formatTimeLeft === 'function' ? formatTimeLeft(timeLeft) : timeLeft}
                              </span>
                            )}
                          </Link>
                        )}
                      </li>
                    );
                  })}
              </ul>
            ) : (
              <p className="no-sub-courses">
                No sub-courses available for this course.
              </p>
            )}
          </div>
        ) : (
          <p>No course details available.</p>
        )}
      </div>
    </div>
  );
};

export default CourseDetailPage;

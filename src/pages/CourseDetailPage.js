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
  const [currentUser, setCurrentUser] = useState(null);

  const fetchCourseDetails = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }
      setCurrentUser(user);

      const courseRef = ref(db, `courses/mainCourses/${courseId}`);
      const courseSnapshot = await get(courseRef);

      if (!courseSnapshot.exists()) {
        setError("Course not found.");
        setCourse(null);
        return;
      }

      const courseData = courseSnapshot.val();
      setCourse(courseData);

      // Fetch user permissions from Firebase
      const sanitizedEmail = user.email.replace(/\./g, ",");
      const userAccessRef = ref(
        db,
        `roles/${sanitizedEmail}/courses/${courseId}`
      );
      const userAccessSnapshot = await get(userAccessRef);

      if (userAccessSnapshot.exists()) {
        setUserAccess(userAccessSnapshot.val());
      } else {
        setUserAccess({});
      }

      setError(null);
    } catch (error) {
      console.error("Error fetching course details:", error);
      setError("Error fetching course details.");
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseDetails();
  }, [fetchCourseDetails]);

  return (
    <div className="course-detail-container">
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="error-message">Error: {error}</p>
      ) : course ? (
        <div className="course-detail-content">
          <h1 className="course-title">{course.name}</h1>
          {Object.values(course.subCourses || {}).filter(
            (subCourse) => userAccess[subCourse.name]?.hasAccess
          ).length > 0 ? (
            <ul className="sub-course-list">
              {Object.entries(course.subCourses)
                .filter(
                  ([subCourseId, subCourse]) =>
                    userAccess[subCourse.name]?.hasAccess
                )
                .map(([subCourseId, subCourse]) => (
                  <li key={subCourseId} className="sub-course-item">
                    <Link
                      to={`/sub-courses/${subCourseId}?mainCourseId=${courseId}`}
                    >
                      {subCourse.name}
                    </Link>
                  </li>
                ))}
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
  );
};

export default CourseDetailPage;

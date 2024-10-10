import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db, auth } from "../firebase"; // Ensure the path is correct, and bring in auth as well
import "./CourseDetailPage.css";

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userAccess, setUserAccess] = useState({}); // To manage user permissions
  const [currentUser, setCurrentUser] = useState(null); // To store current user

  const fetchCourseDetails = useCallback(async () => {
    try {
      const user = auth.currentUser; // Get current user
      if (!user) {
        throw new Error("User not authenticated");
      }
      setCurrentUser(user); // Store current user

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
      const sanitizedEmail = user.email.replace(/\./g, ","); // Replace dots with commas in email
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
          {Object.values(course.subCourses || {}).length > 0 ? (
            <ul className="sub-course-list">
              {Object.entries(course.subCourses).map(
                ([subCourseId, subCourse]) =>
                  userAccess?.[subCourse.name]?.hasAccess ? (
                    <li key={subCourseId} className="sub-course-item">
                      <Link
                        to={`/sub-courses/${subCourseId}?mainCourseId=${courseId}`}
                      >
                        {subCourse.name}
                      </Link>
                    </li>
                  ) : (
                    <li key={subCourseId} className="sub-course-item no-access">
                      <span>{subCourse.name} (Access Denied)</span>
                    </li>
                  )
              )}
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

import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db, auth } from "../firebase"; // تأكد من صحة المسار، واحضر auth أيضاً
import "./CourseDetailPage.css";

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userAccess, setUserAccess] = useState({}); // لإدارة صلاحيات المستخدم
  const [currentUser, setCurrentUser] = useState(null); // لتخزين المستخدم الحالي

  const fetchCourseDetails = useCallback(async () => {
    try {
      const user = auth.currentUser; // الحصول على المستخدم الحالي
      if (!user) {
        throw new Error("User not authenticated");
      }
      setCurrentUser(user); // تخزين المستخدم الحالي

      console.log(`Fetching course details for courseId: ${courseId}`); // رسالة تصحيح
      const courseRef = ref(db, `courses/mainCourses/${courseId}`);
      console.log(`Fetching data from: ${courseRef.toString()}`); // رسالة تصحيح
      const courseSnapshot = await get(courseRef);

      console.log(`Snapshot exists: ${courseSnapshot.exists()}`); // رسالة تصحيح
      if (!courseSnapshot.exists()) {
        console.log("Course not found in Firebase."); // رسالة تصحيح
        setError("Course not found.");
        setCourse(null);
        return;
      }

      const courseData = courseSnapshot.val();
      console.log("Course data:", courseData); // رسالة تصحيح
      setCourse(courseData);

      // جلب بيانات صلاحيات المستخدم من Firebase
      const sanitizedEmail = user.email.replace(/\./g, ","); // استبدال النقاط بالفواصل في الإيميل
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
                  // تحقق من الصلاحيات قبل عرض الـ subCourse
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

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '../firebase'; // تأكد من صحة المسار
import './CourseDetailPage.css';

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourseDetails = useCallback(async () => {
    try {
      console.log(`Fetching course details for courseId: ${courseId}`); // رسالة تصحيح
      const courseRef = ref(db, `courses/mainCourses/${courseId}`);
      console.log(`Fetching data from: ${courseRef.toString()}`); // رسالة تصحيح
      const courseSnapshot = await get(courseRef);

      console.log(`Snapshot exists: ${courseSnapshot.exists()}`); // رسالة تصحيح
      if (!courseSnapshot.exists()) {
        console.log('Course not found in Firebase.'); // رسالة تصحيح
        setError('Course not found.');
        setCourse(null);
        return;
      }

      const courseData = courseSnapshot.val();
      console.log('Course data:', courseData); // رسالة تصحيح
      setCourse(courseData);
      setError(null);
    } catch (error) {
      console.error('Error fetching course details:', error);
      setError('Error fetching course details.');
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
              {Object.entries(course.subCourses).map(([subCourseId, subCourse]) => (
                <li key={subCourseId} className="sub-course-item">
                  <Link to={`/sub-courses/${subCourseId}?mainCourseId=${courseId}`}>
                    {subCourse.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-sub-courses">No sub-courses available for this course.</p>
          )}
        </div>
      ) : (
        <p>No course details available.</p>
      )}
    </div>
  );
};

export default CourseDetailPage;

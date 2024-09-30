import React, { useState, useEffect, useCallback } from "react";
import { db, ref, set, get, remove } from "../firebase";
import "./CourseManagementPage.css";

// دالة لتصحيح الإيميلات بإزالة الرموز غير المدعومة
const sanitizeEmail = (email) => {
  return email.replace(/[.]/g, ","); // إزالة الهروب الزائد
};

function CourseManagementPage() {
  const [courses, setCourses] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [enrolledUsers, setEnrolledUsers] = useState([]);
  const [selectedEnrolledUsers, setSelectedEnrolledUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // دالة لتحديث نص البحث
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  // جلب قائمة الدورات الرئيسية من Firebase
  const fetchCourses = useCallback(async () => {
    try {
      const coursesRef = ref(db, "courses/mainCourses");
      const snapshot = await get(coursesRef);
      if (snapshot.exists()) {
        const coursesData = snapshot.val();
        console.log("Fetched courses:", coursesData);
        setCourses(coursesData);
      } else {
        console.log("No courses found");
        setCourses({});
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }, []);

  // جلب قائمة المستخدمين من Firebase
  const fetchUsers = useCallback(async () => {
    try {
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);
      let allUsers = snapshot.exists()
        ? Object.entries(snapshot.val()).map(([email, user]) => ({
            ...user,
            email: email.replace(/,/g, "."),
            department: user.department || "No department",
          }))
        : [];

      // استبعاد المستخدمين المسجلين في الدورة المحددة
      if (selectedCourse) {
        allUsers = allUsers.filter(
          (user) =>
            !enrolledUsers.find(
              (enrolledUser) => enrolledUser.email === user.email
            )
        );
      }

      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [selectedCourse, enrolledUsers]);

  // جلب المستخدمين المسجلين في الدورة
  const fetchEnrolledUsers = useCallback(async (courseName) => {
    try {
      const rolesRef = ref(db, "roles");
      const snapshot = await get(rolesRef);
      if (snapshot.exists()) {
        const allRoles = snapshot.val();
        const enrolledEmails = Object.keys(allRoles).filter((email) => {
          return allRoles[email].courses && allRoles[email].courses[courseName];
        });

        // جلب معلومات المستخدمين المسجلين
        const enrolledUsersData = await Promise.all(
          enrolledEmails.map(async (email) => {
            const userRef = ref(db, `users/${sanitizeEmail(email)}`);
            const userSnapshot = await get(userRef);
            return userSnapshot.exists()
              ? { ...userSnapshot.val(), email }
              : null;
          })
        );

        setEnrolledUsers(enrolledUsersData.filter((user) => user !== null));
      } else {
        setEnrolledUsers([]);
      }
    } catch (error) {
      console.error("Error fetching enrolled users:", error);
    }
  }, []);

  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // جلب المستخدمين المسجلين عند تحديد دورة
  useEffect(() => {
    if (selectedCourse) {
      fetchEnrolledUsers(selectedCourse).then(() => {
        fetchUsers();
      });
    }
  }, [selectedCourse, fetchEnrolledUsers, fetchUsers]);

  // إضافة المستخدمين للدورة
  const handleAddUsersToCourse = async () => {
    if (selectedCourse && selectedUsers.length > 0) {
      try {
        for (const user of selectedUsers) {
          const sanitizedEmail = sanitizeEmail(user.email);
          const userCoursesRef = ref(
            db,
            `roles/${sanitizedEmail}/courses/${selectedCourse}`
          );
          await set(userCoursesRef, { hasAccess: true });
        }
        await fetchEnrolledUsers(selectedCourse);
        await fetchUsers();
        setSelectedUsers([]);
      } catch (error) {
        console.error("Error adding users to course:", error);
      }
    }
  };

  // إزالة المستخدمين من الدورة
  const handleRemoveUsersFromCourse = async () => {
    if (selectedCourse && selectedEnrolledUsers.length > 0) {
      try {
        for (const userEmail of selectedEnrolledUsers) {
          const sanitizedEmail = sanitizeEmail(userEmail);
          const userCoursesRef = ref(
            db,
            `roles/${sanitizedEmail}/courses/${selectedCourse}`
          );
          await remove(userCoursesRef);
        }
        await fetchEnrolledUsers(selectedCourse);
        await fetchUsers();
        setSelectedEnrolledUsers([]);
      } catch (error) {
        console.error("Error removing users from course:", error);
      }
    }
  };

  // تحديث تحديد المستخدمين عبر checkbox
  const toggleUserSelection = (user) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.some((u) => u.email === user.email)
        ? prevSelected.filter((u) => u.email !== user.email)
        : [...prevSelected, user]
    );
  };

  // تحديث تحديد المستخدمين المسجلين عبر checkbox
  const toggleEnrolledUserSelection = (userEmail) => {
    setSelectedEnrolledUsers((prevSelected) =>
      prevSelected.includes(userEmail)
        ? prevSelected.filter((u) => u !== userEmail)
        : [...prevSelected, userEmail]
    );
  };

  // فلترة المستخدمين بناءً على نص البحث
  const filteredUsers = users.filter(
    (user) =>
      (user.name &&
        user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.department &&
        user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // فلترة المستخدمين المسجلين بناءً على نص البحث
  const filteredEnrolledUsers = enrolledUsers.filter(
    (user) =>
      (user.name &&
        user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.department &&
        user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="course-management-page">
      <header className="course-management-header">
        <h1>Course Management</h1>
      </header>

      {/* إضافة شريط البحث */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      <div className="content">
        <div className="courses-section">
          <h2>Main Courses</h2>
          <ul className="course-list">
            {Object.keys(courses).length > 0 ? (
              Object.keys(courses).map((courseId) => (
                <li
                  key={courseId}
                  onClick={() => setSelectedCourse(courseId)}
                  className={selectedCourse === courseId ? "selected" : ""}
                >
                  {courses[courseId]?.name || "No title"}
                </li>
              ))
            ) : (
              <p>No courses available</p>
            )}
          </ul>
        </div>

        <div className="users-section">
          <h2>Users</h2>
          <ul className="user-list">
            {filteredUsers.map((user) => (
              <li key={user.email}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedUsers.some((u) => u.email === user.email)}
                    onChange={() => toggleUserSelection(user)}
                  />
                  {user.name || "No name"} ({user.email || "No email"}) -{" "}
                  {user.department || "No department"}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="details-section">
          {selectedCourse && (
            <div className="course-details">
              <h2>
                Selected Course: {courses[selectedCourse]?.name || "No title"}
              </h2>
              <h3>Enrolled Users</h3>
              <ul className="enrolled-user-list">
                {filteredEnrolledUsers.map((user) => (
                  <li key={user.email}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedEnrolledUsers.includes(user.email)}
                        onChange={() => toggleEnrolledUserSelection(user.email)}
                      />
                      {user.name || "No name"} ({user.email || "No email"}) -{" "}
                      {user.department || "No department"}
                    </label>
                  </li>
                ))}
              </ul>
              <button onClick={handleAddUsersToCourse}>
                Add Users to Course
              </button>
              <button onClick={handleRemoveUsersFromCourse}>
                Remove Users from Course
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseManagementPage;

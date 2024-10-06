import React, { useState, useEffect, useCallback } from "react";
import { db, ref, set, get, remove } from "../firebase";
import "./CourseManagementPage.css";
import rightArrowIcon from "../photos/right-arrow-svgrepo-com.svg";
import leftArrowIcon from "../photos/left-arrow-svgrepo-com.svg";


const sanitizeEmail = (email) => {
  return email.replace(/[.]/g, ",");
};

function CourseManagementPage() {
  const [courses, setCourses] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [enrolledUsers, setEnrolledUsers] = useState([]);
  const [selectedEnrolledUsers, setSelectedEnrolledUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const fetchCourses = useCallback(async () => {
    try {
      const coursesRef = ref(db, "courses/mainCourses");
      const snapshot = await get(coursesRef);
      if (snapshot.exists()) {
        setCourses(snapshot.val());
      } else {
        setCourses({});
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }, []);

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

      if (selectedCourse) {
        allUsers = allUsers.filter(
          (user) =>
            !enrolledUsers.some(
              (enrolledUser) => enrolledUser.email === user.email
            )
        );
      }

      setUsers(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, [selectedCourse, enrolledUsers]);

  const fetchEnrolledUsers = useCallback(async (courseName) => {
    try {
      const rolesRef = ref(db, "roles");
      const snapshot = await get(rolesRef);
      if (snapshot.exists()) {
        const allRoles = snapshot.val();
        const enrolledEmails = Object.keys(allRoles).filter((email) => {
          return allRoles[email].courses && allRoles[email].courses[courseName];
        });

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

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    if (selectedCourse) {
      fetchEnrolledUsers(selectedCourse).then(() => {
        fetchUsers();
      });
    }
  }, [selectedCourse, fetchEnrolledUsers, fetchUsers]);

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

  const toggleUserSelection = (user) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.some((u) => u.email === user.email)
        ? prevSelected.filter((u) => u.email !== user.email)
        : [...prevSelected, user]
    );
  };

  const toggleEnrolledUserSelection = (userEmail) => {
    setSelectedEnrolledUsers((prevSelected) =>
      prevSelected.includes(userEmail)
        ? prevSelected.filter((u) => u !== userEmail)
        : [...prevSelected, userEmail]
    );
  };

  const filteredUsers = users
    .filter(
      (user) =>
        (user.name &&
          user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email &&
          user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.department &&
          user.department.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter((user) => {
      return !enrolledUsers.some(
        (enrolledUser) => enrolledUser.email === user.email
      );
    });

  const filteredEnrolledUsers = enrolledUsers.filter(
    (user) =>
      (user.name &&
        user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email &&
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.department &&
        user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const usersToDisplay = selectedCourse ? filteredUsers : [];
  const enrolledUsersToDisplay = selectedCourse ? filteredEnrolledUsers : [];

  return (
    <div className="course-management-page">
      <header className="course-management-header">
        <h1>Course Management</h1>
      </header>

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
          <ul className="user-list1">
            {usersToDisplay.map((user) => (
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

        <div className="actions">
  <button onClick={handleAddUsersToCourse}>
    <img src={rightArrowIcon} alt="Add Users to Course" />
  </button>
  <button onClick={handleRemoveUsersFromCourse}>
    <img src={leftArrowIcon} alt="Remove Users from Course" />
  </button>
</div>



        <div className="details-section">
          {selectedCourse && (
            <div className="course-details">
              <h2>
                Selected Course: {courses[selectedCourse]?.name || "No title"}
              </h2>
              <h3>Enrolled Users</h3>
              <ul className="enrolled-user-list1">
                {enrolledUsersToDisplay.map((user) => (
                  <li key={user.email}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedEnrolledUsers.includes(user.email)}
                        onChange={() =>
                          toggleEnrolledUserSelection(user.email)
                        }
                      />
                      {user.name || "No name"} ({user.email || "No email"}) -{" "}
                      {user.department || "No department"}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CourseManagementPage;

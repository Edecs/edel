import React, { useState, useEffect, useCallback } from "react";
import { db, ref, set, get, remove } from "../firebase";
import { auth } from "../firebase";
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
  const [userDepartment, setUserDepartment] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(""); // إضافة حالة الدور الحالي

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const fetchCourses = useCallback(async () => {
    try {
      const coursesRef = ref(db, "courses/mainCourses");
      const snapshot = await get(coursesRef);
      if (snapshot.exists()) {
        const allCourses = snapshot.val();

        // إذا كان الدور هو "SuperAdmin"، لا تطبق تصفية القسم
        if (currentUserRole === "SuperAdmin") {
          setCourses(allCourses);
        } else {
          const filteredCourses = Object.entries(allCourses).filter(
            ([_, course]) => course.department === userDepartment
          );
          setCourses(Object.fromEntries(filteredCourses));
        }
      } else {
        setCourses({});
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }, [userDepartment, currentUserRole]);

  const fetchUserDepartmentAndRole = useCallback(async () => {
    if (!currentUser) return;

    const userRef = ref(db, `users/${sanitizeEmail(currentUser.email)}`);
    const userSnapshot = await get(userRef);
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      setUserDepartment(userData.department);
      setCurrentUserRole(userData.role); // حفظ الدور
      console.log("User Department:", userData.department);
      console.log("User Role:", userData.role);
    }
  }, [currentUser]);

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
    fetchUserDepartmentAndRole();
  }, [fetchUserDepartmentAndRole]);

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
  const handleSelectAll = () => {
    // إذا كان جميع المستخدمين المعروضين موجودين في selectedUsers، قم بإلغاء تحديدهم
    if (
      filteredUsers.every((user) =>
        selectedUsers.some((u) => u.email === user.email)
      )
    ) {
      setSelectedUsers([]);
    } else {
      // وإلا، قم بتحديد جميع المستخدمين المعروضين
      setSelectedUsers(filteredUsers);
    }
  };
  const handleSelectAllEnrolled = () => {
    if (
      filteredEnrolledUsers.every((user) =>
        selectedEnrolledUsers.includes(user.email)
      )
    ) {
      setSelectedEnrolledUsers([]);
    } else {
      setSelectedEnrolledUsers(filteredEnrolledUsers.map((user) => user.email));
    }
  };

  return (
    <div className="course-management">
      <header>
        <h1 className="header-h1">Assign Courses</h1>
      </header>
      <div className="course-management-page">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search Users..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="management-grid">
          <div className="column courses-column">
            <h2>Available Courses</h2>
            <ul className="course-list">
              {Object.entries(courses).map(([courseName]) => (
                <li key={courseName}>
                  <button
                    className="butt"
                    onClick={() => {
                      setSelectedCourse(courseName);
                      setSelectedEnrolledUsers([]);
                    }}
                  >
                    {courseName}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="column enrolled-users-column">
            <h2>Enrolled Users</h2>
            {selectedCourse && (
              <button className="select-all-btn" onClick={handleSelectAll}>
                {filteredUsers.every((user) =>
                  selectedUsers.some((u) => u.email === user.email)
                )
                  ? "Deselect All"
                  : "Select All"}
              </button>
            )}
            <ul className="user-list">
              {enrolledUsersToDisplay.map((user) => (
                <li key={user.email}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedEnrolledUsers.includes(user.email)}
                      onChange={() => toggleEnrolledUserSelection(user.email)}
                    />
                    {user.name || "No name"} ({user.department})
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="column buttons-column">
            <button className="butt1" onClick={handleRemoveUsersFromCourse}>
              <img src={rightArrowIcon} alt="Remove Users from Course" />
            </button>
            <button className="butt1" onClick={handleAddUsersToCourse}>
              <img src={leftArrowIcon} alt="Add Users to Course" />
            </button>
          </div>

          <div className="column users-column">
            <h2>Users</h2>
            {selectedCourse && (
              <button className="select-all-btn" onClick={handleSelectAll}>
                {filteredUsers.every((user) =>
                  selectedUsers.some((u) => u.email === user.email)
                )
                  ? "Deselect All"
                  : "Select All"}
              </button>
            )}

            <ul className="user-list">
              {usersToDisplay.map((user) => (
                <li key={user.email}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedUsers.some(
                        (u) => u.email === user.email
                      )}
                      onChange={() => toggleUserSelection(user)}
                    />
                    {user.name || "No name"} ({user.department})
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseManagementPage;

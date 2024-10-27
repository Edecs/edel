import React, { useState, useEffect, useCallback } from "react";
import { db, ref, get, set } from "../firebase";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./AdminPage.css";

function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState({});
  const [courses, setCourses] = useState({});
  const [departments, setDepartments] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [newUserDepartment, setNewUserDepartment] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserDepartment, setCurrentUserDepartment] = useState("");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");

  const auth = getAuth();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const rolesRef = ref(db, "roles");
      const rolesSnapshot = await get(rolesRef);
      const rolesData = rolesSnapshot.exists() ? rolesSnapshot.val() : {};

      const usersRef = ref(db, "users");
      const usersSnapshot = await get(usersRef);
      const usersData = usersSnapshot.exists()
        ? Object.entries(usersSnapshot.val()).reduce((acc, [email, user]) => {
            const formattedEmail = email.replace(/,/g, ".");
            acc[formattedEmail] = { ...user, email: formattedEmail };
            return acc;
          }, {})
        : {};

      const departmentsRef = ref(db, "departments");
      const departmentsSnapshot = await get(departmentsRef);
      const departmentsData = departmentsSnapshot.exists()
        ? Object.values(departmentsSnapshot.val())
        : [];

      setRoles(rolesData);
      setUsers(Object.values(usersData));
      setDepartments(departmentsData);
      setCourses((await get(ref(db, "courses/mainCourses"))).val() || {});
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  const fetchCurrentUserRole = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const sanitizedEmail = user.email.replace(/\./g, ",");
        const roleRef = ref(db, `roles/${sanitizedEmail}`);
        const roleSnapshot = await get(roleRef);
        if (roleSnapshot.exists()) {
          const roleData = roleSnapshot.val();
          setCurrentUserRole(roleData.role);
          setCurrentUserDepartment(roleData.department || "");
        } else {
          setCurrentUserDepartment("");
        }
      }
    } catch (error) {
      console.error("Error fetching current user role:", error);
    }
  }, [auth]);

  const handleToggleAccess = async (email, courseId, subCourseName) => {
    try {
      const sanitizedEmail = email.replace(/\./g, ",");
      const userRoleRef = ref(
        db,
        `roles/${sanitizedEmail}/courses/${courseId}/${subCourseName}`
      );
      const currentAccessSnapshot = await get(userRoleRef);
      const currentAccess = currentAccessSnapshot.exists()
        ? currentAccessSnapshot.val().hasAccess
        : false;
      await set(userRoleRef, { hasAccess: !currentAccess });
      await fetchData();
    } catch (error) {
      console.error("Error toggling course access:", error);
    }
  };

  const getSubCourseName = (courseId, subCourseId) => {
    return (
      courses[courseId]?.subCourses?.[subCourseId]?.name || "Unknown SubCourse"
    );
  };

  const navigateToCourseManagementPage = () => {
    navigate("/course-management");
  };

  const handleRefreshData = async () => {
    try {
      await fetchData();
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  useEffect(() => {
    fetchCurrentUserRole();
    fetchData();
  }, [fetchCurrentUserRole, fetchData]);

  const handleAddUser = async () => {
    if (newUserEmail && newUserPassword && newUserName) {
      const currentAdminUser = auth.currentUser;
      const adminEmail = currentAdminUser.email;
      const adminPassword = prompt(
        "Please enter your admin password to continue"
      );

      try {
        const { user } = await createUserWithEmailAndPassword(
          auth,
          newUserEmail,
          newUserPassword
        );

        const sanitizedEmail = newUserEmail.replace(/\./g, ",");

        const rolesRef = ref(db, `roles/${sanitizedEmail}`);
        const usersRef = ref(db, `users/${sanitizedEmail}`);

        await set(rolesRef, { role: newUserRole, courses: {} });
        await set(usersRef, {
          email: newUserEmail,
          name: newUserName,
          role: newUserRole,
          department: newUserDepartment,
        });

        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserName("");
        setNewUserRole("user");
        setNewUserDepartment("");

        await fetchData();
        setIsPopupOpen(false);
      } catch (error) {
        console.error("Error adding user:", error);
      }
    }
  };

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <header className="admin-header">
        <button className="open-popup-btn" onClick={() => setIsPopupOpen(true)}>
          Create User
        </button>
        <button
          className="navigate-to-course-management-btn"
          onClick={navigateToCourseManagementPage}
        >
          Assign Courses
        </button>
        <button className="refresh-data-btn" onClick={handleRefreshData}>
          Refresh Data
        </button>
      </header>
      <input
        type="text"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="main-content">
        <div className="user-list">
          {users
            .filter(
              (user) =>
                user.name &&
                user.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((user) => (
              <div
                key={user.email}
                className="user-item"
                onClick={() => setSelectedUser(user)}
              >
                {user.name}
              </div>
            ))}
        </div>

        <div className="user-details">
          {selectedUser && (
            <>
              <h2>User Details</h2>
              <p>
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p>
                <strong>Name:</strong> {selectedUser.name}
              </p>
              <p>
                <strong>Department:</strong>{" "}
                {selectedUser.department || "Not assigned"}
              </p>
              <p>
                <strong>Role:</strong>{" "}
                {roles[selectedUser.email.replace(/\./g, ",")]?.role || ""}
              </p>
              <h3>Course Access</h3>
              <input
                type="text"
                placeholder="Search courses..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
              />
              {Object.entries(courses)
                .filter(([courseId, course]) => {
                  const userCourses =
                    roles[selectedUser.email.replace(/\./g, ",")]?.courses ||
                    {};
                  const hasMainCourseAccess = userCourses[courseId]?.hasAccess;

                  const isMainCourseMatch = course.name
                    .toLowerCase()
                    .includes(courseSearchQuery.toLowerCase());

                  const isSubCourseMatch =
                    course.subCourses &&
                    Object.values(course.subCourses).some(
                      (subCourse, subCourseId) =>
                        userCourses[courseId]?.[subCourseId]?.hasAccess &&
                        subCourse.name
                          .toLowerCase()
                          .includes(courseSearchQuery.toLowerCase())
                    );

                  return (
                    hasMainCourseAccess &&
                    (isMainCourseMatch || isSubCourseMatch)
                  );
                })
                .map(([courseId, course]) => (
                  <div key={courseId}>
                    <h4>{course.name}</h4>
                    {course.subCourses &&
                      Object.entries(course.subCourses).map(
                        ([subCourseId, subCourse]) => (
                          <div key={subCourseId}>
                            <input
                              type="checkbox"
                              checked={
                                !!roles[selectedUser.email.replace(/\./g, ",")]
                                  ?.courses?.[courseId]?.[subCourseId]
                                  ?.hasAccess
                              }
                              onChange={() =>
                                handleToggleAccess(
                                  selectedUser.email,
                                  courseId,
                                  subCourseId
                                )
                              }
                            />
                            {subCourse.name}
                          </div>
                        )
                      )}
                  </div>
                ))}
            </>
          )}
        </div>
      </div>
      {isPopupOpen && (
        <div className="popup">
          <div className="popup-content">
            <h2>Create User</h2>
            <input
              type="text"
              placeholder="Email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
            />
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <input
              type="text"
              placeholder="Department"
              value={newUserDepartment}
              onChange={(e) => setNewUserDepartment(e.target.value)}
            />
            <button className="add-user-btn" onClick={handleAddUser}>
              Add User
            </button>
            <button
              className="close-popup-btn"
              onClick={() => setIsPopupOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;

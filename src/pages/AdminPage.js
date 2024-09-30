import React, { useState, useEffect, useCallback } from "react";
import { db, ref, set, get, remove } from "../firebase"; // استيراد العمليات على قاعدة البيانات
import { getAuth, deleteUser, signInWithEmailAndPassword } from "firebase/auth"; // استيراد العمليات المتعلقة بالمصادقة
import { createUserWithEmailAndPassword } from "firebase/auth"; // لإنشاء مستخدم جديد
import { useNavigate } from "react-router-dom"; // لتوجيه المستخدم بين الصفحات
import "./AdminPage.css"; // استيراد التنسيقات


function AdminPage() {
  const [users, setUsers] = useState([]); // لتخزين قائمة المستخدمين
  const [roles, setRoles] = useState({}); // لتخزين قائمة الأدوار
  const [courses, setCourses] = useState({}); // لتخزين قائمة الكورسات
  const [newUserEmail, setNewUserEmail] = useState(""); // لتخزين البريد الإلكتروني للمستخدم الجديد
  const [newUserName, setNewUserName] = useState(""); // لتخزين اسم المستخدم الجديد
  const [newUserPassword, setNewUserPassword] = useState(""); // لتخزين كلمة مرور المستخدم الجديد
  const [newUserRole, setNewUserRole] = useState("admin"); // لتحديد دور المستخدم الجديد
  const [newUserDepartment, setNewUserDepartment] = useState("Top Management"); // لتحديد قسم المستخدم الجديد
  const [isPopupOpen, setIsPopupOpen] = useState(false); // للتحكم في عرض النافذة المنبثقة
  const [selectedUser, setSelectedUser] = useState(null); // لتحديد المستخدم المختار

  const auth = getAuth(); // للحصول على مصادقة Firebase

  const departments = [
    // قائمة الأقسام المتاحة
    "Top Management",
    "Administration and Gov. Relations",
    "Projects Management Departments",
    "Commercial Department",
    "Project Control Department",
    "Operation Support Unit",
    "Contract Department",
    "HSE Department",
    "QA/QC Department",
    "Business Applications",
    "Strategy and Innovation",
    "Finance Department",
    "HR Department",
    "Communication and Marketing Department",
    "Internal Audit, Ethics & Compliance",
    "EDECS Foundation",
    "Marketing",
    "Information Technology",
  ];


  const navigate = useNavigate();
  const fetchCurrentUserRole = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const sanitizedEmail = user.email.replace(/\./g, ",");
        const roleRef = ref(db, `roles/${sanitizedEmail}`);
        const roleSnapshot = await get(roleRef);
        if (roleSnapshot.exists()) {
          // معالجة الدور إذا كان موجودًا (حاليًا غير مستخدمة)
        }
      }
    } catch (error) {
      console.error("Error fetching current user role:", error);
    }
  }, [auth]);


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

      setRoles(rolesData);
      setUsers(Object.values(usersData));
      setCourses((await get(ref(db, "courses/mainCourses"))).val() || {});
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);


  useEffect(() => {
    fetchCurrentUserRole();
    fetchData();
  }, [fetchCurrentUserRole, fetchData]);

  const handleAddUser = async () => {
    if (newUserEmail && newUserPassword && newUserName) {
      const currentAdminUser = auth.currentUser; // حفظ المستخدم الحالي
      const adminEmail = currentAdminUser.email;
      const adminPassword = prompt("Please enter your admin password to continue"); // طلب كلمة مرور المدير الحالي

      try {
        // إنشاء المستخدم الجديد
        const { user } = await createUserWithEmailAndPassword(
          auth,
          newUserEmail,
          newUserPassword
        );

        // تخزين بيانات المستخدم الجديد في قاعدة البيانات
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

        // إعادة تسجيل الدخول بالحساب الإداري
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

        // إعادة تعيين المدخلات
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserName("");
        setNewUserRole("admin");
        setNewUserDepartment("Top Management");

        // تحديث البيانات وإغلاق النافذة
        await fetchData();
        setIsPopupOpen(false);
      } catch (error) {
        console.error("Error adding user:", error);
      }
    }
  };

  
  
  

  const handleRoleChange = async (userEmail, newRole) => {
    try {
      const sanitizedEmail = userEmail.replace(/\./g, ",");
      const roleRef = ref(db, `roles/${sanitizedEmail}`);
      const userRef = ref(db, `users/${sanitizedEmail}`);

      await set(roleRef, {
        role: newRole,
        courses: roles[sanitizedEmail]?.courses || {},
      });

      await set(userRef, {
        ...users[sanitizedEmail],
        role: newRole,
      });

      await fetchData();
    } catch (error) {
      console.error("Error changing user role:", error);
    }
  };

  const handleUpdateCourseAccess = async (
    userEmail,
    courseId,
    subCourseName,
    hasAccess
  ) => {
    try {
      const sanitizedEmail = userEmail.replace(/\./g, ",");
      const userCoursesRef = ref(db, `roles/${sanitizedEmail}/courses`);

      const userCoursesSnapshot = await get(userCoursesRef);
      const userCourses = userCoursesSnapshot.exists() ? userCoursesSnapshot.val() : {};

      if (!userCourses[courseId]) {
        userCourses[courseId] = {};
      }

      if (subCourseName) {
        userCourses[courseId][subCourseName] = { hasAccess };
      } else {
        userCourses[courseId] = { hasAccess };
      }

      await set(userCoursesRef, userCourses);
      await fetchData();
    } catch (error) {
      console.error("Error updating course access:", error);
    }
  };

  const handleToggleAccess = (userEmail, courseId, subCourseName) => {
    if (!selectedUser) return;

    const sanitizedEmail = selectedUser.email.replace(/\./g, ",");
    const currentCourseAccess = roles[sanitizedEmail]?.courses?.[courseId] || {};
    const hasAccess = subCourseName
      ? !!currentCourseAccess[subCourseName]?.hasAccess
      : !!currentCourseAccess.hasAccess;

    handleUpdateCourseAccess(userEmail, courseId, subCourseName, !hasAccess);
  };


  const handleDisableUser = async (userEmail) => {
    try {
      const sanitizedEmail = userEmail.replace(/\./g, ",");
      const roleRef = ref(db, `roles/${sanitizedEmail}`);
      const userRef = ref(db, `users/${sanitizedEmail}`);

      await set(roleRef, {
        role: "Disabled",
        courses: roles[sanitizedEmail]?.courses || {},
      });

      await set(userRef, {
        ...users[sanitizedEmail],
        role: "Disabled",
      });

      await fetchData();
    } catch (error) {
      console.error("Error disabling user:", error);
    }
  };

  const handleRemoveUser = async (userEmail) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user found");

      const sanitizedEmail = userEmail.replace(/\./g, ",");
      const userRef = ref(db, `users/${sanitizedEmail}`);
      const roleRef = ref(db, `roles/${sanitizedEmail}`);

      // Remove user from Firebase Authentication
      const userToDelete = await getAuth().getUserByEmail(userEmail);
      await deleteUser(userToDelete);

      // Remove user data from the database
      await remove(userRef);
      await remove(roleRef);

      await fetchData();
      setSelectedUser(null);
    } catch (error) {
      console.error("Error removing user:", error);
    }
  };

  const navigateToCourseManagementPage = () => {
    navigate("/course-management");
  };

  const handleRefreshData = async () => {
    await fetchData();
  };

  const getSubCourseName = (courseId, subCourseId) => {
    return (
      courses[courseId]?.subCourses?.[subCourseId]?.name || "Unknown SubCourse"
    );
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="open-popup-btn" onClick={() => setIsPopupOpen(true)}>
          Create User
        </button>
        <button
          className="navigate-to-course-management-btn"
          onClick={navigateToCourseManagementPage}
        >
          Manage Courses
        </button>
        <button className="refresh-data-btn" onClick={handleRefreshData}>
          Refresh Data
        </button>
      </header>

      <div className="main-content">
        <div className="user-list">
          {users.map((user) => (
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

      {/* عرض الصلاحية بدون تعديل */}
      <p>
        <strong>Role:</strong>{" "}
        {roles[selectedUser.email.replace(/\./g, ",")]?.role || ""}
      </p>

      {/* التحكم في الوصول إلى الكورسات */}
      <h3>Course Access</h3>
      {Object.entries(courses).map(([courseId, course]) => (
        <div key={courseId}>
          <h4>{course.name}</h4>
          {course.subCourses && Object.entries(course.subCourses).map(([subCourseId, subCourse]) => (
            <div key={subCourseId}>
              <span>{getSubCourseName(courseId, subCourseId)}</span>
              <button onClick={() => handleToggleAccess(selectedUser.email, courseId, subCourse.name)}>
                Toggle Access
              </button>
            </div>
          ))}
        </div>
      ))}
    </>
  )}
</div>

      </div>

      {isPopupOpen && (
        <div className="popup">
          <div className="popup-content">
            <h2>Create New User</h2>
            <label>
              Email:
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </label>
            <label>
              Name:
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </label>
            <label>
              Password:
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </label>
            <label>
              Role:
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
              >
                <option value="admin">admin</option>
                <option value="User">User</option>
              </select>
            </label>
            <label>
              Department:
              <select
                value={newUserDepartment}
                onChange={(e) => setNewUserDepartment(e.target.value)}
              >
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={handleAddUser}>Add User</button>
            <button onClick={() => setIsPopupOpen(false)}>Close</button>
          </div>
        </div>
      )} {/* Closing the Popup component */}
    </div> 
  ); // Closing the return statement
}



export default AdminPage;

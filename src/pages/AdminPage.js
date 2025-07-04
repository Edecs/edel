import React, { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase"; // استيراد قاعدة البيانات فقط
import { ref as dbRef } from "firebase/database";
import { get, ref, set, remove, getDatabase } from "firebase/database";
import { update } from "firebase/database"; // إضافة update هنا
import { push } from "../firebase";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./AdminPage.css";

function AdminPage() {
  const [expirationTimes, setExpirationTimes] = useState({});
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
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedSubCourses, setSelectedSubCourses] = useState([]);
  const [isSubCoursePopupOpen, setIsSubCoursePopupOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [sites, setSites] = useState([]);
  const [employeeSite, setEmployeeSite] = useState("");

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

      const coursesRef = ref(db, "courses/mainCourses");
      const coursesSnapshot = await get(coursesRef);
      const coursesData = coursesSnapshot.exists() ? coursesSnapshot.val() : {};

      setRoles(rolesData);
      setUsers(Object.values(usersData));
      setDepartments(departmentsData);
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  const fetchCurrentUserRole = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const sanitizedEmail = user.email.replace(/\./g, ",");
        const roledbRef = dbRef(db, `roles/${sanitizedEmail}`);
        const roleSnapshot = await get(roledbRef);
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
  const handleToggleAccess = async (
    email,
    courseId,
    subCourseName,
    expirationTime
  ) => {
    try {
      const sanitizedEmail = email.replace(/\./g, ",");
      const userRoledbRef = dbRef(
        db,
        `roles/${sanitizedEmail}/courses/${courseId}/${subCourseName}`
      );

      const currentAccessSnapshot = await get(userRoledbRef);
      const currentAccess = currentAccessSnapshot.exists()
        ? currentAccessSnapshot.val().hasAccess
        : false;

      if (currentAccess) {
        // 🔴 إزالة الصلاحية عند إيقافها
        await remove(userRoledbRef);
        await addLog("REMOVE_COURSE_ACCESS", { targetEmail: email, courseId, subCourseName });
      } else {
        const accessData = { hasAccess: true };
        if (expirationTime) {
          accessData.expirationTime = expirationTime; // فقط أضف وقت الصلاحية إذا كان موجودًا
        }

        await set(userRoledbRef, accessData);
        await addLog("GRANT_COURSE_ACCESS", { targetEmail: email, courseId, subCourseName });
      }

      await fetchData(); // تحديث البيانات بعد التغيير
    } catch (error) {
      console.error("Error toggling course access:", error);
    }
  };

  useEffect(() => {
    const checkAndRemoveExpiredAccess = async () => {
      try {
        const rolesdbRef = dbRef(db, "roles"); // قاعدة بيانات الأدوار
        const rolesSnapshot = await get(rolesdbRef);

        if (rolesSnapshot.exists()) {
          const rolesData = rolesSnapshot.val();
          const now = Date.now();

          for (const userEmail in rolesData) {
            if (rolesData[userEmail].courses) {
              for (const courseId in rolesData[userEmail].courses) {
                for (const subCourseId in rolesData[userEmail].courses[
                  courseId
                ]) {
                  const subCourseData =
                    rolesData[userEmail].courses[courseId][subCourseId];

                  if (subCourseData.hasAccess && subCourseData.expirationTime) {
                    if (now >= subCourseData.expirationTime) {
                      // إزالة الصلاحية عند انتهاء الوقت
                      const expireddbRef = dbRef(
                        db,
                        `roles/${userEmail}/courses/${courseId}/${subCourseId}`
                      );
                      await remove(expireddbRef);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Error checking expired access:", error);
      }
    };

    // تشغيل الفحص كل دقيقة
    const interval = setInterval(() => {
      checkAndRemoveExpiredAccess();
    }, 60 * 1000); // كل 60 ثانية

    return () => clearInterval(interval); // تنظيف التايمر عند تفكيك الكومبوننت
  }, []);

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

  // Helper to get admin info for logs
  const getAdminLogInfo = async () => {
    let userName = "Unknown";
    let userEmail = auth.currentUser?.email || "Unknown";
    if (userEmail !== "Unknown") {
      const safeEmailPath = userEmail.replace(/\./g, ",");
      const userRef = dbRef(db, `users/${safeEmailPath}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        userName = userData.name || userEmail;
      }
    }
    return { userName };
  };

  // Log helper
  const addLog = async (eventType, extra = {}) => {
    const { userName } = await getAdminLogInfo();
    const logsRef = dbRef(db, "logs");
    let detailMessage = "";
    // تخصيص نص اللوج حسب نوع العملية
    if (eventType === "ADD_USER" && extra.targetEmail) {
      detailMessage = `تم إضافة مستخدم جديد (${extra.targetEmail})`;
    } else if (eventType === "REMOVE_COURSE_ACCESS" && extra.targetEmail && extra.courseId && extra.subCourseName) {
      detailMessage = `تم إزالة صلاحية الكورس (${extra.courseId} - ${extra.subCourseName}) عن المستخدم (${extra.targetEmail})`;
    } else if (eventType === "GRANT_COURSE_ACCESS" && extra.targetEmail && extra.courseId && extra.subCourseName) {
      detailMessage = `تم منح صلاحية الكورس (${extra.courseId} - ${extra.subCourseName}) للمستخدم (${extra.targetEmail})`;
    } else if (eventType === "BULK_ASSIGN" && extra.users && extra.subCourses) {
      const usersStr = extra.users.join("، ");
      const subCoursesStr = extra.subCourses.join("، ");
      detailMessage = `تم تعيين الصلاحيات للمستخدمين (${usersStr}) على الدورات الفرعية (${subCoursesStr})`;
    } else if (eventType === "TOGGLE_MODERATOR" && extra.targetEmail) {
      detailMessage = `تم تغيير حالة المشرف للمستخدم (${extra.targetEmail}) إلى ${extra.newValue ? "مشرف" : "ليس مشرف"}`;
    }
    const logEntry = {
      userName,
      timestamp: new Date().toISOString(),
      detailMessage,
    };
    await push(logsRef, logEntry);
  };

  const handleAddUser = async () => {
    if (newUserEmail && newUserPassword && newUserName) {
      const currentAdminUser = auth.currentUser; // Keep current user
      const adminEmail = currentAdminUser.email;
      const adminPassword = prompt(
        "Please enter your admin password to continue"
      ); // Prompt current admin password

      try {
        // Create new user
        const { user } = await createUserWithEmailAndPassword(
          auth,
          newUserEmail,
          newUserPassword
        );

        // Sanitize email for storage
        const sanitizedEmail = newUserEmail.replace(/\./g, ",");

        // Prepare dbReferences to save new user data
        const roledbRef = dbRef(db, `roles/${sanitizedEmail}`);
        const usersdbRef = dbRef(db, `users/${sanitizedEmail}`);

        // إضافة المستخدم الجديد إلى قاعدة البيانات مع الموقع
        await set(roledbRef, { role: newUserRole, courses: {} });
        await set(usersdbRef, {
          email: newUserEmail,
          name: newUserName,
          role: newUserRole,
          department: newUserDepartment,
          site: employeeSite, // إضافة الموقع
        });
        await addLog("ADD_USER", { targetEmail: newUserEmail });

        // Re-sign in with admin account
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

        // Reset inputs
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserName("");
        setNewUserRole("user");
        setNewUserDepartment(""); // Reset new user department
        setEmployeeSite(""); // Reset the site

        // Update data and close popup
        await fetchData();
        setIsPopupOpen(false);
      } catch (error) {
        console.error("Error adding user:", error);
      }
    }
  };

  const handleBulkAssign = async () => {
    if (selectedUsers.length === 0 || selectedSubCourses.length === 0) {
      alert("يرجى تحديد المستخدمين والدورات الفرعية!");
      return;
    }

    const updates = {};

    selectedUsers.forEach((userEmail) => {
      const sanitizedEmail = userEmail.replace(/\./g, ",");

      selectedSubCourses.forEach((subCourseId) => {
        // ✅ إيجاد الـ mainCourseId لهذا الـ subCourseId
        let mainCourseId = null;
        Object.entries(courses).forEach(([courseId, course]) => {
          if (course.subCourses && course.subCourses[subCourseId]) {
            mainCourseId = courseId;
          }
        });

        if (!mainCourseId) {
          console.error(`❌ لم يتم العثور على كورس رئيسي لـ ${subCourseId}`);
          return;
        }

        const expirationTime = expirationTimes[subCourseId] || null;

        updates[
          `roles/${sanitizedEmail}/courses/${mainCourseId}/${subCourseId}`
        ] = {
          hasAccess: true,
          ...(expirationTime ? { expirationTime } : {}),
        };
      });
    });

    try {
      await update(dbRef(db), updates);
      await addLog("BULK_ASSIGN", { users: selectedUsers, subCourses: selectedSubCourses });
      alert("✅ تم تحديث الصلاحيات بنجاح!");
    } catch (error) {
      console.error("❌ خطأ في حفظ الصلاحيات:", error);
      alert("❌ حدث خطأ أثناء تحديث الصلاحيات.");
    }
    setIsSubCoursePopupOpen(false);
  };

  const toggleUserSelection = (email) => {
    setSelectedUsers((prev) =>
      prev.includes(email)
        ? prev.filter((user) => user !== email)
        : [...prev, email]
    );
  };

  const toggleSubCourseSelection = (subCourseId) => {
    setSelectedSubCourses((prev) =>
      prev.includes(subCourseId)
        ? prev.filter((id) => id !== subCourseId)
        : [...prev, subCourseId]
    );
  };
  const [position, setPosition] = useState({ x: 200, y: 100 });
  const popupRef = useRef(null);

  const handleDragStart = (e) => {
    const element = popupRef.current;
    if (!element) return;

    const shiftX = e.clientX - element.getBoundingClientRect().left;
    const shiftY = e.clientY - element.getBoundingClientRect().top;

    const handleMouseMove = (event) => {
      setPosition({
        x: event.clientX - shiftX,
        y: event.clientY - shiftY,
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const toLocalDatetimeString = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const db = getDatabase();
        const sitesRef = ref(db, "sites");
        const snapshot = await get(sitesRef);
        if (snapshot.exists()) {
          const sitesData = snapshot.val();
          const sitesList = Object.entries(sitesData).map(([id, site]) => ({
            id,
            name: site.name,
          }));
          setSites(sitesList);
        }
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };
    fetchSites();
  }, []);
  const handleMakeModerator = async (email) => {
    try {
      const sanitized = email.replace(/\./g, ",");
      const roleRef = dbRef(db, `roles/${sanitized}`);
      // نقرأ البيانات الحالية
      const snap = await get(roleRef);
      const data = snap.exists() ? snap.val() : {};
      const isMod = data.moderator === true;

      // نحدّث الحقل moderator
      await update(roleRef, { moderator: !isMod });
      await addLog("TOGGLE_MODERATOR", { targetEmail: email, newValue: !isMod });

      // نحدّث الستيت محليًا
      setRoles((prev) => ({
        ...prev,
        [sanitized]: {
          ...prev[sanitized],
          moderator: !isMod,
        },
      }));
    } catch (err) {
      console.error("Error toggling moderator:", err);
    }
  };

  return (
    <div className="admin-page-all">
      <header>
        <h1 className="header-h1">Admin Dashboard</h1>
      </header>
      <div className="admin-page">
        <header className="admin-header">
          <button
            className="open-popup-btn"
            onClick={() => setIsPopupOpen(true)}
          >
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
          <div className="user-list4">
            <h2>Users</h2>
            <button
              className="select-all-btn"
              onClick={() => {
                const filteredUserEmails = users
                  .filter(
                    (user) =>
                      user.name
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      user.department
                        ?.toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      user.email
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                  )
                  .map((user) => user.email);

                // إذا كان جميعهم محددين، قم بإلغاء التحديد، وإلا قم بتحديدهم
                if (
                  filteredUserEmails.every((email) =>
                    selectedUsers.includes(email)
                  )
                ) {
                  setSelectedUsers([]);
                } else {
                  setSelectedUsers(filteredUserEmails);
                }
              }}
            >
              {users.length > 0 &&
              users.every((user) => selectedUsers.includes(user.email))
                ? "Deselect All"
                : "Select All"}
            </button>

            <button
              className="assign-subcourses-btn"
              onClick={() => setIsSubCoursePopupOpen(true)}
              disabled={selectedUsers.length === 0} // تعطيل الزر إذا لم يتم تحديد أي مستخدم
            >
              Assign SubCourses
            </button>

            {users
              .filter((user) => {
                const q = searchQuery.toLowerCase();
                const name = user.name?.toLowerCase() || "";
                const dept = user.department?.toLowerCase() || "";
                const email = user.email?.toLowerCase() || "";
                const site = user.site?.toString().toLowerCase() || "";
                return (
                  name.includes(q) ||
                  dept.includes(q) ||
                  email.includes(q) ||
                  site.includes(q)
                );
              })

              .map((user) => (
                <div
                  key={user.email}
                  className={`user-item ${
                    selectedUser?.email === user.email ? "active" : ""
                  }`}
                  onClick={() => setSelectedUser(user)} // تحديد المستخدم عند النقر
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.email)}
                    onChange={() => toggleUserSelection(user.email)}
                    onClick={(e) => e.stopPropagation()} // منع التفاعل غير المقصود مع التحديد
                  />
                  {user.name}
                </div>
              ))}
          </div>

          {isSubCoursePopupOpen && (
            <div
              className="subcourse-modal"
              ref={popupRef}
              onMouseDown={handleDragStart}
            >
              <h2 className="subcourse-moda0">Assign SubCourses</h2>

              {Object.entries(courses).map(([courseId, course]) => {
                const isAccessibleForAll = selectedUsers.every((userEmail) => {
                  const sanitizedEmail = userEmail.replace(/\./g, ",");
                  return roles[sanitizedEmail]?.courses?.[courseId]?.hasAccess;
                });
                if (!isAccessibleForAll) return null;

                return (
                  <div key={courseId}>
                    <h4>{course.name}</h4>
                    {course.subCourses &&
                      Object.entries(course.subCourses).map(
                        ([subCourseId, subCourse]) => (
                          <div key={subCourseId} className="subcourse-item">
                            {/* حقل تعديل التاريخ */}
                            <input
                              type="datetime-local"
                              className="timer-input"
                              value={
                                expirationTimes[subCourseId]
                                  ? toLocalDatetimeString(
                                      expirationTimes[subCourseId]
                                    )
                                  : ""
                              }
                              onChange={(e) => {
                                const newTime = e.target.value
                                  ? new Date(e.target.value).getTime()
                                  : null;
                                setExpirationTimes((prev) => ({
                                  ...prev,
                                  [subCourseId]: newTime,
                                }));
                              }}
                            />

                            {/* خانة اختيار الدورة الفرعية */}
                            <input
                              type="checkbox"
                              className="access-checkbox"
                              checked={selectedSubCourses.includes(subCourseId)}
                              onChange={() =>
                                toggleSubCourseSelection(subCourseId)
                              }
                            />
                            <label className="subcourse-label">
                              {subCourse.name}
                            </label>
                          </div>
                        )
                      )}
                  </div>
                );
              })}

              <div className="modal-buttons1">
                <button className="modal-apply-btn1" onClick={handleBulkAssign}>
                  Apply
                </button>
                <button
                  className="modal-cancel-btn1"
                  onClick={() => setIsSubCoursePopupOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="user-details">
            {selectedUser && (
              <div className="user-details1">
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
                  <strong>Site:</strong> {selectedUser.site || "Not assigned"}{" "}
                  {/* عرض الموقع */}
                </p>
                <p>
                  <strong>Role:</strong>{" "}
                  {roles[selectedUser.email.replace(/\./g, ",")]?.role || ""}
                </p>
                {currentUserRole === "SuperAdmin" && selectedUser && (
                  <button
                    className="make-moderator-btn"
                    onClick={() => handleMakeModerator(selectedUser.email)}
                  >
                    {roles[selectedUser.email.replace(/\./g, ",")]?.moderator
                      ? "Remove Moderator"
                      : "Make Moderator"}
                  </button>
                )}

                <h3>Sub-course Access</h3>
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)} // استخدام onChange
                />

                {Object.entries(courses)
                  .filter(([courseId, course]) => {
                    const q = courseSearchQuery.toLowerCase();
                    const name = course.name?.toLowerCase() || "";
                    return name.includes(q);
                  })

                  .map(([courseId, course]) => {
                    // الحصول على بيانات صلاحيات المستخدم
                    const userCourses =
                      roles[selectedUser.email.replace(/\./g, ",")]?.courses;
                    // إذا لم يمتلك المستخدم صلاحية الـ main course، لا نقوم بعرض هذا الكورس
                    if (!userCourses || !userCourses[courseId]) {
                      return null;
                    }

                    return (
                      <div key={courseId}>
                        <h4>{course.name}</h4>
                        {course.subCourses && (
                          <div className="subcourses-container">
                            {Object.entries(course.subCourses).map(
                              ([subCourseId, subCourse]) => (
                                <div className="sup" key={subCourseId}>
                                  <input
                                    type="datetime-local"
                                    className="timer-input"
                                    value={
                                      expirationTimes[subCourseId]
                                        ? toLocalDatetimeString(
                                            expirationTimes[subCourseId]
                                          )
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const newTime = e.target.value
                                        ? new Date(e.target.value).getTime()
                                        : null;
                                      setExpirationTimes((prev) => ({
                                        ...prev,
                                        [subCourseId]: newTime,
                                      }));
                                    }}
                                  />

                                  <input
                                    type="checkbox"
                                    checked={
                                      !!userCourses[courseId][subCourseId]
                                        ?.hasAccess
                                    }
                                    onChange={() =>
                                      handleToggleAccess(
                                        selectedUser.email,
                                        courseId,
                                        subCourseId,
                                        expirationTimes[subCourseId]
                                      )
                                    }
                                  />
                                  <label>
                                    {getSubCourseName(courseId, subCourseId)}
                                  </label>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
        {isPopupOpen && (
          <div className="popup">
            <button className="wa" onClick={() => setIsPopupOpen(false)}>
              X
            </button>

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
              value={employeeSite}
              onChange={(e) => setEmployeeSite(e.target.value)}
            >
              <option value="">Select Site</option>
              {sites.map((site) => (
                <option key={site.name} value={site.name}>
                  {site.name}
                </option>
              ))}
            </select>

            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value)}
            >
              <option value="user">User</option>
              {currentUserRole === "SuperAdmin" && (
                <option value="admin">Admin</option>
              )}
            </select>
            {currentUserRole === "SuperAdmin" ? (
              <select
                value={newUserDepartment}
                onChange={(e) => setNewUserDepartment(e.target.value)}
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={newUserDepartment}
                onChange={(e) => setNewUserDepartment(e.target.value)}
              >
                <option value="">Select Department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            )}

            <button className="addus" onClick={handleAddUser}>
              Add
            </button>
          </div>
        )}{" "}
      </div>
    </div>
  );
}

export default AdminPage;

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { db } from "../firebase"; // استيراد قاعدة البيانات فقط
import { ref as dbRef } from "firebase/database";
import { get, ref, set, remove, getDatabase } from "firebase/database";
import { update } from "firebase/database"; // إضافة update هنا
import { push } from "../firebase";

import {
  getAuth,
} from "firebase/auth";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { firebaseConfig } from "../firebase";
import { createAuthUserWithoutSessionSwap } from "../utils/createAuthUser";
import {
  filterCoursesByDepartment,
  filterUsersByDepartment,
} from "../utils/departmentScope";
import "./AdminPage.css";

function AdminPage() {
  const { t } = useLanguage();
  const { isSuperAdmin, currentUserDepartment } = useAuth();
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
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedSubCourses, setSelectedSubCourses] = useState([]);
  const [selectedMainCourses, setSelectedMainCourses] = useState([]);
  const [isAssignPopupOpen, setIsAssignPopupOpen] = useState(false);
  const [assignTab, setAssignTab] = useState("main"); // main | sub
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [sites, setSites] = useState([]);
  const [employeeSite, setEmployeeSite] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [assignProgress, setAssignProgress] = useState("");
  const [assignResult, setAssignResult] = useState(null);

  const auth = getAuth();

  const scopedCourses = useMemo(
    () =>
      filterCoursesByDepartment(courses, {
        isSuperAdmin,
        department: currentUserDepartment,
      }),
    [courses, isSuperAdmin, currentUserDepartment]
  );

  const scopedUsers = useMemo(
    () =>
      filterUsersByDepartment(users, {
        isSuperAdmin,
        department: currentUserDepartment,
      }),
    [users, isSuperAdmin, currentUserDepartment]
  );

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
      courses[courseId]?.subCourses?.[subCourseId]?.name || t("admin.unknownSubCourse")
    );
  };

  const openAssignPopup = (tab = "main") => {
    setAssignTab(tab);
    setAssignResult(null);
    setAssignProgress("");
    setIsAssignPopupOpen(true);
  };

  const closeAssignPopup = () => {
    if (isAssigning) return;
    setIsAssignPopupOpen(false);
    setSelectedMainCourses([]);
    setSelectedSubCourses([]);
    setAssignResult(null);
    setAssignProgress("");
  };

  const toggleMainCourseSelection = (courseId) => {
    setSelectedMainCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleBulkAssignMainCourses = async () => {
    if (isAssigning) return;
    if (selectedUsers.length === 0 || selectedMainCourses.length === 0) {
      alert(t("admin.selectUsersAndCourses"));
      return;
    }

    setIsAssigning(true);
    setAssignResult(null);
    const ok = [];
    const fail = [];
    const total = selectedUsers.length * selectedMainCourses.length;
    let done = 0;

    try {
      for (const userEmail of selectedUsers) {
        const sanitizedEmail = userEmail.replace(/\./g, ",");
        for (const courseId of selectedMainCourses) {
          done += 1;
          setAssignProgress(
            t("admin.assignProgress", {
              current: done,
              total,
              email: userEmail,
            })
          );
          try {
            const courseAccessRef = dbRef(
              db,
              `roles/${sanitizedEmail}/courses/${courseId}`
            );
            const snap = await get(courseAccessRef);
            const existing = snap.exists() ? snap.val() : {};
            await set(courseAccessRef, { ...existing, hasAccess: true });
            ok.push({ email: userEmail, courseId });
          } catch (itemErr) {
            console.error("Assign main course failed:", itemErr);
            fail.push({
              email: userEmail,
              courseId,
              error: itemErr.message || t("admin.permissionsUpdateError"),
            });
          }
        }
      }

      if (ok.length > 0) {
        await addLog("BULK_ASSIGN", {
          users: selectedUsers,
          subCourses: selectedMainCourses,
        });
        await fetchData();
      }

      setAssignResult({ ok, fail });
      setAssignProgress("");
      alert(
        t("admin.assignSummary", {
          success: ok.length,
          failed: fail.length,
          total,
        })
      );
      if (fail.length === 0) {
        setAssignTab("sub");
        setSelectedMainCourses([]);
      }
    } catch (error) {
      console.error("Error assigning main courses:", error);
      alert(t("admin.permissionsUpdateError"));
    } finally {
      setIsAssigning(false);
      setAssignProgress("");
    }
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
      detailMessage = t("admin.logAddUser", { email: extra.targetEmail });
    } else if (eventType === "REMOVE_COURSE_ACCESS" && extra.targetEmail && extra.courseId && extra.subCourseName) {
      detailMessage = t("admin.logRemoveAccess", { course: extra.courseId, sub: extra.subCourseName, email: extra.targetEmail });
    } else if (eventType === "GRANT_COURSE_ACCESS" && extra.targetEmail && extra.courseId && extra.subCourseName) {
      detailMessage = t("admin.logGrantAccess", { course: extra.courseId, sub: extra.subCourseName, email: extra.targetEmail });
    } else if (eventType === "BULK_ASSIGN" && extra.users && extra.subCourses) {
      const usersStr = extra.users.join("، ");
      const subCoursesStr = extra.subCourses.join("، ");
      detailMessage = t("admin.logBulkAssign", { users: usersStr, subCourses: subCoursesStr });
    } else if (eventType === "TOGGLE_MODERATOR" && extra.targetEmail) {
      detailMessage = t("admin.logToggleModerator", { email: extra.targetEmail, status: extra.newValue ? t("admin.moderator") : t("admin.notModerator") });
    } else if (eventType === "DELETE_USER" && extra.targetEmail) {
      detailMessage = t("admin.logDeleteUser", { email: extra.targetEmail });
    }
    const logEntry = {
      userName,
      timestamp: new Date().toISOString(),
      detailMessage,
    };
    await push(logsRef, logEntry);
  };

  const handleAddUser = async () => {
    if (isCreatingUser) return;
    if (!(newUserEmail && newUserPassword && newUserName)) {
      alert(t("admin.fillAllUserFields"));
      return;
    }

    setIsCreatingUser(true);
    try {
      const email = newUserEmail.trim().toLowerCase();
      await createAuthUserWithoutSessionSwap(firebaseConfig, {
        email,
        password: newUserPassword,
        displayName: newUserName,
      });

      const sanitizedEmail = email.replace(/\./g, ",");
      const roledbRef = dbRef(db, `roles/${sanitizedEmail}`);
      const usersdbRef = dbRef(db, `users/${sanitizedEmail}`);

      await set(roledbRef, { role: newUserRole, courses: {}, email });
      await set(usersdbRef, {
        email,
        name: newUserName,
        role: newUserRole,
        department: isSuperAdmin
          ? newUserDepartment
          : currentUserDepartment || newUserDepartment,
        site: employeeSite,
      });
      await remove(dbRef(db, `disabledUsers/${sanitizedEmail}`)).catch(
        () => {}
      );
      await addLog("ADD_USER", { targetEmail: email });

      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      setNewUserRole("user");
      setNewUserDepartment("");
      setEmployeeSite("");

      await fetchData();
      setIsPopupOpen(false);
      alert(t("admin.userCreatedSuccess", { email }));
    } catch (error) {
      console.error("Error adding user:", error);
      alert(
        t("admin.userCreateError", {
          error: error.message || t("admin.permissionsUpdateError"),
        })
      );
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleBulkAssign = async () => {
    if (isAssigning) return;
    if (selectedUsers.length === 0 || selectedSubCourses.length === 0) {
      alert(t("admin.selectUsersAndSubCourses"));
      return;
    }

    setIsAssigning(true);
    setAssignResult(null);
    const ok = [];
    const fail = [];
    const pairs = [];

    selectedUsers.forEach((userEmail) => {
      const sanitizedEmail = userEmail.replace(/\./g, ",");
      selectedSubCourses.forEach((subCourseId) => {
        let mainCourseId = null;
        Object.entries(courses).forEach(([courseId, course]) => {
          if (course.subCourses && course.subCourses[subCourseId]) {
            mainCourseId = courseId;
          }
        });
        if (!mainCourseId) {
          fail.push({
            email: userEmail,
            courseId: subCourseId,
            error: t("admin.mainCourseNotFound", { sub: subCourseId }),
          });
          return;
        }
        pairs.push({ userEmail, sanitizedEmail, subCourseId, mainCourseId });
      });
    });

    let done = 0;
    const total = pairs.length + fail.length;

    try {
      for (const pair of pairs) {
        done += 1;
        setAssignProgress(
          t("admin.assignProgress", {
            current: done,
            total: Math.max(total, pairs.length),
            email: pair.userEmail,
          })
        );
        try {
          const expirationTime = expirationTimes[pair.subCourseId] || null;
          const path = `roles/${pair.sanitizedEmail}/courses/${pair.mainCourseId}/${pair.subCourseId}`;
          await update(dbRef(db), {
            [path]: {
              hasAccess: true,
              ...(expirationTime ? { expirationTime } : {}),
            },
          });
          ok.push({
            email: pair.userEmail,
            courseId: pair.subCourseId,
          });
        } catch (itemErr) {
          fail.push({
            email: pair.userEmail,
            courseId: pair.subCourseId,
            error: itemErr.message || t("admin.permissionsUpdateError"),
          });
        }
      }

      if (ok.length > 0) {
        await addLog("BULK_ASSIGN", {
          users: selectedUsers,
          subCourses: selectedSubCourses,
        });
        await fetchData();
      }

      setAssignResult({ ok, fail });
      alert(
        t("admin.assignSummary", {
          success: ok.length,
          failed: fail.length,
          total: ok.length + fail.length,
        })
      );
      if (fail.length === 0) {
        closeAssignPopup();
      }
    } catch (error) {
      console.error("❌ خطأ في حفظ الصلاحيات:", error);
      alert(t("admin.permissionsUpdateError"));
    } finally {
      setIsAssigning(false);
      setAssignProgress("");
    }
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
      const snap = await get(roleRef);
      const data = snap.exists() ? snap.val() : {};
      const isMod = data.moderator === true;
      const makingModerator = !isMod;

      await update(roleRef, { moderator: makingModerator });
      await addLog("TOGGLE_MODERATOR", {
        targetEmail: email,
        newValue: makingModerator,
      });

      setRoles((prev) => ({
        ...prev,
        [sanitized]: {
          ...prev[sanitized],
          moderator: makingModerator,
        },
      }));

      // Sync certificate signatory name onto main courses of this user's department
      const userSnap = await get(dbRef(db, `users/${sanitized}`));
      const userData = userSnap.exists() ? userSnap.val() : {};
      const displayName = (userData.name || email || "").trim();
      const dept = String(userData.department || "")
        .trim()
        .toLowerCase();

      if (displayName && dept) {
        const coursesSnap = await get(dbRef(db, "courses/mainCourses"));
        if (coursesSnap.exists()) {
          const all = coursesSnap.val();
          const updates = {};
          Object.entries(all).forEach(([courseId, course]) => {
            const courseDept = String(course.department || "")
              .trim()
              .toLowerCase();
            if (courseDept === dept) {
              if (makingModerator) {
                updates[`courses/mainCourses/${courseId}/moderatorName`] =
                  displayName;
              } else if (
                String(course.moderatorName || "").trim() === displayName
              ) {
                updates[`courses/mainCourses/${courseId}/moderatorName`] = "";
              }
            }
          });
          if (Object.keys(updates).length > 0) {
            await update(dbRef(db), updates);
          }
        }
      }

      alert(
        makingModerator
          ? t("admin.moderatorEnabled", { name: displayName || email })
          : t("admin.moderatorDisabled", { name: displayName || email })
      );
    } catch (err) {
      console.error("Error toggling moderator:", err);
      alert(t("admin.permissionsUpdateError"));
    }
  };

  const handleDeleteUser = async (email) => {
    if (!window.confirm(t("admin.confirmDeleteUser", { email }))) {
      return;
    }

    try {
      const sanitized = email.replace(/\./g, ",").toLowerCase();

      // Soft-disable: block login (Spark cannot delete other Auth users without Admin SDK)
      await set(dbRef(db, `disabledUsers/${sanitized}`), true);
      await remove(dbRef(db, `roles/${sanitized}`));
      await remove(dbRef(db, `users/${sanitized}`));

      await addLog("DELETE_USER", { targetEmail: email });

      await fetchData();
      setSelectedUser(null);
      alert(t("admin.userDeletedSuccess", { email }));
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(t("admin.userDeleteError"));
    }
  };

  return (
    <div className="admin-page-all">
      <header>
        <h1 className="header-h1">{t("admin.title")}</h1>
      </header>
      <div className="admin-page">
        <header className="admin-header">
          <button
            className="open-popup-btn"
            onClick={() => setIsPopupOpen(true)}
          >
            {t("admin.createUser")}
          </button>
          <button className="refresh-data-btn" onClick={handleRefreshData}>
            {t("admin.refreshData")}
          </button>
        </header>
        <input
          type="text"
          placeholder={t("admin.searchUsers")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="main-content">
          <div className="user-list4">
            <h2>{t("admin.users")}</h2>
            <button
              className="select-all-btn"
              onClick={() => {
                const filteredUserEmails = scopedUsers
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
              {scopedUsers.length > 0 &&
              scopedUsers.every((user) => selectedUsers.includes(user.email))
                ? t("common.deselectAll")
                : t("common.selectAll")}
            </button>

            <button
              className="assign-subcourses-btn"
              onClick={() => openAssignPopup("main")}
              disabled={selectedUsers.length === 0}
            >
              {t("admin.assignAccess")}
            </button>

            {scopedUsers
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

          {isAssignPopupOpen && (
            <div
              className="subcourse-modal"
              ref={popupRef}
              onMouseDown={handleDragStart}
            >
              <h2 className="subcourse-moda0">{t("admin.assignAccess")}</h2>

              <div className="assign-tabs">
                <button
                  type="button"
                  className={`assign-tab-btn ${assignTab === "main" ? "active" : ""}`}
                  onClick={() => setAssignTab("main")}
                >
                  {t("admin.tabMainCourses")}
                </button>
                <button
                  type="button"
                  className={`assign-tab-btn ${assignTab === "sub" ? "active" : ""}`}
                  onClick={() => setAssignTab("sub")}
                >
                  {t("admin.tabSubCourses")}
                </button>
              </div>

              {isAssigning && (
                <div className="assign-busy" role="status" aria-live="polite">
                  <div className="assign-spinner" />
                  <p>{assignProgress || t("admin.assigning")}</p>
                </div>
              )}

              {assignResult && !isAssigning && (
                <div className="assign-result-box">
                  <p>
                    {t("admin.assignSummary", {
                      success: assignResult.ok.length,
                      failed: assignResult.fail.length,
                      total:
                        assignResult.ok.length + assignResult.fail.length,
                    })}
                  </p>
                  {assignResult.fail.length > 0 && (
                    <ul className="assign-fail-list">
                      {assignResult.fail.map((item, idx) => (
                        <li key={idx}>
                          {item.email} — {item.courseId}: {item.error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {assignTab === "main" && (
                <div className="assign-tab-panel">
                  <p className="assign-hint">{t("admin.selectMainCoursesHint")}</p>
                  {Object.entries(scopedCourses).map(([courseId, course]) => (
                    <div key={courseId} className="subcourse-item">
                      <input
                        type="checkbox"
                        className="access-checkbox"
                        checked={selectedMainCourses.includes(courseId)}
                        onChange={() => toggleMainCourseSelection(courseId)}
                        disabled={isAssigning}
                      />
                      <label className="subcourse-label">
                        {course.name || courseId}
                      </label>
                    </div>
                  ))}
                  <div className="modal-buttons1">
                    <button
                      className="modal-apply-btn1"
                      onClick={handleBulkAssignMainCourses}
                      disabled={isAssigning}
                    >
                      {isAssigning ? t("admin.assigning") : t("common.apply")}
                    </button>
                    <button
                      className="modal-cancel-btn1"
                      onClick={closeAssignPopup}
                      disabled={isAssigning}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}

              {assignTab === "sub" && (
                <div className="assign-tab-panel">
                  {Object.entries(scopedCourses).filter(([courseId]) =>
                    selectedUsers.every((userEmail) => {
                      const sanitizedEmail = userEmail.replace(/\./g, ",");
                      const courseNode =
                        roles[sanitizedEmail]?.courses?.[courseId];
                      return (
                        courseNode?.hasAccess === true ||
                        (courseNode &&
                          Object.keys(courseNode).some(
                            (k) => k !== "hasAccess" && courseNode[k]?.hasAccess
                          ))
                      );
                    })
                  ).length === 0 ? (
                    <p className="assign-hint">{t("admin.noMainCourseAccess")}</p>
                  ) : (
                    Object.entries(scopedCourses).map(([courseId, course]) => {
                      const isAccessibleForAll = selectedUsers.every(
                        (userEmail) => {
                          const sanitizedEmail = userEmail.replace(/\./g, ",");
                          const courseNode =
                            roles[sanitizedEmail]?.courses?.[courseId];
                          return (
                            courseNode?.hasAccess === true ||
                            (courseNode &&
                              Object.keys(courseNode).some(
                                (k) =>
                                  k !== "hasAccess" && courseNode[k]?.hasAccess
                              ))
                          );
                        }
                      );
                      if (!isAccessibleForAll) return null;

                      return (
                        <div key={courseId}>
                          <h4>{course.name}</h4>
                          {course.subCourses &&
                            Object.entries(course.subCourses).map(
                              ([subCourseId, subCourse]) => (
                                <div key={subCourseId} className="subcourse-item">
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
                                    className="access-checkbox"
                                    checked={selectedSubCourses.includes(
                                      subCourseId
                                    )}
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
                    })
                  )}

                  <div className="modal-buttons1">
                    <button
                      className="modal-apply-btn1"
                      onClick={handleBulkAssign}
                      disabled={isAssigning}
                    >
                      {isAssigning ? t("admin.assigning") : t("common.apply")}
                    </button>
                    <button
                      className="modal-cancel-btn1"
                      onClick={closeAssignPopup}
                      disabled={isAssigning}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="user-details">
            {selectedUser && (
              <div className="user-details1">
                <h2>{t("admin.userDetails")}</h2>
                <p>
                  <strong>{t("admin.emailLabel")}</strong> {selectedUser.email}
                </p>
                <p>
                  <strong>{t("admin.nameLabel")}</strong> {selectedUser.name}
                </p>
                <p>
                  <strong>{t("admin.departmentLabel")}</strong>{" "}
                  {selectedUser.department || t("common.notAssigned")}
                </p>
                <p>
                  <strong>{t("admin.siteLabel")}</strong> {selectedUser.site || t("common.notAssigned")}{" "}
                  {/* عرض الموقع */}
                </p>
                <p>
                  <strong>{t("admin.roleLabel")}</strong>{" "}
                  {roles[selectedUser.email.replace(/\./g, ",")]?.role || ""}
                </p>
                {isSuperAdmin && selectedUser && (
                  <div className="admin-buttons-group">
                    <button
                      className="make-moderator-btn"
                      onClick={() => handleMakeModerator(selectedUser.email)}
                    >
                      {roles[selectedUser.email.replace(/\./g, ",")]?.moderator
                        ? t("admin.removeModerator")
                        : t("admin.makeModerator")}
                    </button>
                    <button
                      className="delete-user-btn"
                      onClick={() => handleDeleteUser(selectedUser.email)}
                    >
                      {t("admin.deleteUser")}
                    </button>
                  </div>
                )}

                <h3>{t("admin.subCourseAccess")}</h3>
                <input
                  type="text"
                  placeholder={t("admin.searchCourses")}
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)} // استخدام onChange
                />

                {Object.entries(scopedCourses)
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
              {t("common.close")}
            </button>

            <h2>{t("admin.createUser")}</h2>

            <input
              type="text"
              placeholder={t("admin.emailPlaceholder")}
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder={t("admin.namePlaceholder")}
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
            />
            <input
              type="password"
              placeholder={t("admin.passwordPlaceholder")}
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
            />
            <select
              value={employeeSite}
              onChange={(e) => setEmployeeSite(e.target.value)}
            >
              <option value="">{t("common.selectSite")}</option>
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
              <option value="user">{t("common.roleUser")}</option>
              {isSuperAdmin && (
                <option value="admin">{t("common.roleAdmin")}</option>
              )}
            </select>
            {isSuperAdmin ? (
              <select
                value={newUserDepartment}
                onChange={(e) => setNewUserDepartment(e.target.value)}
              >
                <option value="">{t("common.selectDepartment")}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={currentUserDepartment || ""}
                disabled
              >
                <option value={currentUserDepartment || ""}>
                  {currentUserDepartment || t("common.selectDepartment")}
                </option>
              </select>
            )}

            <button
              className="addus"
              onClick={handleAddUser}
              disabled={isCreatingUser}
            >
              {isCreatingUser ? t("admin.creatingUser") : t("common.add")}
            </button>
          </div>
        )}{" "}
      </div>
    </div>
  );
}

export default AdminPage;

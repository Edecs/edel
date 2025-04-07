import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import WelcomePage from "./pages/WelcomePage";
import UserSubmissionsPage from "./pages/UserSubmissionsPage";

import AdminPage from "./pages/AdminPage";
import SubmissionsPage from "./pages/SubmissionsPage";

import CoursePage from "./pages/CoursePage";
import CourseDetailPage from "./pages/CourseDetailPage";
import SubCourseDetailPage from "./pages/SubCourseDetailPage";
import UserProgressPage from "./pages/UserProgressPage";
import CourseManagementPage from "./pages/CourseManagementPage";
import AddTaskPage from "./pages/AddTaskPage";
import NotFoundPage from "./pages/NotFoundPage";
import ArchivedTasksPage from "./pages/ArchivedTasksPage";
import DepartmentManagement from "./pages/DepartmentManagement";

import SiteManagement from "./pages/SiteManagement";

import LoadingScreen from "./components/LoadingScreen";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import EmailForm from "./pages/EmailForm";
import BulkUserUpload from "./pages/BulkUserUpload";
import CertificatePage from "./pages/CertificatePage"; // استيراد الصفحة الجديدة

import { useAuth } from "./context/AuthContext";
import Modal from "react-modal";
import "./App.css";

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isAdmin, isSuperAdmin, loading, logout } = useAuth();
  const timeoutDuration = 5400000; // 1.5 ساعة
  const warningDuration = 60000; // دقيقة واحدة للتحذير
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logoutTimer, setLogoutTimer] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState(null); // لحفظ معرف العد التنازلي

  const handleSidebarToggle = () => {
    setIsSidebarOpen((prevState) => !prevState);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        startWarningCountdown();
      }, timeoutDuration - warningDuration);

      setLogoutTimer(timer);

      return () => clearTimeout(timer);
    }
  }, [user, timeoutDuration]);

  const startWarningCountdown = () => {
    setCountdown(warningDuration / 1000); // بدء العد التنازلي
    setIsModalOpen(true);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleLogoutConfirm(); // تسجيل الخروج عند انتهاء الوقت
        }
        return prev - 1;
      });
    }, 1000);

    setCountdownInterval(interval); // حفظ معرف العد التنازلي لإيقافه عند الحاجة
  };

  const resetTimer = () => {
    // إلغاء العد التنازلي الحالي
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }

    // إغلاق النافذة وإعادة تعيين المؤقت
    setIsModalOpen(false);
    setCountdown(0);

    // إلغاء المؤقت السابق
    if (logoutTimer) {
      clearTimeout(logoutTimer);
    }

    // تعيين مؤقت جديد
    const timer = setTimeout(() => {
      startWarningCountdown();
    }, timeoutDuration);

    setLogoutTimer(timer);
  };

  const handleLogoutConfirm = () => {
    // تسجيل الخروج
    logout();
    setIsModalOpen(false);

    // تنظيف جميع المؤقتات
    if (logoutTimer) {
      clearTimeout(logoutTimer);
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const storedUserEmail = localStorage.getItem("userEmail");

  return (
    <div className="app-container">
      {user && <Navbar onSidebarToggle={handleSidebarToggle} />}
      {user && <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />}
      <main className="main-content" onClick={closeSidebar}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {!user && !storedUserEmail ? (
            <Route path="*" element={<Navigate to="/" replace />} />
          ) : (
            <>
              <Route path="/welcome" element={<WelcomePage />} />
              <Route
                path="/UserSubmissionsPage"
                element={<UserSubmissionsPage />}
              />

              <Route path="/courses" element={<CoursePage />} />
              <Route path="/certificates" element={<CertificatePage />} />

              <Route path="/courses/:courseId" element={<CourseDetailPage />} />
              <Route
                path="/sub-courses/:subCourseId"
                element={<SubCourseDetailPage />}
              />
              <Route path="/user-progress" element={<UserProgressPage />} />
              <Route path="/add-task" element={<AddTaskPage />} />
              <Route path="/archived-tasks" element={<ArchivedTasksPage />} />
              <Route path="/Email-Form" element={<EmailForm />} />

              {(isAdmin || isSuperAdmin) && (
                <>
                  <Route path="/admin" element={<AdminPage />} />
                  <Route
                    path="/course-management"
                    element={<CourseManagementPage />}
                  />
                  <Route
                    path="/Submissions-Page"
                    element={<SubmissionsPage />}
                  />
                  <Route path="/BulkUser-Upload" element={<BulkUserUpload />} />

                  <Route
                    path="/department-management"
                    element={<DepartmentManagement />}
                  />
                  <Route path="/Site-Management" element={<SiteManagement />} />
                </>
              )}
              <Route path="*" element={<NotFoundPage />} />
            </>
          )}
          <Route path="/" element={<LoginPage />} />
        </Routes>
      </main>

      <Modal
        isOpen={isModalOpen}
        contentLabel="تأكيد تسجيل الخروج"
        ariaHideApp={false}
        className="modal1"
        overlayClassName="overlay"
        shouldCloseOnOverlayClick={false}
      >
        <h2>تأكيد تسجيل الخروج / Logout Confirmation</h2>
        <p>
          لقد كنت غير نشط. سيتم تسجيل خروجك خلال <strong>{countdown}</strong>{" "}
          ثانية.
        </p>
        <div>
          <button onClick={resetTimer}>أنا هنا / I'm here</button>
          <button onClick={handleLogoutConfirm}>تسجيل الخروج / Log Out</button>
        </div>
      </Modal>
    </div>
  );
};

export default App;

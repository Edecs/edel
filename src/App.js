import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import WelcomePage from "./pages/WelcomePage";
import AdminPage from "./pages/AdminPage";
import CoursePage from "./pages/CoursePage";
import CourseDetailPage from "./pages/CourseDetailPage";
import SubCourseDetailPage from "./pages/SubCourseDetailPage";
import UserProgressPage from "./pages/UserProgressPage";
import CourseManagementPage from "./pages/CourseManagementPage";
import AddTaskPage from "./pages/AddTaskPage";
import NotFoundPage from "./pages/NotFoundPage";
import ArchivedTasksPage from "./pages/ArchivedTasksPage";
import DepartmentManagement from "./pages/DepartmentManagement";
import LoadingScreen from "./components/LoadingScreen";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import EmailForm from "./pages/EmailForm";

import { useAuth } from "./context/AuthContext";
import Modal from "react-modal";
import "./App.css";

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isAdmin, isSuperAdmin, loading, logout } = useAuth();
  const timeoutDuration = 5400000; // 1 دقيقة بالميلي ثانية
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logoutTimer, setLogoutTimer] = useState(null); // تعريف معرف المؤقت

  const handleSidebarToggle = () => {
    setIsSidebarOpen((prevState) => !prevState);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setIsModalOpen(true); // افتح النافذة المنبثقة بعد الوقت المحدد
      }, timeoutDuration);

      setLogoutTimer(timer); // تخزين معرف المؤقت

      return () => clearTimeout(timer); // تنظيف المؤقت عند التحديث
    }
  }, [user, timeoutDuration]);

  const handleLogoutConfirm = () => {
    logout(); // تسجيل الخروج
    setIsModalOpen(false); // إغلاق النافذة المنبثقة
    if (logoutTimer) {
      clearTimeout(logoutTimer); // تنظيف المؤقت عند تأكيد تسجيل الخروج
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
              <Route path="/courses" element={<CoursePage />} />
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
                    path="/department-management"
                    element={<DepartmentManagement />}
                  />
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
        <p>لقد كنت غير نشط / You have been inactive</p>
        <div>
          <button onClick={handleLogoutConfirm}>تسجيل الخروج / Log Out</button>
        </div>
      </Modal>
    </div>
  );
};

export default App;

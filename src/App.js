import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import PrivateRoute from "./components/PrivateRoute";
import LoginPage from "./pages/LoginPage";
import WelcomePage from "./pages/WelcomePage";
import UserSubmissionsPage from "./pages/UserSubmissionsPage";
import AdminPage from "./pages/AdminPage";
import SubmissionsPage from "./pages/SubmissionsPage";
import CoursePage from "./pages/CoursePage";
import CourseDetailPage from "./pages/CourseDetailPage";
import SubCourseDetailPage from "./pages/SubCourseDetailPage";
import UserProgressPage from "./pages/UserProgressPage";
import AddTaskPage from "./pages/AddTaskPage";
import NotFoundPage from "./pages/NotFoundPage";
import ArchivedTasksPage from "./pages/ArchivedTasksPage";
import DepartmentManagement from "./pages/DepartmentManagement";
import SiteManagement from "./pages/SiteManagement";
import LoadingScreen from "./components/LoadingScreen";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import BulkUserUpload from "./pages/BulkUserUpload";
import CertificatePage from "./pages/CertificatePage";
import LogsPage from "./pages/LogsPage";
import { useAuth } from "./context/AuthContext";
import { useLanguage } from "./context/LanguageContext";
import Modal from "react-modal";
import "./App.css";

const App = () => {
  const { t } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const timeoutDuration = 5400000;
  const warningDuration = 60000;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logoutTimer, setLogoutTimer] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState(null);

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startWarningCountdown = () => {
    setCountdown(warningDuration / 1000);
    setIsModalOpen(true);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleLogoutConfirm();
        }
        return prev - 1;
      });
    }, 1000);

    setCountdownInterval(interval);
  };

  const resetTimer = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }

    setIsModalOpen(false);
    setCountdown(0);

    if (logoutTimer) {
      clearTimeout(logoutTimer);
    }

    const timer = setTimeout(() => {
      startWarningCountdown();
    }, timeoutDuration);

    setLogoutTimer(timer);
  };

  const handleLogoutConfirm = () => {
    logout();
    setIsModalOpen(false);

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

  return (
    <div className="app-container">
      {user && <Navbar onSidebarToggle={handleSidebarToggle} />}
      {user && <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />}
      <main className="main-content" onClick={closeSidebar}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/welcome"
            element={
              <PrivateRoute>
                <WelcomePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/UserSubmissionsPage"
            element={
              <PrivateRoute>
                <UserSubmissionsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <PrivateRoute>
                <CertificatePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <PrivateRoute>
                <CourseDetailPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/sub-courses/:subCourseId"
            element={
              <PrivateRoute>
                <SubCourseDetailPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/courses"
            element={
              <PrivateRoute requireRole="admin">
                <CoursePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/add-task"
            element={
              <PrivateRoute requireRole="admin">
                <AddTaskPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/archived-tasks"
            element={
              <PrivateRoute requireRole="admin">
                <ArchivedTasksPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute requireRole="admin">
                <AdminPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/Submissions-Page"
            element={
              <PrivateRoute requireRole="admin">
                <SubmissionsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/BulkUser-Upload"
            element={
              <PrivateRoute requireRole="admin">
                <BulkUserUpload />
              </PrivateRoute>
            }
          />
          <Route
            path="/department-management"
            element={
              <PrivateRoute requireRole="admin">
                <DepartmentManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/Site-Management"
            element={
              <PrivateRoute requireRole="admin">
                <SiteManagement />
              </PrivateRoute>
            }
          />
          <Route
            path="/user-progress"
            element={
              <PrivateRoute requireRole="admin">
                <UserProgressPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <PrivateRoute requireRole="superadmin">
                <LogsPage />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Modal
        isOpen={isModalOpen}
        contentLabel={t("session.contentLabel")}
        ariaHideApp={false}
        className="modal1"
        overlayClassName="overlay"
        shouldCloseOnOverlayClick={false}
      >
        <h2>{t("session.logoutConfirmationTitle")}</h2>
        <p>{t("session.inactiveWarning", { countdown })}</p>
        <div>
          <button onClick={resetTimer}>{t("session.imHere")}</button>
          <button onClick={handleLogoutConfirm}>{t("session.logOut")}</button>
        </div>
      </Modal>
    </div>
  );
};

export default App;

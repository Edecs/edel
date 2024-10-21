import React from "react";
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
import ResetPasswordPage from "./pages/ResetPasswordPage"; // استيراد صفحة إعادة تعيين كلمة المرور
import { useAuth } from "./context/AuthContext";
import "./App.css";

const App = () => { 
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { user, isAdmin, isSuperAdmin, loading } = useAuth();

  const handleSidebarToggle = () => {
    setIsSidebarOpen((prevState) => !prevState);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
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
          {/* إضافة مسار صفحة إعادة تعيين كلمة المرور */}
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
    </div>
  );
};

export default App;

import React, { useEffect, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { ReactComponent as HomeIcon } from "../photos/icons8-home.svg";
import { ReactComponent as UserSubmissionsPageIcon } from "../photos/test-svgrepo-com.svg";

import { ReactComponent as CoursesIcon } from "../photos/add.svg";
import { ReactComponent as ProgressIcon } from "../photos/address-book.svg";
import { ReactComponent as SubmissionsIcon } from "../photos/Submissions.svg";
import { ReactComponent as SiteIcon } from "../photos/construction.svg";
import { ReactComponent as AdminIcon } from "../photos/user-add-outlined.svg";
import { ReactComponent as AddTaskIcon } from "../photos/add task.svg";
import { ReactComponent as ArchiveIcon } from "../photos/archive-down-svgrepo-com.svg";
import { ReactComponent as DepartmentIcon } from "../photos/open-data-square.svg"; // تأكد من وجود أيقونة للقسم
import { ReactComponent as BulkUserUpload } from "../photos/upload-svgrepo-com.svg"; // تأكد من وجود أيقونة للقسم
import { ReactComponent as LogsIcon } from "../photos/log-list.svg";
import changePasswordIcon from "../photos/change-password-icon.svg";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose }) {
  const { t } = useLanguage();
  const { isAdmin, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const closeModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
        navigate("/");
        if (onClose) {
          onClose();
        }
      } else {
        console.error("Logout function is not available.");
      }
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setError(t("password.currentRequired"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("password.passwordsDoNotMatch"));
      return;
    }
    if (newPassword.length < 6) {
      setError(t("password.minLength"));
      return;
    }
    try {
      const auth = getAuth();
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setError("");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert(t("password.successAlert"));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClickOutside = useCallback((event) => {
    const sidebarElement = document.querySelector(".sidebar");
    if (sidebarElement && !sidebarElement.contains(event.target)) {
      if (onClose) onClose();
    }
  }, [onClose]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <>
      <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <ul>
        <li>
          <Link to="/welcome" onClick={onClose} title={t("nav.home")}>
            <HomeIcon className="sidebar-icon" />
          </Link>
        </li>
        <li>
          <Link
            to="/UserSubmissionsPage"
            onClick={onClose}
            title={t("nav.userSubmissions")}
          >
            <UserSubmissionsPageIcon className="sidebar-icon" />
          </Link>
        </li>
        {(isAdmin || isSuperAdmin) && (
          <>
            <li>
              <Link to="/courses" onClick={onClose} title={t("nav.courses")}>
                <CoursesIcon className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link to="/admin" onClick={onClose} title={t("nav.admin")}>
                <AdminIcon className="sidebar-icon" />
              </Link>
            </li>

            <li>
              <Link
                to="/Submissions-Page"
                onClick={onClose}
                title={t("nav.submissionsPage")}
              >
                <SubmissionsIcon className="sidebar-icon" />
              </Link>
            </li>
<li>
              <Link to="/add-task" onClick={onClose} title={t("nav.addTask")}>
                <AddTaskIcon className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link
                to="/archived-tasks"
                onClick={onClose}
                title={t("nav.archivedTasks")}
              >
                <ArchiveIcon className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link
                to="/BulkUser-Upload"
                onClick={onClose}
                title={t("nav.bulkUserUpload")}
              >
                <BulkUserUpload className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link to="/user-progress" onClick={onClose} title={t("nav.userProgress")}>
                <ProgressIcon className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link
                to="/department-management"
                onClick={onClose}
                title={t("nav.departmentManagement")}
              >
                <DepartmentIcon className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link
                to="/Site-Management"
                onClick={onClose}
                title={t("nav.siteManagement")}
              >
                <SiteIcon className="sidebar-icon" />
              </Link>
            </li>
          </>
        )}
        {isSuperAdmin && (
          <li>
            <Link to="/logs" onClick={onClose} title={t("nav.logs")}>
              <LogsIcon className="sidebar-icon" />
            </Link>
          </li>
        )}
        <li>
          <button onClick={() => setShowPasswordModal(true)} className="sidebar-button" title={t("nav.changePassword")}>
            <img src={changePasswordIcon} alt={t("nav.changePassword")} className="sidebar-icon" />
          </button>
        </li>
      </ul>
    </div>
    {showPasswordModal && (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>{t("password.title")}</h3>
          <input
            type="password"
            placeholder={t("password.currentPassword")}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder={t("password.newPassword")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder={t("password.confirmNewPassword")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button onClick={handleChangePassword}>{t("password.submit")}</button>
          <button onClick={closeModal}>{t("common.cancel")}</button>
        </div>
      </div>
    )}
    </>
  );
} 

export default Sidebar;

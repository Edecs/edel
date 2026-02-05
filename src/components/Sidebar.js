import React, { useEffect, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
import { ReactComponent as EmailFormIcon } from "../photos/email-essential-letter-svgrepo-com.svg"; // تأكد من وجود أيقونة للقسم
import { ReactComponent as BulkUserUpload } from "../photos/upload-svgrepo-com.svg"; // تأكد من وجود أيقونة للقسم
import { ReactComponent as LogsIcon } from "../photos/log-list.svg";
import changePasswordIcon from "../photos/change-password-icon.svg";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose }) {
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
      setError("Current password is required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
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
      alert("Password changed successfully");
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
          <Link to="/welcome" onClick={onClose} title="Home">
            <HomeIcon className="sidebar-icon" />
          </Link>
        </li>
        <li>
          <Link
            to="UserSubmissionsPage"
            onClick={onClose}
            title="UserSubmissionsPage"
          >
            <UserSubmissionsPageIcon className="sidebar-icon" />
          </Link>
        </li>
        {(isAdmin || isSuperAdmin) && (
          <>
            <li>
              <Link to="/courses" onClick={onClose} title="Courses">
                <CoursesIcon className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link to="/admin" onClick={onClose} title="Admin">
                <AdminIcon className="sidebar-icon" />
              </Link>
            </li>

            <li>
              <Link
                to="/Submissions-Page"
                onClick={onClose}
                title="Submissions Page"
              >
                <SubmissionsIcon className="sidebar-icon" />
              </Link>
            </li>
<li>
              <Link to="/add-task" onClick={onClose} title="Add Task">
                <AddTaskIcon className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link
                to="/archived-tasks"
                onClick={onClose}
                title="Archived Tasks"
              >
                <ArchiveIcon className="sidebar-icon" />
              </Link>
            </li>
          </>
        )}
        {/* يظهر رابط قسم إدارة الأقسام فقط إذا كان المستخدم سوبر أدمن */}
        {isSuperAdmin && (
          <>
            <li>
              <Link to="/Email-Form" onClick={onClose} title="Email Form">
                <EmailFormIcon className="sidebar-icon" />
              </Link>
            </li>
                      

            <li>
              <Link
                to="/BulkUser-Upload"
                onClick={onClose}
                title="BulkUserUpload"
              >
                <BulkUserUpload className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link to="/user-progress" onClick={onClose} title="User Progress">
                <ProgressIcon className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link
                to="/department-management"
                onClick={onClose}
                title="Department Management"
              >
                <DepartmentIcon className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link
                to="/Site-Management"
                onClick={onClose}
                title="SiteManagement"
              >
                <SiteIcon className="sidebar-icon" />
              </Link>
            </li>
            <li>
              <Link to="/logs" onClick={onClose} title="Logs">
                <LogsIcon className="sidebar-icon" />
              </Link>
            </li>
          </>
        )}
        <li>
          <button onClick={() => setShowPasswordModal(true)} className="sidebar-button" title="Change Password">
            <img src={changePasswordIcon} alt="Change Password" className="sidebar-icon" />
          </button>
        </li>
      </ul>
    </div>
    {showPasswordModal && (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>Change Password</h3>
          <input
            type="password"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button onClick={handleChangePassword}>Change Password</button>
          <button onClick={closeModal}>Cancel</button>
        </div>
      </div>
    )}
    </>
  );
} 

export default Sidebar;

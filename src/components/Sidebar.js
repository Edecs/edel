import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReactComponent as HomeIcon } from "../photos/icons8-home.svg";
import { ReactComponent as CoursesIcon } from "../photos/add.svg";
import { ReactComponent as ProgressIcon } from "../photos/address-book.svg";
import { ReactComponent as AdminIcon } from "../photos/user-add-outlined.svg";
import { ReactComponent as AddTaskIcon } from "../photos/add task.svg";
import { ReactComponent as ArchiveIcon } from "../photos/archive-down-svgrepo-com.svg";
import { ReactComponent as DepartmentIcon } from "../photos/open-data-square.svg"; // تأكد من وجود أيقونة للقسم
import { ReactComponent as EmailFormIcon } from "../photos/email-essential-letter-svgrepo-com.svg"; // تأكد من وجود أيقونة للقسم
import { ReactComponent as BulkUserUpload } from "../photos/upload-svgrepo-com.svg"; // تأكد من وجود أيقونة للقسم

import "./Sidebar.css";

function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebarElement = document.querySelector(".sidebar");
      if (sidebarElement && !sidebarElement.contains(event.target)) {
        if (onClose) onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <ul>
        <li>
          <Link to="/welcome" onClick={onClose} title="Home">
            <HomeIcon className="sidebar-icon" />
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
              <Link to="/user-progress" onClick={onClose} title="User Progress">
                <ProgressIcon className="sidebar-icon" />
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
              <Link
                to="/department-management"
                onClick={onClose}
                title="Department Management"
              >
                <DepartmentIcon className="sidebar-icon" />
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}

export default Sidebar;

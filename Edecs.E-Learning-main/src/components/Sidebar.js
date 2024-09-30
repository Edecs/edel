import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReactComponent as HomeIcon } from "../photos/icons8-home.svg";
import { ReactComponent as CoursesIcon } from "../photos/add.svg";
import { ReactComponent as ProgressIcon } from "../photos/address-book.svg";
import { ReactComponent as AdminIcon } from "../photos/user-add-outlined.svg";
import { ReactComponent as LogoutIcon } from "../photos/logout-24-svgrepo-com.svg";
import { ReactComponent as AddTaskIcon } from "../photos/add-task-list-svgrepo-com (1).svg";
import { ReactComponent as ArchiveIcon } from "../photos/archive-down-svgrepo-com.svg"; // تأكد من إضافة أيقونة مناسبة للأرشيف
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
              <Link to="/archived-tasks" onClick={onClose} title="Archived Tasks">
                <ArchiveIcon className="sidebar-icon" />
              </Link>
            </li>
          </>
        )}
      </ul>
      <div className="logout-button" onClick={handleLogout} title="Logout">
        <LogoutIcon className="sidebar-icon" />
      </div>
    </div>
  );
}

export default Sidebar;

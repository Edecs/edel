import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ReactComponent as Logo } from "../photos/edecs logo white.svg";
import { ReactComponent as HomeIcon } from "../photos/home-svgrepo-com.svg";
import { ReactComponent as NotificationsIcon } from "../photos/notifications-svgrepo-com (1).svg";
import { ReactComponent as LogoutIcon } from "../photos/logout-2-svgrepo-com.svg";
import { ReactComponent as DotsIcon } from "../photos/dots-icon.svg"; // تأكد من اسم الملف ومكانه
import NotificationPopup from "./NotificationPopup";
import { useAuth } from "../context/AuthContext";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./Navbar.css"; // تأكد من استيراد ملف CSS
import changePasswordIcon from "../photos/change-password-icon.svg";




const Navbar = ({ onSidebarToggle }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCountSender, setUnreadCountSender] = useState(0);
  const [unreadCountReceiver, setUnreadCountReceiver] = useState(0);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(null);

  // Change password modal state (copied from Sidebar)
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

  // Dummy handler for password change (replace with real logic if needed)
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    // Add real password change logic here
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    alert("Password changed (dummy handler)");
  };

  const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
      const auth = getAuth();
      onAuthStateChanged(auth, (user) => {
        if (user) {
          resolve(user);
        } else {
          reject(new Error("User is not authenticated."));
        }
      });
    });
  };

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const email = user.email;
          setUserEmail(email);

          const notificationsRef = ref(db, "notifications");
          const notificationsSnapshot = await get(notificationsRef);
          if (notificationsSnapshot.exists()) {
            const notificationsData = notificationsSnapshot.val();

            const unreadSentNotifications = Object.values(
              notificationsData
            ).filter(
              (notification) =>
                !notification.isRead &&
                notification.createdBy === email &&
                notification.message.includes("created")
            );

            const unreadReceivedNotifications = Object.values(
              notificationsData
            ).filter(
              (notification) =>
                !notification.isRead &&
                notification.assignedEmail === email &&
                notification.message.includes("assigned")
            );

            setUnreadCountSender(unreadSentNotifications.length);
            setUnreadCountReceiver(unreadReceivedNotifications.length);
          }
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchUnreadCounts();
  }, [showNotifications, userEmail]);

  const handleNotificationClick = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleClosePopup = () => {
    setShowNotifications(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const totalUnreadCount = unreadCountSender + unreadCountReceiver;

  return (
    <nav className="navbar">
      <button className="menu-btn" onClick={onSidebarToggle}>
        <DotsIcon className="navbar-icon custom-icon" />
      </button>

      <Logo className="navbar-logo" />
      <div className="navbar-buttons">
        <Link to="/welcome" className="navbar-link">
          <HomeIcon className="navbar-icon" />
        </Link>
        <button
          onClick={handleNotificationClick}
          className="notification-button"
        >
          <NotificationsIcon className="navbar-icon" />
          {totalUnreadCount > 0 && (
            <span className="notification-count">{totalUnreadCount}</span>
          )}
        </button>
        <button
          className="change-password-navbar-btn"
          title="Change Password"
          onClick={() => setShowPasswordModal(true)}
        >
          <img
            src={changePasswordIcon}
            alt="Change Password"
            className="navbar-icon"
            style={{ filter: "invert(1)" }}
          />
        </button>
        <button onClick={handleLogout} className="logout-button">
          <LogoutIcon className="navbar-icon" />
        </button>
        {showNotifications && <NotificationPopup onClose={handleClosePopup} />}
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
    </nav>
  );
};

export default Navbar;

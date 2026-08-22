import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ReactComponent as Logo } from "../photos/edecs logo white.svg";
import { ReactComponent as HomeIcon } from "../photos/home-svgrepo-com.svg";
import { ReactComponent as NotificationsIcon } from "../photos/notifications-svgrepo-com (1).svg";
import { ReactComponent as LogoutIcon } from "../photos/logout-2-svgrepo-com.svg";
import { ReactComponent as DotsIcon } from "../photos/dots-icon.svg"; // تأكد من اسم الملف ومكانه
import NotificationPopup from "./NotificationPopup";
import LanguageToggle from "./LanguageToggle";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getAuth, onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { fetchInboxNotifications } from "../utils/inbox";
import { isNotificationUnread } from "../utils/notificationVisibility";
import "./Navbar.css"; // تأكد من استيراد ملف CSS
import changePasswordIcon from "../photos/change-password-icon.svg";




const Navbar = ({ onSidebarToggle }) => {
  const { t } = useLanguage();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCountSender, setUnreadCountSender] = useState(0);
  const [unreadCountReceiver, setUnreadCountReceiver] = useState(0);
  const { logout, isAdmin, isSuperAdmin, currentUserDepartment } = useAuth();
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

  const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
      const auth = getAuth();
      onAuthStateChanged(auth, (user) => {
        if (user) {
          resolve(user);
        } else {
          reject(new Error(t("common.userNotAuthenticated")));
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

          const visible = await fetchInboxNotifications(email, {
            department: currentUserDepartment,
            isAdmin,
            isSuperAdmin,
          });

          const unreadSentNotifications = visible.filter(
            (notification) =>
              isNotificationUnread(notification, email) &&
              notification.createdBy === email &&
              String(notification.message || "").includes("created")
          );

          const unreadReceivedNotifications = visible.filter(
            (notification) =>
              isNotificationUnread(notification, email) &&
              (notification.assignedEmail === email ||
                Boolean(notification.broadcastDepartment)) &&
              (String(notification.message || "").includes("assigned") ||
                Boolean(notification.broadcastDepartment))
          );

          setUnreadCountSender(unreadSentNotifications.length);
          setUnreadCountReceiver(unreadReceivedNotifications.length);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchUnreadCounts();
  }, [
    showNotifications,
    userEmail,
    isAdmin,
    isSuperAdmin,
    currentUserDepartment,
    t,
  ]);

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
          title={t("nav.changePassword")}
          onClick={() => setShowPasswordModal(true)}
        >
          <img
            src={changePasswordIcon}
            alt={t("nav.changePassword")}
            className="navbar-icon"
            style={{ filter: "invert(1)" }}
          />
        </button>
        <LanguageToggle />
        <button onClick={handleLogout} className="logout-button">
          <LogoutIcon className="navbar-icon" />
        </button>
        {showNotifications && <NotificationPopup onClose={handleClosePopup} />}
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
    </nav>
  );
};

export default Navbar;

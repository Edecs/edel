import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  fetchInboxNotifications,
  markNotificationRead,
} from "../utils/inbox";
import { isNotificationUnread } from "../utils/notificationVisibility";
import "./NotificationPopup.css";

const NotificationPopup = ({ onClose }) => {
  const { t } = useLanguage();
  const { isAdmin, isSuperAdmin, currentUserDepartment } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) throw new Error(t("common.userNotAuthenticated"));

        const list = await fetchInboxNotifications(user.email, {
          department: currentUserDepartment,
          isAdmin,
          isSuperAdmin,
        });

        setNotifications(
          list.map((notification) => ({
            ...notification,
            isRead: !isNotificationUnread(notification, user.email),
          }))
        );
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [t, isAdmin, isSuperAdmin, currentUserDepartment]);

  const markAsRead = async (notification) => {
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error(t("common.userNotAuthenticated"));
      await markNotificationRead(user.email, notification);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const getCurrentUser = () =>
    new Promise((resolve, reject) => {
      const auth = getAuth();
      onAuthStateChanged(auth, (user) => {
        user
          ? resolve(user)
          : reject(new Error(t("common.userNotAuthenticated")));
      });
    });

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="notification-popup" ref={popupRef}>
      <button onClick={onClose} className="close-button">
        {t("common.close")}
      </button>
      {loading ? (
        <p>{t("notifications.loading")}</p>
      ) : error ? (
        <p>{t("common.error", { error })}</p>
      ) : notifications.length > 0 ? (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${
                notification.isRead ? "read" : "unread"
              }`}
              onClick={() => navigate("/welcome")}
            >
              {notification.fileUrl && (
                <a
                  href={notification.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={notification.fileUrl}
                    alt={t("notifications.fileAlt")}
                  />
                </a>
              )}
              <p>{notification.message}</p>
              <p>
                {t("notifications.date", {
                  date: new Date(notification.createdAt).toLocaleString(),
                })}
              </p>
              {!notification.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification);
                  }}
                  className="mark-as-read-button"
                >
                  {t("notifications.markAsRead")}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>{t("notifications.empty")}</p>
      )}
    </div>
  );
};

export default NotificationPopup;

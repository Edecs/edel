import React, { useState, useEffect, useRef } from "react";
import { ref, get, update } from "firebase/database";
import { db } from "../firebase"; // تأكد من المسار الصحيح لملف firebase.js
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./NotificationPopup.css"; // تأكد من وجود هذا الملف إذا كنت تستخدمه

const NotificationPopup = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const popupRef = useRef(null); // مرجع لعنصر نافذة الإشعارات

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error("User is not authenticated.");
        }

        const email = user.email;

        // Fetch all notifications
        const notificationsRef = ref(db, `notifications`);
        const notificationsSnapshot = await get(notificationsRef);
        if (notificationsSnapshot.exists()) {
          const notificationsData = notificationsSnapshot.val();

          // Filter notifications based on assignedEmail or createdBy
          const filteredNotifications = Object.keys(notificationsData)
            .map((key) => ({ id: key, ...notificationsData[key] }))
            .filter((notification) => {
              // Show notification if the user is assigned to the task (assignedEmail)
              // or if the user created the task (createdBy)
              return (
                (notification.assignedEmail === email &&
                  notification.message.includes("assigned")) ||
                (notification.createdBy === email &&
                  notification.message.includes("created"))
              );
            });

          setNotifications(filteredNotifications);
        } else {
          console.log("No notifications found.");
          setNotifications([]);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("User is not authenticated.");
      }

      const notificationRef = ref(db, `notifications/${id}`);

      await update(notificationRef, { isRead: true });
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
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

  // دالة للتعامل مع النقرات خارج نافذة الإشعارات
  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      onClose(); // أغلق نافذة الإشعارات
    }
  };

  useEffect(() => {
    // إضافة مستمع للنقرات
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // تنظيف المستمع عند فك التركيب
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="notification-popup" ref={popupRef}>
      <button onClick={onClose} className="close-button">
        X
      </button>
      {loading ? (
        <p>Loading notifications...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : notifications.length > 0 ? (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${
                notification.isRead ? "read" : "unread"
              }`}
            >
              {notification.fileUrl && (
                <a
                  href={notification.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={notification.fileUrl} alt="Notification File" />
                </a>
              )}
              <p>{notification.message}</p>
              <p>Date: {new Date(notification.createdAt).toLocaleString()}</p>
              {!notification.isRead && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="mark-as-read-button"
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No notifications</p>
      )}
    </div>
  );
};

export default NotificationPopup;

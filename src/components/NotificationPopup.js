import React, { useState, useEffect, useRef } from "react";
import { ref, get, update } from "firebase/database";
import { useNavigate } from "react-router-dom"; // استيراد التوجيه
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./NotificationPopup.css";

const NotificationPopup = ({ onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const navigate = useNavigate(); // تعريف التوجيه

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) throw new Error("User is not authenticated.");

        const email = user.email;
        const notificationsRef = ref(db, `notifications`);

        const notificationsSnapshot = await get(notificationsRef);
        if (notificationsSnapshot.exists()) {
          const notificationsData = notificationsSnapshot.val();
          const filteredNotifications = Object.keys(notificationsData)
            .map((key) => ({ id: key, ...notificationsData[key] }))
            .filter((notification) => {
              // فحص الـ assignedEmail أو createdBy مع البريد الإلكتروني الحالي
              return (
                notification.assignedEmail === email ||
                notification.createdBy === email
              );
            });

          setNotifications(filteredNotifications);
        } else {
          setNotifications([]); // إذا لم توجد إشعارات
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
      if (!user) throw new Error("User is not authenticated.");
      const notificationRef = ref(db, `notifications/${id}`);
      await update(notificationRef, { isRead: true });
      // تحديث الإشعارات في الواجهة دون التسبب في اختفاء الإشعارات
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true } // فقط تغيير حالة "isRead"
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
        user ? resolve(user) : reject(new Error("User is not authenticated."));
      });
    });
  };

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    navigate("/welcome"); // التوجيه لصفحة الهوم
  };

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
              onClick={() => handleNotificationClick(notification)} // إضافة حدث النقر
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
                  onClick={(e) => {
                    e.stopPropagation(); // منع التوجيه عند الضغط على زر "Mark as Read"
                    markAsRead(notification.id);
                  }}
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

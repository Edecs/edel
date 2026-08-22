import React, { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import { useLanguage } from "../context/LanguageContext";
import { writeTask, writeUserNotification } from "../utils/inbox";
import "./AddTaskPage.css";

const AddTaskPage = () => {
  const { t } = useLanguage();
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [assignedEmails, setAssignedEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");
  
  const [user, setUser] = useState(null); // إضافة هذا السطر

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        setAllUsers(Object.values(usersData));
      }
    };

    // استرجاع المستخدم الحالي عند تحميل المكون
    const auth = getAuth();
    const currentUser = auth.currentUser;
    setUser(currentUser);

    fetchUsers();
  }, []);
  
  const handleUserSelect = (email) => {
    setAssignedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!user) {
      setError(t("common.userNotAuthenticated"));
      setLoading(false);
      return;
    }

    if (assignedEmails.length === 0) {
      setError(t("tasks.assignAtLeastOne"));
      setLoading(false);
      return;
    }

    try {
      const fullMessage = link
        ? t("tasks.messageWithLink", { message, link })
        : message;

      await writeTask({
        message: fullMessage,
        assignedEmails,
        createdBy: user.email,
      });

      await Promise.all(
        assignedEmails.map((email) =>
          writeUserNotification(email, {
            message: t("tasks.notificationAssigned", { fullMessage }),
            createdBy: user.email,
            createdAt: new Date().toISOString(),
            isRead: false,
          })
        )
      );

      await writeUserNotification(user.email, {
        message: t("tasks.notificationCreated", { fullMessage }),
        assignedEmails: assignedEmails.join(", "),
        createdBy: user.email,
        createdAt: new Date().toISOString(),
        isRead: false,
      });

      setSuccess(t("tasks.taskAddedSuccess"));
      setLink("");
      setMessage("");
      setAssignedEmails([]);
    } catch (error) {
      setError(t("tasks.errorAddingTask", { error: error.message }));
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter((user) => {
    const email = user.email?.toLowerCase() || "";
    const department = user.department?.toLowerCase() || "";
    const name = user.name?.toLowerCase() || "";

    return (
      (email.includes(searchTerm.toLowerCase()) ||
        name.includes(searchTerm.toLowerCase())) &&
      department.includes(searchDepartment.toLowerCase()) &&
      !assignedEmails.includes(user.email)
    );
  });

  return (
    <div className="add-task">
      <header>
        <h1 className="header-h1">{t("tasks.addNewTaskTitle")}</h1>
      </header>
      <div className="add-task-page">
        <div className="add-task-container">
          <form onSubmit={handleSubmit}>
            <div className="dd">
              <label htmlFor="link">{t("tasks.taskLinkOptional")}</label>
              <input
                type="text"
                id="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={t("tasks.pasteLinkOptional")}
              />
            </div>
            <div>
              <label htmlFor="message">{t("tasks.messageLabel")}</label>
              <input
                type="text"
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div className="search-container">
              <div className="search-field">
                <label htmlFor="search">{t("tasks.searchByEmailOrName")}</label>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("tasks.searchByEmailOrNamePlaceholder")}
                />
              </div>
              <div className="search-field">
                <label htmlFor="searchDepartment">
                  {t("tasks.searchByDepartment")}
                </label>
                <input
                  type="text"
                  id="searchDepartment"
                  value={searchDepartment}
                  onChange={(e) => setSearchDepartment(e.target.value)}
                  placeholder={t("tasks.searchByDepartmentPlaceholder")}
                />
              </div>
            </div>

            <div>
              {searchTerm || searchDepartment ? (
                filteredUsers.length > 0 ? (
                  <div className="user-selection">
                    <label>{t("tasks.selectUsersToAssign")}</label>
                    <ul>
                      {filteredUsers.map((user) => (
                        <li key={user.email}>
                          <input
                            type="checkbox"
                            id={user.email}
                            checked={assignedEmails.includes(user.email)}
                            onChange={() => handleUserSelect(user.email)}
                          />
                          <label htmlFor={user.email}>{user.name}</label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>{t("tasks.noUsersFound")}</p>
                )
              ) : null}
              {assignedEmails.length > 0 && (
                <div className="assigned-users">
                  <h3>{t("tasks.assignedUsers")}</h3>
                  <ul>
                    {assignedEmails.map((email) => {
                      const user = allUsers.find((u) => u.email === email);
                      return (
                        <li key={email}>
                          {user?.name || email}
                          <button
                            className="remove-button"
                            onClick={() => handleUserSelect(email)}
                            type="button"
                          >
                            x
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            <button type="submit" disabled={loading}>
              {loading ? t("tasks.adding") : t("tasks.addTask")}
            </button>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTaskPage;

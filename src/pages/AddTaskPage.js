import React, { useState, useEffect } from "react";
import { ref, set, push, get } from "firebase/database";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import emailjs from "emailjs-com";
import "./AddTaskPage.css";

const AddTaskPage = () => {
  const [link, setLink] = useState(""); // حقل عام للروابط
  const [message, setMessage] = useState("");
  const [assignedEmails, setAssignedEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDepartment, setSearchDepartment] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = ref(db, "users");
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        setAllUsers(Object.values(usersData));
      }
    };
    fetchUsers();
  }, []);

  const handleUserSelect = (email) => {
    setAssignedEmails((prev) => {
      if (prev.includes(email)) {
        return prev.filter((e) => e !== email);
      }
      return [...prev, email];
    });
  };

  const sendEmailNotifications = () => {
    assignedEmails.forEach((email) => {
      const templateParams = {
        to_email: email,
        message: link
          ? `${message}\n\nLink: ${link}` // دمج الرابط مع الرسالة
          : message,
        subject: "You have a new task from E-learning EDECS",
      };

      emailjs
        .send(
          "service_b0yzx2o",
          "template_zz1ruij",
          templateParams,
          "PXS_cTqdGTjx-W0yE"
        )
        .then((response) => {
          console.log(
            "Email sent successfully to",
            email,
            response.status,
            response.text
          );
        })
        .catch((error) => {
          console.error("Error sending email to", email, error);
        });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      setError("User is not authenticated.");
      setLoading(false);
      return;
    }

    if (assignedEmails.length === 0) {
      setError("Please assign the task to at least one user.");
      setLoading(false);
      return;
    }

    try {
      const taskRef = ref(db, "tasks");
      const newTaskRef = push(taskRef);

      const fullMessage = link
        ? `${message}\n\nLink: ${link}` // دمج الرابط مع الرسالة
        : message;

      await set(newTaskRef, {
        message: fullMessage,
        assignedEmails,
        createdBy: user.email,
        createdAt: new Date().toISOString(),
      });

      sendEmailNotifications();

      const notificationsRef = ref(db, "notifications");

      assignedEmails.forEach((email) => {
        const newNotificationRef = push(notificationsRef);
        set(newNotificationRef, {
          message: `New task assigned to you: ${fullMessage}`,
          assignedEmail: email,
          createdBy: user.email,
          createdAt: new Date().toISOString(),
          isRead: false,
        });
      });

      const newCreatorNotificationRef = push(notificationsRef);
      set(newCreatorNotificationRef, {
        message: `You created a new task: ${fullMessage}`,
        assignedEmails: assignedEmails.join(", "),
        createdBy: user.email,
        createdAt: new Date().toISOString(),
        isRead: false,
      });

      setSuccess("Task added successfully!");
      setLink("");
      setMessage("");
      setAssignedEmails([]);
    } catch (error) {
      setError("Error adding task: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter((user) => {
    const email = user.email ? user.email.toLowerCase() : "";
    const department = user.department ? user.department.toLowerCase() : "";
    const name = user.name ? user.name.toLowerCase() : "";

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
        <h1 className="header-h1">Add New Task</h1>
      </header>
      <div className="add-task-page">
        <div className="add-task-container">
          <form onSubmit={handleSubmit}>
            <div className="dd">
              <label htmlFor="link">Task Link (Optional)</label>
              <input
                type="text"
                id="link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Paste any link (Optional)"
              />
            </div>
            <div>
              <label htmlFor="message">Message</label>
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
                <label htmlFor="search">Search by Email or Name</label>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by email or name"
                />
              </div>
              <div className="search-field">
                <label htmlFor="searchDepartment">Search by Department</label>
                <input
                  type="text"
                  id="searchDepartment"
                  value={searchDepartment}
                  onChange={(e) => setSearchDepartment(e.target.value)}
                  placeholder="Search by department"
                />
              </div>
            </div>

            <div>
              {searchTerm || searchDepartment ? (
                filteredUsers.length > 0 ? (
                  <div className="user-selection">
                    <label>Select Users to Assign:</label>
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
                  <p>No users found.</p>
                )
              ) : null}
              {assignedEmails.length > 0 && (
                <div className="assigned-users">
                  <h3>Assigned Users:</h3>
                  <ul>
                    {assignedEmails.map((email) => {
                      const user = allUsers.find((u) => u.email === email);
                      return (
                        <li key={email}>
                          {user.name}
                          <button
                            className="remove-button"
                            onClick={() => handleUserSelect(email)}
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
              {loading ? "Adding..." : "Add Task"}
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

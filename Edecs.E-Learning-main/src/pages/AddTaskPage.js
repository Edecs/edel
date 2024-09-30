import React, { useState, useEffect } from "react";
import { ref, set, push, get } from "firebase/database";
import { db } from "../firebase"; // No need for Firebase Storage now
import { getAuth } from "firebase/auth";
import "./AddTaskPage.css";

const AddTaskPage = () => {
  const [dropboxLink, setDropboxLink] = useState(""); // Dropbox link instead of file
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

    if (!dropboxLink) {
      setError("Please provide a valid Dropbox link.");
      setLoading(false);
      return;
    }

    try {
      const taskRef = ref(db, "tasks");
      const newTaskRef = push(taskRef);

      await set(newTaskRef, {
        message,
        dropboxLink, // Storing the Dropbox link
        assignedEmails,
        createdBy: user.email,
        createdAt: new Date().toISOString(),
      });

      const notificationsRef = ref(db, "notifications");

      assignedEmails.forEach(async (email) => {
        const newNotificationRef = push(notificationsRef);
        await set(newNotificationRef, {
          message: `New task assigned to you: ${message}`,
          dropboxLink,
          assignedEmail: email,
          createdBy: user.email,
          createdAt: new Date().toISOString(),
          isRead: false,
        });
      });

      const newCreatorNotificationRef = push(notificationsRef);
      await set(newCreatorNotificationRef, {
        message: `You have created a new task: ${message}`,
        dropboxLink,
        assignedEmails: assignedEmails.join(", "),
        createdBy: user.email,
        createdAt: new Date().toISOString(),
        isRead: false,
      });

      setSuccess("Task added successfully!");
      setDropboxLink("");
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

    return (
      email.includes(searchTerm.toLowerCase()) &&
      department.includes(searchDepartment.toLowerCase())
    );
  });

  return (
    <div className="add-task-container">
      <h1>Add New Task</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="dropboxLink">Dropbox File Link:</label>
          <input
            type="text"
            id="dropboxLink"
            value={dropboxLink}
            onChange={(e) => setDropboxLink(e.target.value)}
            placeholder="Paste Dropbox file link"
            required
          />
        </div>
        <div>
          <label htmlFor="message">Message:</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          ></textarea>
        </div>
        <div>
          <label htmlFor="search">Search by Email:</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by email"
          />
        </div>
        <div>
          <label htmlFor="searchDepartment">Search by Department:</label>
          <input
            type="text"
            id="searchDepartment"
            value={searchDepartment}
            onChange={(e) => setSearchDepartment(e.target.value)}
            placeholder="Search by department"
          />
        </div>
        <div>
          <label>Select Users to Assign:</label>
          <ul>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <li key={user.email}>
                  <input
                    type="checkbox"
                    id={user.email}
                    checked={assignedEmails.includes(user.email)}
                    onChange={() => handleUserSelect(user.email)}
                  />
                  <label htmlFor={user.email}>
                    {user.email} - {user.department}
                  </label>
                </li>
              ))
            ) : (
              <li>No users found.</li>
            )}
          </ul>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Task"}
        </button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
    </div>
  );
};

export default AddTaskPage;

import React, { useEffect, useState, useCallback } from "react";
import { getDatabase, ref, get } from "firebase/database";
import * as XLSX from "xlsx";
import "./UserProgressPage.scss"; // استيراد ملف الـCSS المخصص لهذه الصفحة

function UserProgressPage() {
  const [users, setUsers] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const database = getDatabase();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    const formattedDate = date.toLocaleDateString(undefined, options);
    const formattedHours = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${formattedDate} - ${formattedHours}`;
  };

  const fetchArchivedTasks = useCallback(async () => {
    try {
      const archivedTasksRef = ref(database, "archivedTasks");
      const snapshot = await get(archivedTasksRef);
      if (snapshot.exists()) {
        const archivedTasksData = snapshot.val();
        const archivedTasksList = Object.entries(archivedTasksData).map(
          ([id, data]) => ({
            id,
            message: data.message || "No message",
            createdAt: formatDate(data.createdAt) || "Not available",
            createdBy: data.createdBy || "Not available",
            dropboxLink: data.dropboxLink || "Not available",
            assignedEmails: Array.isArray(data.assignedEmails)
              ? data.assignedEmails
              : typeof data.assignedEmails === "string"
              ? [data.assignedEmails]
              : [],
          })
        );
        setArchivedTasks(archivedTasksList);
      }
    } catch (error) {
      setError(`Failed to fetch archived tasks. Error: ${error.message}`);
    }
  }, [database]);

  const fetchUsers = useCallback(async () => {
    try {
      const usersRef = ref(database, "users");
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersList = Object.entries(usersData).map(([id, data]) => ({
          id,
          email: data.email || "Unknown",
          role: data.role || "Not available",
        }));
        setUsers(usersList);
      }
    } catch (error) {
      setError(`Failed to fetch users. Error: ${error.message}`);
    }
  }, [database]);

  const fetchNotifications = useCallback(async () => {
    try {
      const notificationsRef = ref(database, "notifications");
      const snapshot = await get(notificationsRef);
      if (snapshot.exists()) {
        const notificationsData = snapshot.val();
        const notificationsList = Object.entries(notificationsData).map(
          ([id, data]) => ({
            id,
            message: data.message || "No message",
            createdAt: formatDate(data.createdAt) || "Not available",
            createdBy: data.createdBy || "Not available",
            dropboxLink: data.dropboxLink || "Not available",
            assignedEmails: Array.isArray(data.assignedEmails)
              ? data.assignedEmails
              : typeof data.assignedEmails === "string"
              ? [data.assignedEmails]
              : [],
            isRead: data.isRead || false,
          })
        );
        setNotifications(notificationsList);
      }
    } catch (error) {
      setError(`Failed to fetch notifications. Error: ${error.message}`);
    }
  }, [database]);

  const fetchCourses = useCallback(async () => {
    try {
      const coursesRef = ref(database, "courses/mainCourses");
      const snapshot = await get(coursesRef);
      if (snapshot.exists()) {
        const coursesData = snapshot.val();
        const mainCoursesList = Object.entries(coursesData).map(
          ([id, data]) => ({
            id,
            name: data.name || "Not available",
            thumbnail: data.thumbnail || "",
          })
        );
        setCourses(mainCoursesList);
      }
    } catch (error) {
      setError(`Failed to fetch courses. Error: ${error.message}`);
    }
  }, [database]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const submissionsRef = ref(database, "submissions");
      const snapshot = await get(submissionsRef);
      if (snapshot.exists()) {
        const submissionsData = snapshot.val();
        const submissionsList = Object.entries(submissionsData).flatMap(
          ([userId, courses]) =>
            Object.entries(courses).map(([courseId, submission]) => ({
              email: submission.email || "Unknown",
              courseId: courseId,
              startTime: formatDate(submission.startTime) || "Not available",
              endTime: formatDate(submission.endTime) || "Not completed",
              totalTime: submission.totalTime || "Not available",
              percentageSuccess:
                submission.percentageSuccess || "Not available",
              userAnswers: submission.userAnswers
                ? submission.userAnswers.join(", ")
                : "Not available",
              userId: userId,
            }))
        );
        setSubmissions(submissionsList);
      }
    } catch (error) {
      setError(`Failed to fetch submissions. Error: ${error.message}`);
    }
  }, [database]);

  useEffect(() => {
    if (!dataLoaded) {
      const fetchData = async () => {
        try {
          await Promise.all([
            fetchUsers(),
            fetchArchivedTasks(),
            fetchNotifications(),
            fetchCourses(),
            fetchSubmissions(),
          ]);
          setDataLoaded(true);
        } catch {
          setError("Failed to fetch data. Please try again later.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [
    fetchUsers,
    fetchArchivedTasks,
    fetchNotifications,
    fetchCourses,
    fetchSubmissions,
    dataLoaded,
  ]);

  const exportToExcel = () => {
    const usersSheet = XLSX.utils.json_to_sheet(users);
    const archivedTasksSheet = XLSX.utils.json_to_sheet(archivedTasks);
    const notificationsSheet = XLSX.utils.json_to_sheet(notifications);
    const coursesSheet = XLSX.utils.json_to_sheet(courses);
    const submissionsSheet = XLSX.utils.json_to_sheet(submissions);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, usersSheet, "Users");
    XLSX.utils.book_append_sheet(
      workbook,
      archivedTasksSheet,
      "Archived Tasks"
    );
    XLSX.utils.book_append_sheet(workbook, notificationsSheet, "Notifications");
    XLSX.utils.book_append_sheet(workbook, coursesSheet, "Courses");
    XLSX.utils.book_append_sheet(workbook, submissionsSheet, "Submissions");

    XLSX.writeFile(workbook, "User_Progress_Data.xlsx");
  };

  const formatTime = (totalTime) => {
    if (totalTime === "Not available") return totalTime;
    const totalSeconds = parseInt(totalTime);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours} hours، ${minutes} minutes، ${seconds} seconds`;
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredArchivedTasks = archivedTasks.filter(
    (task) =>
      task.assignedEmails
        .join(", ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      task.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNotifications = notifications.filter(
    (notification) =>
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCourses = courses.filter((course) =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubmissions = submissions.filter(
    (submission) =>
      submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.courseId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="user-progress-page">
      <div>
        <h1>User Progress Page</h1>
        <button onClick={exportToExcel}>Export to Excel</button>
      </div>
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="data-sections">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p>{error}</p>
        ) : (
          <>
            <details>
              <summary>Users</summary>
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <details>
              <summary>Archived Tasks</summary>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Message</th>
                    <th>Created At</th>
                    <th>Created By</th>
                    <th>Dropbox Link</th>
                    <th>Assigned Emails</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArchivedTasks.map((task) => (
                    <tr key={task.id}>
                      <td>{task.message}</td>
                      <td>{task.createdAt}</td>
                      <td>{task.createdBy}</td>
                      <td>{task.dropboxLink}</td>
                      <td>{task.assignedEmails.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            <details>
              <summary>Notifications</summary>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Message</th>
                    <th>Created At</th>
                    <th>Created By</th>
                    <th>Dropbox Link</th>
                    <th>Assigned Emails</th>
                    <th>Is Read</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotifications.map((notification) => (
                    <tr key={notification.id}>
                      <td>{notification.message}</td>
                      <td>{notification.createdAt}</td>
                      <td>{notification.createdBy}</td>
                      <td>{notification.dropboxLink}</td>
                      <td>{notification.assignedEmails.join(", ")}</td>
                      <td>{notification.isRead ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            <details>
              <summary>Courses</summary>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Thumbnail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id}>
                      <td>{course.name}</td>
                      <td>
                        <img
                          src={course.thumbnail}
                          alt={`${course.name} thumbnail`}
                          style={{ width: "50px" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            <details>
              <summary>Submissions</summary>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Course</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Total Time</th>
                    <th>Success Percentage</th>
                    <th>User Answers</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((submission) => (
                    <tr key={`${submission.email}-${submission.courseId}`}>
                      <td>{submission.email}</td>
                      <td>{submission.courseId}</td>
                      <td>{submission.startTime}</td>
                      <td>{submission.endTime}</td>
                      <td>{formatTime(submission.totalTime)}</td>
                      <td>{submission.percentageSuccess}%</td>
                      <td>{submission.userAnswers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

export default UserProgressPage;

import React, { useEffect, useState, useCallback } from "react";
import { getDatabase, ref, get } from "firebase/database";
import * as XLSX from "xlsx";
import "./UserProgressPage.css";

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

  const fetchUsers = useCallback(async () => {
    try {
      const usersRef = ref(database, "users");
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersList = Object.entries(usersData).map(([id, data]) => ({
          id,
          email: data.email,
          role: data.role,
        }));
        setUsers(usersList);
      } else {
        throw new Error("No data found at the path 'users'");
      }
    } catch (error) {
      setError(`Failed to fetch users. Error: ${error.message}`);
    }
  }, [database]);

  const fetchArchivedTasks = useCallback(async () => {
    try {
      const tasksRef = ref(database, "archivedTasks");
      const snapshot = await get(tasksRef);
      if (snapshot.exists()) {
        const tasksData = snapshot.val();
        const tasksList = Object.entries(tasksData).map(([id, data]) => ({
          assignedEmails: data.assignedEmails || [],
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          dropboxLink: data.dropboxLink,
          message: data.message,
        }));
        setArchivedTasks(tasksList);
      } else {
        throw new Error("No data found at the path 'archivedTasks'");
      }
    } catch (error) {
      setError(`Failed to fetch archived tasks. Error: ${error.message}`);
    }
  }, [database]);

  const fetchNotifications = useCallback(async () => {
    try {
      const notificationsRef = ref(database, "notifications");
      const snapshot = await get(notificationsRef);
      if (snapshot.exists()) {
        const notificationsData = snapshot.val();
        const notificationsList = Object.entries(notificationsData).map(([id, data]) => ({
          id,
          message: data.message || "No Message",
          createdAt: data.createdAt || "N/A",
          createdBy: data.createdBy || "N/A",
          dropboxLink: data.dropboxLink || "N/A",
          assignedEmails: Array.isArray(data.assignedEmails) ? data.assignedEmails : [],
          isRead: data.isRead || false
        }));
        setNotifications(notificationsList);
      } else {
        throw new Error("No data found at the path 'notifications'");
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
        const mainCoursesList = Object.entries(coursesData).map(([id, data]) => ({
          id,
          name: data.name,
          thumbnail: data.thumbnail,
          subCourses: data.subCourses || [],
          questions: data.questions || [],
          videos: data.videos || []
        }));
        console.log("Courses Data:", mainCoursesList);
        setCourses(mainCoursesList);
      } else {
        console.error("No data found at the path 'courses/mainCourses'");
        setError("No data found at the path 'courses/mainCourses'");
      }
    } catch (error) {
      console.error("Error fetching courses:", error.message);
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
              endTime: submission.endTime || "Not Completed",
              percentageSuccess: submission.percentageSuccess || "N/A",
              startTime: submission.startTime || "N/A",
              totalTime: submission.totalTime || "N/A",
              userAnswers: submission.userAnswers ? submission.userAnswers.join(", ") : "N/A",
              userId: userId,
            }))
        );
        setSubmissions(submissionsList);
      } else {
        throw new Error("No data found at the path 'submissions'");
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
    XLSX.utils.book_append_sheet(workbook, archivedTasksSheet, "Archived Tasks");
    XLSX.utils.book_append_sheet(workbook, notificationsSheet, "Notifications");
    XLSX.utils.book_append_sheet(workbook, coursesSheet, "Courses");
    XLSX.utils.book_append_sheet(workbook, submissionsSheet, "Submissions");

    XLSX.writeFile(workbook, "UserProgressData.xlsx");
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredArchivedTasks = archivedTasks.filter(task =>
    task.assignedEmails.join(", ").toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNotifications = notifications.filter(notification =>
    notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubmissions = submissions.filter(submission => 
    submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    submission.courseId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>User Progress Page</h1>
      <button onClick={exportToExcel}>Export to Excel</button>

      <div>
        <h2>Users</h2>
        <input
          type="text"
          placeholder="Search Users"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2>Archived Tasks</h2>
        <input
          type="text"
          placeholder="Search Archived Tasks"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <table>
          <thead>
            <tr>
              <th>Assigned Emails</th>
              <th>Created By</th>
              <th>Created At</th>
              <th>Dropbox Link</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {filteredArchivedTasks.map((task, index) => (
              <tr key={index}>
                <td>{task.assignedEmails.join(", ")}</td>
                <td>{task.createdBy}</td>
                <td>{task.createdAt}</td>
                <td>{task.dropboxLink}</td>
                <td>{task.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2>Notifications</h2>
        <input
          type="text"
          placeholder="Search Notifications"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <table>
          <thead>
            <tr>
              <th>ID</th>
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
                <td>{notification.id}</td>
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
      </div>

      <div>
        <h2>Courses</h2>
        <input
          type="text"
          placeholder="Search Courses"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Thumbnail</th>
              <th>Sub Courses</th>
              <th>Questions</th>
              <th>Videos</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map((course) => (
              <tr key={course.id}>
                <td>{course.id}</td>
                <td>{course.name}</td>
                <td>
                  <img src={course.thumbnail} alt={course.name} style={{ width: "50px" }} />
                </td>
                <td>{course.subCourses.length}</td>
                <td>{course.questions.length}</td>
                <td>{course.videos.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2>Submissions</h2>
        <input
          type="text"
          placeholder="Search Submissions"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Course ID</th>
              <th>End Time</th>
              <th>Percentage Success</th>
              <th>Start Time</th>
              <th>Total Time</th>
              <th>User Answers</th>
              <th>User ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.map((submission, index) => (
              <tr key={index}>
                <td>{submission.email}</td>
                <td>{submission.courseId}</td>
                <td>{submission.endTime}</td>
                <td>{submission.percentageSuccess}</td>
                <td>{submission.startTime}</td>
                <td>{submission.totalTime}</td>
                <td>{submission.userAnswers}</td>
                <td>{submission.userId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserProgressPage;

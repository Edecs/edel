import React, { useEffect, useState, useCallback } from "react";
import { getDatabase, ref, get } from "firebase/database";
import * as XLSX from "xlsx";
import "./UserProgressPage.scss"; // استيراد ملف الـCSS المخصص لهذه الصفحة
import { useLanguage } from "../context/LanguageContext";

function UserProgressPage() {
  const { t } = useLanguage();
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
            message: data.message || t("common.noMessage"),
            createdAt: formatDate(data.createdAt) || t("common.notAvailable"),
            createdBy: data.createdBy || t("common.notAvailable"),
            dropboxLink: data.dropboxLink || t("common.notAvailable"),
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
      setError(t("errors.failedFetchArchivedTasks", { error: error.message }));
    }
  }, [database, t]);

  const fetchUsers = useCallback(async () => {
    try {
      const usersRef = ref(database, "users");
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersList = Object.entries(usersData).map(([id, data]) => ({
          id,
          email: data.email || t("common.unknown"),
          role: data.role || t("common.notAvailable"),
          name: data.name || t("userProgress.nameNotAvailable"),
        }));
        setUsers(usersList);
      }
    } catch (error) {
      setError(t("errors.failedFetchUsers", { error: error.message }));
    }
  }, [database, t]);

  const fetchNotifications = useCallback(async () => {
    try {
      const notificationsRef = ref(database, "notifications");
      const snapshot = await get(notificationsRef);
      if (snapshot.exists()) {
        const notificationsData = snapshot.val();
        const notificationsList = Object.entries(notificationsData).map(
          ([id, data]) => ({
            id,
            message: data.message || t("common.noMessage"),
            createdAt: formatDate(data.createdAt) || t("common.notAvailable"),
            createdBy: data.createdBy || t("common.notAvailable"),
            dropboxLink: data.dropboxLink || t("common.notAvailable"),
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
      setError(t("errors.failedFetchNotifications", { error: error.message }));
    }
  }, [database, t]);

  const fetchCourses = useCallback(async () => {
    try {
      const coursesRef = ref(database, "courses/mainCourses");
      const snapshot = await get(coursesRef);
      if (snapshot.exists()) {
        const coursesData = snapshot.val();
        const mainCoursesList = Object.entries(coursesData).map(
          ([id, data]) => ({
            id,
            name: data.name || t("common.notAvailable"),
            thumbnail: data.thumbnail || "",
          })
        );
        setCourses(mainCoursesList);
      }
    } catch (error) {
      setError(t("errors.failedFetchCourses", { error: error.message }));
    }
  }, [database, t]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const submissionsRef = ref(database, "submissions");
      const snapshot = await get(submissionsRef);
      if (snapshot.exists()) {
        const submissionsData = snapshot.val();
        const submissionsList = Object.entries(submissionsData).flatMap(
          ([userId, courses]) =>
            Object.entries(courses).map(([courseId, submission]) => ({
              email: submission.email || t("common.unknown"),
              userName: submission.userName || t("common.unknown"),
              courseId: courseId,
              startTime: formatDate(submission.startTime) || t("common.notAvailable"),
              endTime: formatDate(submission.endTime) || t("common.notCompleted"),
              totalTime: submission.totalTime || t("common.notAvailable"),
              percentageSuccess:
                submission.percentageSuccess || t("common.notAvailable"),
              userAnswers: submission.userAnswers
                ? submission.userAnswers.join(", ")
                : t("common.notAvailable"),
              userId: userId,
            }))
        );
        setSubmissions(submissionsList);
      }
    } catch (error) {
      setError(t("errors.failedFetchSubmissions", { error: error.message }));
    }
  }, [database, t]);

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
          setError(t("errors.failedFetchDataRetry"));
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
    t,
  ]);

  const exportToExcel = () => {
    const usersSheet = XLSX.utils.json_to_sheet(users);
    const archivedTasksSheet = XLSX.utils.json_to_sheet(archivedTasks);
    const notificationsSheet = XLSX.utils.json_to_sheet(notifications);
    const coursesSheet = XLSX.utils.json_to_sheet(courses);
    const submissionsSheet = XLSX.utils.json_to_sheet(submissions);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, usersSheet, t("userProgress.users"));
    XLSX.utils.book_append_sheet(
      workbook,
      archivedTasksSheet,
      t("userProgress.archivedTasks")
    );
    XLSX.utils.book_append_sheet(workbook, notificationsSheet, t("userProgress.notifications"));
    XLSX.utils.book_append_sheet(workbook, coursesSheet, t("userProgress.courses"));
    XLSX.utils.book_append_sheet(workbook, submissionsSheet, t("userProgress.submissions"));

    XLSX.writeFile(workbook, "User_Progress_Data.xlsx");
  };

  const formatTime = (totalTime) => {
    if (totalTime === t("common.notAvailable")) return totalTime;
    const totalSeconds = parseInt(totalTime);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return t("common.durationHms", { hours, minutes, seconds });
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    <div className="user-progress">
      
      <header>
        <h1 className="header-h1">{t("userProgress.title")}</h1>
      </header>
      <div className="user-progress-page">

      <div>
        <button onClick={exportToExcel}>{t("userProgress.exportToExcel")}</button>
      </div>
      <input
        type="text"
        placeholder={t("userProgress.searchPlaceholder")}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="data-sections">
        {loading ? (
          <p>{t("userProgress.loading")}</p>
        ) : error ? (
          <p>{error}</p>
        ) : (
          <>
            <details>
              <summary>{t("userProgress.users")}</summary>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>{t("userProgress.colName")}</th>
                    <th>{t("userProgress.colEmail")}</th>
                    <th>{t("userProgress.colRole")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <details>
              <summary>{t("userProgress.archivedTasks")}</summary>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>{t("userProgress.colMessage")}</th>
                    <th>{t("userProgress.colCreatedAt")}</th>
                    <th>{t("userProgress.colCreatedBy")}</th>
                    <th>{t("userProgress.colDropboxLink")}</th>
                    <th>{t("userProgress.colAssignedEmails")}</th>
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
              <summary>{t("userProgress.notifications")}</summary>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>{t("userProgress.colMessage")}</th>
                    <th>{t("userProgress.colCreatedAt")}</th>
                    <th>{t("userProgress.colCreatedBy")}</th>
                    <th>{t("userProgress.colDropboxLink")}</th>
                    <th>{t("userProgress.colAssignedEmails")}</th>
                    <th>{t("userProgress.colIsRead")}</th>
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
              <summary>{t("userProgress.courses")}</summary>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>{t("userProgress.colName")}</th>
                    <th>{t("userProgress.colThumbnail")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id}>
                      <td>{course.name}</td>
                      <td>
                        <img
                          src={course.thumbnail}
                          alt={t("userProgress.thumbnailAlt", { name: course.name })}
                          style={{ width: "50px" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            <details>
              <summary>{t("userProgress.submissions")}</summary>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>{t("userProgress.colUserName")}</th>
                    <th>{t("userProgress.colCourse")}</th>
                    <th>{t("userProgress.colStartTime")}</th>
                    <th>{t("userProgress.colEndTime")}</th>
                    <th>{t("userProgress.colTotalTime")}</th>
                    <th>{t("userProgress.colSuccessPercentage")}</th>
                    <th>{t("userProgress.colUserAnswers")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((submission) => (
                    <tr key={`${submission.email}-${submission.courseId}`}>
                      <td>{submission.userName}</td>
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
    </div>

  );
}

export default UserProgressPage;

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useLanguage } from "../context/LanguageContext";
import { archiveTask } from "../utils/inbox";
import "./WelcomePage.css";

const WelcomePage = () => {
  const { t } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error(t("common.userNotAuthenticated"));
        }

        const email = user.email;
        setCurrentUserEmail(email); // تخزين البريد الإلكتروني الحالي
        const safeEmailPath = email.replace(/\./g, ",");

        // Fetch user roles
        const rolesRef = ref(db, `roles/${safeEmailPath}`);
        const rolesSnapshot = await get(rolesRef);
        if (!rolesSnapshot.exists()) {
          throw new Error(t("errors.noDataForRoles"));
        }

        const userRoles = rolesSnapshot.val().courses || {};
        const assignedIds = Object.keys(userRoles);

        const courseSnaps = await Promise.all(
          assignedIds.map((id) => get(ref(db, `courses/mainCourses/${id}`)))
        );
        const filteredCourses = courseSnaps
          .map((snap, i) =>
            snap.exists() ? { id: assignedIds[i], ...snap.val() } : null
          )
          .filter(Boolean);

        setCourses(filteredCourses);

        const tasksSnapshot = await get(ref(db, `userTasks/${safeEmailPath}`));
        const tasksData = tasksSnapshot.val() || {};
        const filteredTasks = Object.keys(tasksData).map((key) => ({
          id: key,
          ...tasksData[key],
        }));
        setTasks(filteredTasks);

        // Fetch user name
        const userRef = ref(db, `users/${safeEmailPath}`);
        const userSnapshot = await get(userRef);
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          setUserName(userData.name || t("common.user"));
        } else {
          setUserName(t("common.user"));
        }
      } catch (error) {
        console.error("Data entry error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [t]);

  // Get current user
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

  const endTask = async (taskId) => {
    try {
      const safeEmailPath = currentUserEmail.replace(/\./g, ",");
      const taskSnapshot = await get(
        ref(db, `userTasks/${safeEmailPath}/${taskId}`)
      );
      if (!taskSnapshot.exists()) {
        throw new Error(t("welcome.taskDoesNotExist"));
      }
      await archiveTask(taskId, taskSnapshot.val());
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Error ending task:", error);
      setError(error.message);
    }
  };

  // Open task modal
  const openTaskModal = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  // Close task modal
  const closeTaskModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  return (
    <div className="container-welcome">
      <header>
        <h1 className="header-h1">{t("welcome.title", { userName })}</h1>
      </header>
      <div className="container">
        <h2>{t("welcome.coursesHeading")}</h2>
        {loading ? (
          <p>{t("welcome.loadingCourses")}</p>
        ) : error ? (
          <p>{t("common.error", { error })}</p>
        ) : courses.length > 0 ? (
          <div className="course-container">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="course-card"
              >
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.name} />
                ) : (
                  <div
                    className="default-image"
                    style={{
                      backgroundColor: `hsl(${Math.random() * 360}, 70%, 80%)`,
                    }}
                  >
                    <p>{t("welcome.noAvailableCourses")}</p>
                  </div>
                )}
                <h3>{course.name}</h3>
              </Link>
            ))}
          </div>
        ) : (
          <p>{t("welcome.noAvailableCourses")}</p>
        )}

        <h2>{t("welcome.tasksHeading")}</h2>
        {loading ? (
          <p>{t("welcome.loadingTasks")}</p>
        ) : error ? (
          <p>{t("common.error", { error })}</p>
        ) : tasks.length > 0 ? (
          <div className="task-container">
            {tasks.map((task) => (
              <div key={task.id} className="task-card">
                <p>{task.message}</p>
                {/* عرض "Assigned to" فقط للشخص الذي أنشأ المهمة */}
                {task.createdBy === currentUserEmail && (
                  <p>
                    {t("welcome.assignedTo")}{" "}
                    {task.assignedEmails && task.assignedEmails.length > 0
                      ? task.assignedEmails.join(", ")
                      : t("welcome.noOneAssigned")}
                  </p>
                )}
                <p>{t("welcome.createdBy", { email: task.createdBy })}</p>
                <p>
                  {t("common.date")} {new Date(task.createdAt).toLocaleString()}
                </p>
                <button onClick={() => openTaskModal(task)}>
                  {t("welcome.viewTask")}
                </button>
                {task.createdBy === currentUserEmail && (
                  <button onClick={() => endTask(task.id)}>
                    {t("welcome.endTask")}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>{t("welcome.noTasksAvailable")}</p>
        )}

        {/* Modal Popup for Viewing Task */}
        {showModal && selectedTask && (
          <div className="modal">
            <div className="modal-content">
              <span className="close" onClick={closeTaskModal}>
                &times;
              </span>
              <h2>{t("welcome.taskDetails")}</h2>
              <p>{selectedTask.message}</p>
              {selectedTask.dropboxLink && (
                <div>
                  <p>{t("welcome.dropboxLink")}</p>
                  <a
                    href={selectedTask.dropboxLink.replace("dl=1", "dl=0")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("welcome.viewDropboxFile")}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomePage;

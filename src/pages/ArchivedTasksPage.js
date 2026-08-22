import React, { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase"; // Ensure to adjust the path according to your project
import { useLanguage } from "../context/LanguageContext";

import "./ArchivedTasksPage.css"; // Create a CSS file to enhance the page design

const ArchivedTasksPage = () => {
  const { t } = useLanguage();
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredTasks, setFilteredTasks] = useState([]);

  useEffect(() => {
    const fetchArchivedTasks = async () => {
      try {
        const archivedTasksRef = ref(db, "archivedTasks");
        const archivedSnapshot = await get(archivedTasksRef);

        if (archivedSnapshot.exists()) {
          const archivedData = archivedSnapshot.val();
          const archivedArray = Object.keys(archivedData).map((key) => ({
            id: key,
            ...archivedData[key],
          }));

          setArchivedTasks(archivedArray);
          setFilteredTasks(archivedArray); // Initialize filtered tasks
        } else {
          setArchivedTasks([]);
          setFilteredTasks([]);
        }
      } catch (error) {
        console.error("Error fetching archived tasks:", error);
        setError(t("tasks.failedLoadArchived"));
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedTasks();
  }, [t]);

  // Handle the search
  const handleSearch = () => {
    if (searchTerm.trim() === "") {
      setFilteredTasks(archivedTasks); // Reset to all tasks if search term is empty
    } else {
      const filtered = archivedTasks.filter(
        (task) =>
          task.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (task.assignedEmail &&
            task.assignedEmail
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (task.assignedEmails &&
            task.assignedEmails.some((email) =>
              email.toLowerCase().includes(searchTerm.toLowerCase())
            ))
      );
      setFilteredTasks(filtered);
    }
  };

  if (loading) {
    return <p>{t("tasks.loadingArchived")}</p>;
  }

  if (error) {
    return <p>{t("common.error", { error })}</p>;
  }

  return (
    <div className="archived-tasks">
      <header>
        <h1 className="header-h1">{t("tasks.archivedTasksTitle")}</h1>
      </header>
      <div className="archived-tasks-container">
        <div className="search-container">
          <input
            type="text"
            placeholder={t("tasks.searchTasksPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={handleSearch}>{t("common.search")}</button>
        </div>

        {filteredTasks.length > 0 ? (
          <div className="archived-tasks-list">
            {filteredTasks.map((task) => (
              <div key={task.id} className="archived-task-card">
                {task.fileUrl && (
                  <a
                    href={task.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img src={task.fileUrl} alt={t("tasks.taskFileAlt")} />
                  </a>
                )}
                <p>
                  <strong>{t("tasks.taskMessage")}</strong> {task.message}
                </p>
                {/* Check for assignedEmail or assignedEmails */}
                {task.assignedEmail && (
                  <p>
                    <strong>{t("tasks.assignedToStrong")}</strong>{" "}
                    {task.assignedEmail}
                  </p>
                )}
                {task.assignedEmails && (
                  <p>
                    <strong>{t("tasks.assignedToStrong")}</strong>{" "}
                    {task.assignedEmails.join(", ")}
                  </p>
                )}
                <p>
                  <strong>{t("tasks.createdByStrong")}</strong> {task.createdBy}
                </p>
                <p>
                  <strong>{t("tasks.dateStrong")}</strong>{" "}
                  {new Date(task.createdAt).toLocaleString()}
                </p>
                {task.dropboxLink && (
                  <p>
                    <strong>{t("tasks.dropboxLinkStrong")}</strong>{" "}
                    <a
                      href={task.dropboxLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {task.dropboxLink}
                    </a>
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>{t("tasks.noArchivedTasks")}</p>
        )}
      </div>
    </div>
  );
};

export default ArchivedTasksPage;

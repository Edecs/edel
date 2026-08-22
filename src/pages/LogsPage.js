import React, { useEffect, useState } from "react";
import { db, ref, get } from "../firebase";
import { useLanguage } from "../context/LanguageContext";
import "./LogsPage.css";

const LogsPage = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const logsRef = ref(db, "logs");
        const snapshot = await get(logsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const logsArray = Object.values(data).sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );
          setLogs(logsArray);
        } else {
          setLogs([]);
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="logs-page">
<header>
        <h1 className="header-h1">{t("logs.title")}</h1>
      </header>      {loading ? (
        <p>{t("logs.loading")}</p>
      ) : (
        <table className="logs-table">
          <thead>
            <tr>
              <th>{t("logs.actorName")}</th>
              <th>{t("logs.dateTime")}</th>
              <th>{t("logs.details")}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={idx}>
                <td>{log.userName}</td>
                <td>
                  {log.timestamp
                    ? new Date(log.timestamp).toLocaleString()
                    : "-"}
                </td>
                <td style={{direction: 'rtl', fontWeight: 'bold', color: '#1a237e'}}>
                  {log.detailMessage ? log.detailMessage : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LogsPage;

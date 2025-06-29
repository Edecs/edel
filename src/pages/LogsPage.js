import React, { useEffect, useState } from "react";
import { db, ref, get } from "../firebase";
import "./LogsPage.css";

const LogsPage = () => {
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
      <h1>Logs</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="logs-table">
          <thead>
            <tr>
              <th>Event Type</th>
              <th>User Name</th>
              <th>User Email</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={idx}>
                <td>{log.eventType}</td>
                <td>{log.userName}</td>
                <td>{log.userEmail}</td>
                <td>
                  {log.timestamp
                    ? new Date(log.timestamp).toLocaleString()
                    : "-"}
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

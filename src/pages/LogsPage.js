import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import "./LogsPage.css";

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const firestore = getFirestore();
        const logsRef = collection(firestore, "logs");
        const q = query(logsRef, orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        const logsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setLogs(logsData);
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
              <th>Site Name</th>
              <th>User Name</th>
              <th>User Email</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.eventType}</td>
                <td>{log.siteName || "-"}</td>
                <td>{log.userName}</td>
                <td>{log.userEmail}</td>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LogsPage;

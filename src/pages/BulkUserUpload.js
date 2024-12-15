import React, { useState } from "react";
import Papa from "papaparse";
import { db, ref, set } from "../firebase"; // تأكد من مسار ملف firebase.js
import "./BulkUserUpload.css";

function BulkUserUpload() {
  const [csvFile, setCsvFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileChange = (event) => {
    setCsvFile(event.target.files[0]);
  };

  const handleFileUpload = () => {
    if (!csvFile) {
      alert("Please select a CSV file.");
      return;
    }

    Papa.parse(csvFile, {
      header: true, // يقرأ الصف الأول كعناوين
      skipEmptyLines: true,
      complete: async (results) => {
        const users = results.data; // تحويل البيانات إلى كائنات
        try {
          for (let user of users) {
            const { Name, Email } = user; // تأكد أن العناوين في الشيت تتطابق مع هذه
            const sanitizedEmail = Email.replace(/\./g, ","); // معالجة النقطة لقاعدة البيانات

            // رفع البيانات إلى Firebase
            await set(ref(db, `users/${sanitizedEmail}`), {
              name: Name,
              email: Email,
            });
          }
          setUploadStatus("Users uploaded successfully!");
        } catch (error) {
          console.error("Error uploading users:", error);
          setUploadStatus("Failed to upload users.");
        }
      },
      error: (error) => {
        console.error("Error reading CSV file:", error);
        setUploadStatus("Error reading CSV file.");
      },
    });
  };

  return (
    <div>
      <h2>Upload Users in Bulk</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <button onClick={handleFileUpload}>Upload Users</button>
      {uploadStatus && <p>{uploadStatus}</p>}
    </div>
  );
}

export default BulkUserUpload;

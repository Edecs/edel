import React, { useState } from "react";
import Papa from "papaparse";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { db, ref, set } from "../firebase"; // تأكد من استيراد Firebase بشكل صحيح
import "./BulkUserUpload.css"; // اختياري: يمكنك تخصيص CSS إذا لزم الأمر

function BulkUserUpload() {
  const [csvFile, setCsvFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const auth = getAuth();

  const handleFileChange = (event) => {
    setCsvFile(event.target.files[0]);
  };

  const handleFileUpload = () => {
    if (!csvFile) {
      alert("Please select a CSV file.");
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const users = results.data; // بيانات المستخدمين من CSV
        try {
          const adminEmail = auth.currentUser.email;
          const adminPassword = prompt("Enter your admin password:");

          for (let user of users) {
            const { email, name, password, role, department } = user;

            // إنشاء مستخدم جديد
            const newUser = await createUserWithEmailAndPassword(
              auth,
              email,
              password
            );

            const sanitizedEmail = email.replace(/\./g, ",");

            // حفظ بيانات المستخدم في قاعدة البيانات
            await set(ref(db, `roles/${sanitizedEmail}`), {
              role: role || "user",
              department: department || "",
              courses: {},
            });

            await set(ref(db, `users/${sanitizedEmail}`), {
              email,
              name,
              role: role || "user",
              department: department || "",
            });
          }

          // إعادة تسجيل الدخول بالحساب الإداري
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

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
    <div className="bulk-upload-page">
      <h2>Upload Users in Bulk</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} />
      <button onClick={handleFileUpload}>Upload Users</button>
      {uploadStatus && <p>{uploadStatus}</p>}
    </div>
  );
}

export default BulkUserUpload;

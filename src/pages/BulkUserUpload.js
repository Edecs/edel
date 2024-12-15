import React, { useState } from "react";
import Papa from "papaparse";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { db, ref, set } from "../firebase";
import "./BulkUserUpload.css";

function BulkUserUpload() {
  const [csvFile, setCsvFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadedUsers, setUploadedUsers] = useState([]);

  const auth = getAuth();

  const handleFileChange = (event) => {
    setCsvFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!csvFile) {
      alert("Please select a CSV file.");
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const users = results.data;
        const addedUsers = [];
        const errors = [];

        try {
          const adminEmail = auth.currentUser.email;
          const adminPassword = prompt("Enter your admin password:");

          for (let user of users) {
            const { email, name, password, role, department } = user;

            try {
              // تحقق من وجود المستخدم مسبقًا
              const signInMethods = await fetchSignInMethodsForEmail(
                auth,
                email
              );

              if (signInMethods.length > 0) {
                console.warn(
                  `User with email ${email} already exists. Skipping.`
                );
                continue;
              }

              // إنشاء المستخدم الجديد
              const newUser = await createUserWithEmailAndPassword(
                auth,
                email,
                password
              );

              const sanitizedEmail = email.replace(/\./g, ",");

              await set(ref(db, `roles/${sanitizedEmail}`), {
                role: role || "user",
                department: department || "",
                courses: {},
              });

              await set(ref(db, `users/${sanitizedEmail}`), {
                email,
                name: name || "Unknown",
                role: role || "user",
                department: department || "",
              });

              addedUsers.push({ email, name, role, department });
            } catch (userError) {
              console.error(`Error processing user ${email}:`, userError);
              errors.push({ email, error: userError.message });
            }
          }

          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

          setUploadedUsers(addedUsers);
          setUploadStatus(
            `Processed ${addedUsers.length}/${users.length} users. Check console for errors.`
          );
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

      {uploadedUsers.length > 0 && (
        <div className="uploaded-users">
          <h3>Uploaded Users</h3>
          <ul>
            {uploadedUsers.map((user, index) => (
              <li key={index}>
                <strong>Name:</strong> {user.name} | <strong>Email:</strong>{" "}
                {user.email} | <strong>Role:</strong> {user.role} |{" "}
                <strong>Department:</strong> {user.department || "None"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default BulkUserUpload;

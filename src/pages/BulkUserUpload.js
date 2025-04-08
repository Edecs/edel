import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { db, ref, set, get } from "../firebase";
import "./BulkUserUpload.css";

function BulkUserUpload() {
  const [csvFile, setCsvFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadedUsers, setUploadedUsers] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [errors, setErrors] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const auth = getAuth();

  // تحميل المواقع والأقسام من Firebase
  useEffect(() => {
    const fetchSitesAndDepartments = async () => {
      try {
        const sitesSnapshot = await get(ref(db, "sites"));
        const departmentsSnapshot = await get(ref(db, "departments"));

        if (sitesSnapshot.exists()) {
          setSites(Object.values(sitesSnapshot.val()));
        }

        if (departmentsSnapshot.exists()) {
          setDepartments(Object.values(departmentsSnapshot.val()));
        }
      } catch (error) {
        console.error("Error fetching sites and departments:", error);
      }
    };

    fetchSitesAndDepartments();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data); // حفظ البيانات من الـ CSV في الحالة
      },
      error: (error) => {
        console.error("Error reading CSV file:", error);
        setUploadStatus("Error reading CSV file.");
      },
    });
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data); // حفظ البيانات من الـ CSV في الحالة
      },
      error: (error) => {
        console.error("Error reading CSV file:", error);
        setUploadStatus("Error reading CSV file.");
      },
    });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleFileUpload = async () => {
    if (!csvFile) {
      alert("Please select a CSV file.");
      return;
    }

    const users = csvData;
    const addedUsers = [];
    const updatedUsers = [];
    const errorList = [];

    try {
      const adminEmail = auth.currentUser.email;
      const adminPassword = prompt("Enter your admin password:");

      for (let user of users) {
        const { email, name, password, role, department, site } = user;

        if (!site || !department) {
          errorList.push({ email, error: "Site or Department is missing" });
          continue;
        }

        const emailLowerCase = email.toLowerCase(); // تحويل الإيميل إلى حروف صغيرة

        try {
          const signInMethods = await fetchSignInMethodsForEmail(
            auth,
            emailLowerCase
          );

          if (signInMethods.length > 0) {
            // المستخدم موجود بالفعل، نقوم بتحديث بياناته بدلاً من إنشائه مرة أخرى
            console.warn(
              `User with email ${emailLowerCase} already exists. Updating.`
            );

            // تحديث بيانات المستخدم في Firebase
            const sanitizedEmail = emailLowerCase.replace(/\./g, ",");

            await set(ref(db, `roles/${sanitizedEmail}`), {
              role: role || "user",
              department: department || "",
              site: site || "Unknown", // إضافة site هنا
              courses: {},
            });

            await set(ref(db, `users/${sanitizedEmail}`), {
              email: emailLowerCase, // تخزين الإيميل بالحروف الصغيرة
              name: name || "Unknown",
              role: role || "user",
              department: department || "",
              site: site || "Unknown", // إضافة site هنا
            });

            updatedUsers.push({
              email: emailLowerCase,
              name,
              role,
              department,
              site,
            });
          } else {
            // إنشاء المستخدم الجديد إذا لم يكن موجودًا
            const newUser = await createUserWithEmailAndPassword(
              auth,
              emailLowerCase,
              password
            );

            const sanitizedEmail = emailLowerCase.replace(/\./g, ",");

            await set(ref(db, `roles/${sanitizedEmail}`), {
              role: role || "user",
              department: department || "",
              site: site || "Unknown", // إضافة site هنا
              courses: {},
            });

            await set(ref(db, `users/${sanitizedEmail}`), {
              email: emailLowerCase, // تخزين الإيميل بالحروف الصغيرة
              name: name || "Unknown",
              role: role || "user",
              department: department || "",
              site: site || "Unknown", // إضافة site هنا
            });

            addedUsers.push({
              email: emailLowerCase,
              name,
              role,
              department,
              site,
            });
          }
        } catch (userError) {
          console.error(`Error processing user ${email}:`, userError);
          errorList.push({ email, error: userError.message });
        }
      }

      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

      setUploadedUsers([...addedUsers, ...updatedUsers]);
      setErrors(errorList);
      setUploadStatus(
        `Processed ${addedUsers.length + updatedUsers.length}/${
          users.length
        } users.`
      );
    } catch (error) {
      console.error("Error uploading users:", error);
      setUploadStatus("Failed to upload users.");
    }
  };

  const handleInputChange = (index, field, value) => {
    const updatedCsvData = [...csvData];
    updatedCsvData[index][field] = value;
    setCsvData(updatedCsvData); // تحديث البيانات في الحالة
  };

  // إضافة سطر جديد
  const addNewUserRow = () => {
    setCsvData([
      ...csvData,
      {
        email: "",
        name: "",
        role: "",
        department: "",
        site: "",
        password: "",
      },
    ]);
  };

  const calculatePercentage = (processed, total) => {
    return Math.round((processed / total) * 100);
  };
  const handleCheckboxChange = (index) => {
    setSelectedUsers((prevSelected) => {
      if (prevSelected.includes(index)) {
        return prevSelected.filter((item) => item !== index); // إلغاء التحديد
      } else {
        return [...prevSelected, index]; // إضافة التحديد
      }
    });
  };

  const handleDeleteSelectedUsers = () => {
    // حذف المستخدمين المحددين من csvData
    const remainingUsers = csvData.filter(
      (user, index) => !selectedUsers.includes(index)
    );
    setCsvData(remainingUsers);
    setSelectedUsers([]); // إعادة تعيين المستخدمين المحددين
  };

  return (
    <div className="bulk-upload-page">
      <h2>Upload Users in Bulk</h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: csvFile ? "none" : "block" }}
      />
      <div
        className={`dropzone ${csvFile ? "hidden" : ""}`}
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        Drag and Drop CSV File Here
      </div>
      <button onClick={handleFileUpload} disabled={!csvFile}>
        Upload Users
      </button>
      <button onClick={addNewUserRow}>Add New User</button>
      {uploadStatus && <p>{uploadStatus}</p>}

      {/* عرض البيانات من الـ CSV قبل رفعها */}
      {csvData.length > 0 && (
        <div className="csv-preview">
          <h3>CSV Data Preview</h3>
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Site</th>
                <th>Password</th>
              </tr>
            </thead>
            <tbody>
              {csvData.map((user, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(index)}
                      onChange={() => handleCheckboxChange(index)}
                    />
                  </td>

                  <td>
                    <input
                      type="email"
                      value={user.email}
                      onChange={(e) =>
                        handleInputChange(index, "email", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={user.name || ""}
                      onChange={(e) =>
                        handleInputChange(index, "name", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleInputChange(index, "role", e.target.value)
                      }
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={user.department}
                      onChange={(e) =>
                        handleInputChange(index, "department", e.target.value)
                      }
                    >
                      <option value="">Select Department</option>
                      {departments.map((department) => (
                        <option key={department.name} value={department.name}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={user.site}
                      onChange={(e) =>
                        handleInputChange(index, "site", e.target.value)
                      }
                    >
                      <option value="">Select Site</option>
                      {sites.map((site) => (
                        <option key={site.name} value={site.name}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={user.password || ""}
                      onChange={(e) =>
                        handleInputChange(index, "password", e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={handleDeleteSelectedUsers}
            disabled={selectedUsers.length === 0}
          >
            Delete Selected Users
          </button>
        </div>
      )}

      {errors.length > 0 && (
        <div className="upload-errors">
          <h3>Errors</h3>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>
                <strong>Email:</strong> {error.email} | <strong>Error:</strong>{" "}
                {error.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploadedUsers.length > 0 && (
        <div className="uploaded-users">
          <h3>Uploaded Users</h3>
          <ul>
            {uploadedUsers.map((user, index) => (
              <li key={index}>
                <strong>Name:</strong> {user.name} | <strong>Email:</strong>{" "}
                {user.email} | <strong>Role:</strong> {user.role} |{" "}
                <strong>Department:</strong> {user.department || "None"} |{" "}
                <strong>Site:</strong> {user.site || "Unknown"} |{" "}
                <strong>Percentage Processed:</strong>{" "}
                <span className="progress-bar">
                  <span
                    style={{
                      width: `${calculatePercentage(
                        index + 1,
                        uploadedUsers.length
                      )}%`,
                    }}
                  ></span>
                </span>
                {calculatePercentage(index + 1, uploadedUsers.length)}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default BulkUserUpload;

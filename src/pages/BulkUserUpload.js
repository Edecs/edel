import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { getAuth, fetchSignInMethodsForEmail } from "firebase/auth";
import { db, ref, set, get, remove, firebaseConfig } from "../firebase";
import { createAuthUserWithoutSessionSwap } from "../utils/createAuthUser";
import "./BulkUserUpload.css";
import { useLanguage } from "../context/LanguageContext";

function BulkUserUpload() {
  const { t } = useLanguage();
  const [csvFile, setCsvFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadedUsers, setUploadedUsers] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [errors, setErrors] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, email: "" });
  const [resultSummary, setResultSummary] = useState(null);

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
        setUploadStatus(t("bulkUpload.errorReadingCsv"));
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
        setUploadStatus(t("bulkUpload.errorReadingCsv"));
      },
    });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleFileUpload = async () => {
    if (isUploading) return;
    if (csvData.length === 0) {
      alert(t("bulkUpload.noUsersToUpload"));
      return;
    }

    const users = csvData;
    const addedUsers = [];
    const updatedUsers = [];
    const errorList = [];

    setIsUploading(true);
    setErrors([]);
    setUploadedUsers([]);
    setResultSummary(null);
    setProgress({ current: 0, total: users.length, email: "" });
    setUploadStatus(t("bulkUpload.uploadingProgress", { current: 0, total: users.length }));

    try {
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const { email, name, password, role, department, site } = user;
        const emailLabel = email || t("common.unknown");

        setProgress({ current: i + 1, total: users.length, email: emailLabel });
        setUploadStatus(
          t("bulkUpload.uploadingProgress", {
            current: i + 1,
            total: users.length,
            email: emailLabel,
          })
        );

        if (!email || !String(email).trim()) {
          errorList.push({
            email: emailLabel,
            error: t("bulkUpload.emailRequired"),
          });
          continue;
        }

        if (!site || !department) {
          errorList.push({
            email: emailLabel,
            error: t("bulkUpload.siteOrDepartmentMissing"),
          });
          continue;
        }

        if (!password || String(password).length < 6) {
          errorList.push({
            email: emailLabel,
            error: t("bulkUpload.passwordRequired"),
          });
          continue;
        }

        const emailLowerCase = String(email).trim().toLowerCase();

        try {
          const signInMethods = await fetchSignInMethodsForEmail(
            auth,
            emailLowerCase
          );

          const sanitizedEmail = emailLowerCase.replace(/\./g, ",");

          if (signInMethods.length > 0) {
            await set(ref(db, `roles/${sanitizedEmail}`), {
              role: role || "user",
              department: department || "",
              site: site || "Unknown",
              courses: {},
              email: emailLowerCase,
            });

            await set(ref(db, `users/${sanitizedEmail}`), {
              email: emailLowerCase,
              name: name || "Unknown",
              role: role || "user",
              department: department || "",
              site: site || "Unknown",
            });

            await remove(ref(db, `disabledUsers/${sanitizedEmail}`)).catch(
              () => {}
            );

            updatedUsers.push({
              email: emailLowerCase,
              name,
              role,
              department,
              site,
              status: "updated",
            });
          } else {
            await createAuthUserWithoutSessionSwap(firebaseConfig, {
              email: emailLowerCase,
              password,
              displayName: name,
            });

            await set(ref(db, `roles/${sanitizedEmail}`), {
              role: role || "user",
              department: department || "",
              site: site || "Unknown",
              courses: {},
              email: emailLowerCase,
            });

            await set(ref(db, `users/${sanitizedEmail}`), {
              email: emailLowerCase,
              name: name || "Unknown",
              role: role || "user",
              department: department || "",
              site: site || "Unknown",
            });

            await remove(ref(db, `disabledUsers/${sanitizedEmail}`)).catch(
              () => {}
            );
            addedUsers.push({
              email: emailLowerCase,
              name,
              role,
              department,
              site,
              status: "created",
            });
          }
        } catch (userError) {
          console.error(`Error processing user ${email}:`, userError);
          errorList.push({
            email: emailLabel,
            error: userError.message || t("bulkUpload.unknownError"),
          });
        }
      }

      const ok = [...addedUsers, ...updatedUsers];
      setUploadedUsers(ok);
      setErrors(errorList);
      setResultSummary({
        total: users.length,
        created: addedUsers.length,
        updated: updatedUsers.length,
        failed: errorList.length,
      });
      setUploadStatus(
        t("bulkUpload.summaryResult", {
          created: addedUsers.length,
          updated: updatedUsers.length,
          failed: errorList.length,
          total: users.length,
        })
      );
    } catch (error) {
      console.error("Error uploading users:", error);
      setUploadStatus(t("bulkUpload.failedUpload"));
    } finally {
      setIsUploading(false);
      setProgress({ current: 0, total: 0, email: "" });
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

  const downloadTemplate = () => {
    const templateData = [
      {
        email: "user@example.com",
        name: "User Name",
        password: "password123",
        role: "user",
        department: "Department Name",
        site: "Site Name",
      },
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "users_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bulk-upload-page">
      <h2>{t("bulkUpload.title")}</h2>
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
        {t("bulkUpload.dragDropCsv")}
      </div>
      <button onClick={downloadTemplate} disabled={isUploading}>
        {t("bulkUpload.downloadTemplate")}
      </button>
      <button onClick={addNewUserRow} disabled={isUploading}>
        {t("bulkUpload.addNewUser")}
      </button>
      {isUploading && (
        <div className="bulk-upload-progress" role="status" aria-live="polite">
          <div className="bulk-upload-spinner" />
          <p>
            {t("bulkUpload.uploadingProgress", {
              current: progress.current,
              total: progress.total,
              email: progress.email || "",
            })}
          </p>
          <div className="bulk-progress-track">
            <div
              className="bulk-progress-fill"
              style={{
                width: `${
                  progress.total
                    ? Math.round((progress.current / progress.total) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}
      {uploadStatus && !isUploading && (
        <p className="bulk-upload-status">{uploadStatus}</p>
      )}
      {resultSummary && !isUploading && (
        <div className="bulk-result-summary">
          <p>
            {t("bulkUpload.summaryCreated", { count: resultSummary.created })}
          </p>
          <p>
            {t("bulkUpload.summaryUpdated", { count: resultSummary.updated })}
          </p>
          <p className={resultSummary.failed ? "bulk-fail-text" : ""}>
            {t("bulkUpload.summaryFailed", { count: resultSummary.failed })}
          </p>
        </div>
      )}

      {/* عرض البيانات من الـ CSV قبل رفعها */}
      {csvData.length > 0 && (
        <div className="csv-preview">
          <h3>{t("bulkUpload.csvPreview")}</h3>
          <table>
            <thead>
              <tr>
                <th>{t("bulkUpload.select")}</th>
                <th>{t("bulkUpload.email")}</th>
                <th>{t("bulkUpload.name")}</th>
                <th>{t("bulkUpload.role")}</th>
                <th>{t("bulkUpload.department")}</th>
                <th>{t("bulkUpload.site")}</th>
                <th>{t("bulkUpload.password")}</th>
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
                      <option value="user">{t("common.roleUser")}</option>
                      <option value="admin">{t("common.roleAdmin")}</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={user.department}
                      onChange={(e) =>
                        handleInputChange(index, "department", e.target.value)
                      }
                    >
                      <option value="">{t("common.selectDepartment")}</option>
                      {departments.map((department, deptIndex) => (
                        <option key={deptIndex} value={department.name}>
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
                      <option value="">{t("common.selectSite")}</option>
                      {sites.map((site, siteIndex) => (
                        <option key={siteIndex} value={site.name}>
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
            disabled={selectedUsers.length === 0 || isUploading}
          >
            {t("bulkUpload.deleteSelected")}
          </button>
          <button
            onClick={handleFileUpload}
            disabled={csvData.length === 0 || isUploading}
          >
            {isUploading
              ? t("bulkUpload.uploading")
              : t("bulkUpload.uploadToFirebase")}
          </button>
          <button onClick={downloadTemplate} disabled={isUploading}>
            {t("bulkUpload.downloadTemplate")}
          </button>
        </div>
      )}

      {errors.length > 0 && (
        <div className="upload-errors">
          <h3>{t("bulkUpload.errors")}</h3>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>
                <strong>{t("bulkUpload.errorEmail")}</strong> {error.email} | <strong>{t("bulkUpload.errorLabel")}</strong>{" "}
                {error.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploadedUsers.length > 0 && (
        <div className="uploaded-users">
          <h3>{t("bulkUpload.uploadedUsers")}</h3>
          <ul>
            {uploadedUsers.map((user, index) => (
              <li key={index}>
                <strong>
                  {user.status === "updated"
                    ? t("bulkUpload.statusUpdated")
                    : t("bulkUpload.statusCreated")}
                </strong>{" "}
                | <strong>{t("bulkUpload.nameStrong")}</strong> {user.name} |{" "}
                <strong>{t("bulkUpload.emailStrong")}</strong> {user.email} |{" "}
                <strong>{t("bulkUpload.roleStrong")}</strong> {user.role} |{" "}
                <strong>{t("bulkUpload.departmentStrong")}</strong>{" "}
                {user.department || t("common.notAvailable")} |{" "}
                <strong>{t("bulkUpload.siteStrong")}</strong>{" "}
                {user.site || t("common.unknown")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default BulkUserUpload;

import React, { useState, useEffect } from "react";
import { db, ref, set, get, push } from "../firebase"; // تأكد من استيراد push
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext"; // استيراد AuthContext
import { useNavigate } from "react-router-dom"; // استيراد useNavigate للتوجيه
import "./DepartmentManagement.css";

const DepartmentManagement = () => {
  const { isSuperAdmin, currentUser } = useAuth(); // استخدام صلاحيات المستخدم
  const navigate = useNavigate(); // تهيئة التوجيه

  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState("");

  useEffect(() => {
    // إذا لم يكن المستخدم سوبر أدمن، قم بإعادة توجيهه
    if (!isSuperAdmin) {
      navigate("/"); // يمكنك تغيير الوجهة إلى الصفحة المناسبة
    } else {
      const fetchDepartments = async () => {
        try {
          const departmentsRef = ref(db, "departments");
          const snapshot = await get(departmentsRef);

          if (snapshot.exists()) {
            const data = snapshot.val();
            const departmentList = Object.keys(data).map(
              (key) => data[key].name
            );
            setDepartments(departmentList);
          }
        } catch (error) {
          console.error("Error fetching departments: ", error);
        }
      };

      fetchDepartments();
    }
  }, [isSuperAdmin, navigate]); // إضافة isSuperAdmin كاعتماد

  const handleAddDepartment = async () => {
    if (newDepartment.trim()) {
      try {
        const departmentsRef = ref(db, "departments");
        const newDepartmentRef = push(departmentsRef); // إنشاء مرجع جديد مع معرف فريد
        await set(newDepartmentRef, { name: newDepartment });

        // جلب اسم المستخدم من Realtime Database
        let userName = "Unknown";
        let userEmail = currentUser?.email || auth.currentUser?.email || "Unknown";
        if (userEmail !== "Unknown") {
          const safeEmailPath = userEmail.replace(/\./g, ",");
          const userRef = ref(db, `users/${safeEmailPath}`);
          const userSnapshot = await get(userRef);
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            userName = userData.name || userEmail;
          }
        }

        // إضافة سجل في اللوج على Realtime Database (فقط userName وdetailMessage وtimestamp)
        const logsRef = ref(db, "logs");
        const logEntry = {
          userName: userName,
          timestamp: new Date().toISOString(),
          detailMessage: `تم إضافة قسم جديد باسم ${newDepartment}`,
        };
        await push(logsRef, logEntry);

        setDepartments([...departments, newDepartment]);
        setNewDepartment("");
      } catch (error) {
        console.error("Error adding department: ", error);
      }
    }
  };

  const handleDeleteDepartment = async (departmentName) => {
    try {
      const departmentsRef = ref(db, "departments");
      const snapshot = await get(departmentsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const keyToDelete = Object.keys(data).find((key) => data[key].name === departmentName);
        if (keyToDelete) {
          const departmentRef = ref(db, `departments/${keyToDelete}`);
          await set(departmentRef, null);
          setDepartments(departments.filter((dep) => dep !== departmentName));

          // جلب اسم المستخدم من Realtime Database
          let userName = "Unknown";
          let userEmail = currentUser?.email || auth.currentUser?.email || "Unknown";
          if (userEmail !== "Unknown") {
            const safeEmailPath = userEmail.replace(/\./g, ",");
            const userRef = ref(db, `users/${safeEmailPath}`);
            const userSnapshot = await get(userRef);
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              userName = userData.name || userEmail;
            }
          }

          // إضافة سجل في اللوج على Realtime Database (فقط userName وdetailMessage وtimestamp)
          const logsRef = ref(db, "logs");
          const logEntry = {
            userName: userName,
            timestamp: new Date().toISOString(),
            detailMessage: `تم حذف القسم ${departmentName}`,
          };
          await push(logsRef, logEntry);
        }
      }
    } catch (error) {
      console.error("Error deleting department:", error);
    }
  };

  return (
    <div className="department">
      <header>
        <h1 className="header-h1">Department Management</h1>
      </header>
      <div className="department-management">
        <input
          type="text"
          placeholder="Enter department name"
          value={newDepartment}
          onChange={(e) => setNewDepartment(e.target.value)}
        />
        <button onClick={handleAddDepartment}>Add Department</button>
        <ul>
          {departments.map((department, index) => (
            <li key={index} style={{ display: "flex", alignItems: "center" }}>
              {department}
              <button
                style={{ marginLeft: "10px", color: "red" }}
                onClick={() => handleDeleteDepartment(department)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DepartmentManagement;

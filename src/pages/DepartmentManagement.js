import React, { useState, useEffect } from "react";
import { db, ref, set, get, push } from "../firebase"; // تأكد من استيراد push
import { useAuth } from "../context/AuthContext"; // استيراد AuthContext
import { useNavigate } from "react-router-dom"; // استيراد useNavigate للتوجيه
import "./DepartmentManagement.css";

const DepartmentManagement = () => {
  const { isSuperAdmin } = useAuth(); // استخدام صلاحيات المستخدم
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

        setDepartments([...departments, newDepartment]);
        setNewDepartment("");
      } catch (error) {
        console.error("Error adding department: ", error);
      }
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
            <li key={index}>{department}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DepartmentManagement;

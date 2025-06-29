import React, { useState, useEffect } from "react";
import { db, ref, set, get, push } from "../firebase"; // تأكد من استيراد push
import { auth } from "../firebase"; // إضافة هذا السطر إذا لم يكن موجودًا
import { useAuth } from "../context/AuthContext"; // استيراد AuthContext
import { useNavigate } from "react-router-dom"; // استيراد useNavigate للتوجيه
import "./SiteManagement.css"; // ستحتاج إلى إضافة CSS

const SiteManagement = () => {
  const { isSuperAdmin, currentUser } = useAuth(); // استخدام صلاحيات المستخدم وجلب بيانات المستخدم
  const navigate = useNavigate(); // تهيئة التوجيه

  const [sites, setSites] = useState([]);
  const [newSite, setNewSite] = useState("");

  useEffect(() => {
    // إذا لم يكن المستخدم سوبر أدمن، قم بإعادة توجيهه
    if (!isSuperAdmin) {
      navigate("/"); // يمكنك تغيير الوجهة إلى الصفحة المناسبة
    } else {
      const fetchSites = async () => {
        try {
          const sitesRef = ref(db, "sites");
          const snapshot = await get(sitesRef);

          if (snapshot.exists()) {
            const data = snapshot.val();
            const siteList = Object.keys(data).map((key) => data[key].name);
            setSites(siteList);
          }
        } catch (error) {
          console.error("Error fetching sites: ", error);
        }
      };

      fetchSites();
    }
  }, [isSuperAdmin, navigate]);

  const handleAddSite = async () => {
    if (newSite.trim()) {
      try {
        const sitesRef = ref(db, "sites");
        const newSiteRef = push(sitesRef); // إنشاء مرجع جديد مع معرف فريد
        await set(newSiteRef, { name: newSite });

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

        // إضافة سجل في اللوج على Realtime Database
        const logsRef = ref(db, "logs");
        const logEntry = {
          eventType: "ADD_SITE",
          userName: userName,
          userEmail: userEmail,
          timestamp: new Date().toISOString(),
        };
        await push(logsRef, logEntry);

        setSites([...sites, newSite]);
        setNewSite("");
      } catch (error) {
        console.error("Error adding site: ", error);
      }
    }
  };

  const handleDeleteSite = async (siteName) => {
    try {
      const sitesRef = ref(db, "sites");
      const snapshot = await get(sitesRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const keyToDelete = Object.keys(data).find((key) => data[key].name === siteName);
        if (keyToDelete) {
          const siteRef = ref(db, `sites/${keyToDelete}`);
          await set(siteRef, null);
          setSites(sites.filter((site) => site !== siteName));

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

          // إضافة سجل في اللوج على Realtime Database
          const logsRef = ref(db, "logs");
          const logEntry = {
            eventType: "DELETE_SITE",
            userName: userName,
            userEmail: userEmail,
            timestamp: new Date().toISOString(),
          };
          await push(logsRef, logEntry);
        }
      }
    } catch (error) {
      console.error("Error deleting site:", error);
    }
  };

  return (
    <div className="site">
      <header>
        <h1 className="header-h1">Site Management</h1>
      </header>
      <div className="site-management">
        <input
          type="text"
          placeholder="Enter site name"
          value={newSite}
          onChange={(e) => setNewSite(e.target.value)}
        />
        <button onClick={handleAddSite}>Add Site</button>
        <ul>
          {sites.map((site, index) => (
            <li key={index} style={{ display: "flex", alignItems: "center" }}>
              {site}
              <button
                style={{ marginLeft: "10px", color: "red" }}
                onClick={() => handleDeleteSite(site)}
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

export default SiteManagement;

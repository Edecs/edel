import React, { useState, useEffect } from "react";
import { db, ref, set, get, push } from "../firebase"; // تأكد من استيراد push
import { useAuth } from "../context/AuthContext"; // استيراد AuthContext
import { useNavigate } from "react-router-dom"; // استيراد useNavigate للتوجيه
import "./SiteManagement.css"; // ستحتاج إلى إضافة CSS

const SiteManagement = () => {
  const { isSuperAdmin } = useAuth(); // استخدام صلاحيات المستخدم
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

        setSites([...sites, newSite]);
        setNewSite("");
      } catch (error) {
        console.error("Error adding site: ", error);
      }
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
            <li key={index}>{site}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SiteManagement;

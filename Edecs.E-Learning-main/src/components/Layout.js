import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css'; // تأكد من إضافة ملف CSS إذا لزم الأمر

function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div>
      <Navbar onSidebarToggle={handleSidebarToggle} />
      {isSidebarOpen && <Sidebar />} {/* عرض الـ Sidebar إذا كانت الحالة مفتوحة */}
      <div className={`content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <Outlet /> {/* يتم عرض المكونات الفرعية هنا */}
      </div>
    </div>
  );
}

export default Layout;

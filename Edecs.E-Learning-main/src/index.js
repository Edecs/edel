import React from 'react';
import ReactDOM from 'react-dom/client'; // تعديل الاستيراد
import AppWrapper from './AppWrapper'; // تأكد من المسار الصحيح

const root = ReactDOM.createRoot(document.getElementById('root')); // استخدام createRoot
root.render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);

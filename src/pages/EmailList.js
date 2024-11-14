import React, { useState, useEffect } from 'react';
import { database, ref, get, child } from './firebase';  // تأكد من استيراد `get` بشكل صحيح

function EmailList() {
  const [emails, setEmails] = useState([]);

  useEffect(() => {
    // تحديد المسار الذي نريد الحصول منه على البيانات
    const emailRef = ref(database, 'emails');

    // استخدام `get` لجلب البيانات من Firebase
    get(emailRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const emailArray = [];
        for (let id in data) {
          emailArray.push(data[id]);
        }
        setEmails(emailArray);
      } else {
        console.log('No data available');
      }
    }).catch((error) => {
      console.error(error);
    });
  }, []);

  return (
    <div>
      <h2>Received Emails</h2>
      <ul>
        {emails.map((email, index) => (
          <li key={index}>
            <strong>Email:</strong> {email.email} <br />
            <strong>Message:</strong> {email.message} <br />
            <strong>Timestamp:</strong> {new Date(email.timestamp).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EmailList;

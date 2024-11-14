import React, { useState } from 'react';
import emailjs from 'emailjs-com';
import './EmailForm.css';

import { database, ref, push, set } from './firebase'; // استيراد Firebase

function EmailForm() {
  // حالة الحقول (الاسم، البريد الإلكتروني، الرسالة)
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  // دالة التعامل مع إرسال النموذج
  const handleSubmit = (event) => {
    event.preventDefault();  // منع إعادة تحميل الصفحة عند إرسال النموذج

    // التحقق من أن حقل البريد الإلكتروني للمستلم ليس فارغًا
    if (!toEmail || !fromEmail) {
      setStatus('Please fill in both the sender and recipient email addresses.');
      return;
    }

    // إعداد بيانات القالب التي سيتم إرسالها
    const templateParams = {
      from_name: fromName,      // اسم المرسل
      from_email: fromEmail,    // بريد المرسل
      to_email: toEmail,        // بريد المستلم
      message: message,         // الرسالة
      reply_to: fromEmail,      // عنوان الرد هو البريد الذي أدخله المرسل
    };

    // إرسال البريد عبر emailjs
    emailjs.send('service_b0yzx2o', 'template_zz1ruij', templateParams, 'PXS_cTqdGTjx-W0yE')
      .then((response) => {
        setStatus('Email sent successfully!');
        console.log('SUCCESS!', response.status, response.text);

        // حفظ البريد الإلكتروني في Firebase Realtime Database بعد الإرسال
        const emailData = {
          fromName,
          fromEmail,
          toEmail,
          message,
          timestamp: new Date().toISOString(), // حفظ الوقت
        };

        const emailsRef = ref(database, 'emails'); // تحديد المسار في قاعدة البيانات
        const newEmailRef = push(emailsRef);  // إضافة البيانات إلى المسار
        set(newEmailRef, emailData)  // حفظ البيانات
          .then(() => {
            console.log('Email saved to Firebase');
          })
          .catch((error) => {
            console.error('Error saving email to Firebase:', error);
          });

      })
      .catch((error) => {
        setStatus('Failed to send email.');
        console.log('FAILED...', error);
      });

    // إفراغ الحقول بعد الإرسال
    setFromName('');
    setFromEmail('');
    setToEmail('');
    setMessage('');
  };

  return (
    <div>
      <h2>Send Email</h2>
      <form id="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="from_name">From Name</label>
          <input
            type="text"
            name="from_name"
            id="from_name"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="from_email">From Email</label>
          <input
            type="email"
            name="from_email"
            id="from_email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="to_email">To Email</label>
          <input
            type="email"
            name="to_email"
            id="to_email"
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="message">Message</label>
          <textarea
            name="message"
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        <input type="submit" id="button" value="Send Email" />
      </form>
      <p>{status}</p>
    </div>
  );
}

export default EmailForm;

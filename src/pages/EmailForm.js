import React, { useState, useEffect } from 'react';
import emailjs from 'emailjs-com';
import './EmailForm.css';
import { db, ref, push, set, get } from '../firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

function EmailForm() {
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [subject, setSubject] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [bccEmail, setBccEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        setUsersList(Object.values(usersData));
      }
    };

    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userEmail = user.email.replace(/\./g, ',');
        const userRef = ref(db, `users/${userEmail}`);
        const userSnapshot = await get(userRef);

        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          setSenderName(userData.name || "User");
        }

        setSenderEmail(user.email);
      } else {
        console.log("No user is signed in");
      }
    });

    fetchUsers();
  }, []);

  const handleUserSelection = (email) => {
    setSelectedEmails((prev) => {
      if (prev.includes(email)) {
        return prev.filter((e) => e !== email);
      }
      return [...prev, email];
    });
  };

  const handleRemoveEmail = (email) => {
    setSelectedEmails((prev) => prev.filter((e) => e !== email));
  };

  const filteredUsers = usersList.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (event) => {
    event.preventDefault();

    if (selectedEmails.length === 0 || !senderEmail) {
      setStatusMessage('Please provide the sender email and select at least one recipient.');
      return;
    }

    const templateParams = {
      from_name: senderName,
      from_email: senderEmail,
      to_email: selectedEmails.join(', '),
      cc_email: ccEmail,
      bcc_email: bccEmail,
      subject: subject,
      message: messageContent,
      reply_to: senderEmail,
    };

    emailjs.send('service_33nrb0q', 'template_zz1ruij', templateParams, 'PXS_cTqdGTjx-W0yE')
      .then((response) => {
        setStatusMessage('Emails sent successfully!');
        console.log('SUCCESS!', response.status, response.text);

        const emailData = {
          senderName,
          senderEmail,
          recipients: selectedEmails,
          ccEmail,
          bccEmail,
          subject,
          messageContent,
          timestamp: new Date().toISOString(),
        };

        const emailsRef = ref(db, 'emails');
        const newEmailRef = push(emailsRef);
        set(newEmailRef, emailData)
          .then(() => {
            console.log('Email saved to Firebase');
          })
          .catch((error) => {
            console.error('Error saving email to Firebase:', error);
          });
      })
      .catch((error) => {
        setStatusMessage('Failed to send email.');
        console.log('FAILED...', error);
      });

    setSenderName('');
    setSenderEmail('');
    setCcEmail('');
    setBccEmail('');
    setSubject('');
    setMessageContent('');
    setSelectedEmails([]);
  };

  return (
    <div className="email-form-container">
      <h2>Send an Email</h2>
      <form id="form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="sender_name">Your Name</label>
          <input
            type="text"
            name="sender_name"
            id="sender_name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            required
            disabled
          />
        </div>
        <div className="input-group">
          <label htmlFor="sender_email">Your Email</label>
          <input
            type="email"
            name="sender_email"
            id="sender_email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            required
            disabled
          />
        </div>
        <div className="input-group">
          <label htmlFor="subject">Subject</label>
          <input
            type="text"
            name="subject"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="cc_email">CC</label>
          <input
            type="email"
            name="cc_email"
            id="cc_email"
            value={ccEmail}
            onChange={(e) => setCcEmail(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="bcc_email">BCC</label>
          <input
            type="email"
            name="bcc_email"
            id="bcc_email"
            value={bccEmail}
            onChange={(e) => setBccEmail(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="message_content">Message</label>
          <textarea
            name="message_content"
            id="message_content"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            required
          />
        </div>
        
        {/* شريط المستلمين المحددين */}
        <div className="selected-emails-bar">
          {selectedEmails.map((email) => (
            <div key={email} className="selected-email">
              <span>{email}</span>
              <button onClick={() => handleRemoveEmail(email)}>&times;</button>
            </div>
          ))}
        </div>

        {/* حقل البحث */}
        <div className="input-group">
          <label htmlFor="search-recipients">Search Recipients</label>
          <input
            type="text"
            placeholder="Type to search by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-bar"
          />
          <ul className="recipient-list">
            {searchQuery && filteredUsers.map((user) => (
              <li key={user.email}>
                <input
                  type="checkbox"
                  id={user.email}
                  checked={selectedEmails.includes(user.email)}
                  onChange={() => handleUserSelection(user.email)}
                />
                <label htmlFor={user.email}>{user.name} ({user.email})</label>
              </li>
            ))}
          </ul>
        </div>

        <input type="submit" id="submit-button" value="Send Email" />
      </form>
      <p>{statusMessage}</p>
    </div>
  );
}

export default EmailForm;

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext'; // تأكد من أن المسار صحيح
import App from './App';

const AppWrapper = () => (
  <Router>
    <AuthProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </AuthProvider>
  </Router>
);

export default AppWrapper;

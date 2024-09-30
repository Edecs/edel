import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import './SignUpPage.css';

function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const auth = getAuth();
    const database = getDatabase();

    const handleSignUp = async () => {
        if (email && password) {
            try {
                await createUserWithEmailAndPassword(auth, email, password);

                const sanitizedEmail = email.replace(/\./g, ',');
                const role = isAdmin ? 'admin' : 'user';

                await set(ref(database, `roles/${sanitizedEmail}`), {
                    email: email,
                    role: role,
                    courses: []
                });

                setSuccess('User registered successfully!');
                setEmail('');
                setPassword('');
                setIsAdmin(false);
            } catch (error) {
                setError('Failed to register user. Please try again.');
                console.error('Error registering user:', error);
            }
        } else {
            setError('Email and password are required.');
        }
    };

    return (
        <div className="signup-page">
            <h2>Sign Up</h2>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
            <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <label>
                <input
                    type="checkbox"
                    checked={isAdmin}
                    onChange={() => setIsAdmin(!isAdmin)}
                />
                Admin
            </label>
            <button onClick={handleSignUp}>Sign Up</button>
        </div>
    );
}

export default SignUpPage;

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { API_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    // API_URL imported from config


    // Register user in Auth & backend
    async function register(email, password, name) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Call Backend to create user profile (Bypasses Client Firestore Rules)
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: user.uid,
                email: email,
                name: name,
                role: "user"
            })
        });

        if (!response.ok) {
            console.error("Backend failed to create user profile");
            // Optional: delete auth user if profile creation fails
        }

        return user;
    }

    // Login user
    function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Ensure user document exists in backend (auto-create if needed)
                try {
                    await fetch(`${API_URL}/users/ensure-user`, {
                        method: 'POST',
                        headers: { 'x-user-uid': user.uid }
                    });
                } catch (error) {
                    console.error("Failed to ensure user document:", error);
                }

                // Fetch user data from Backend (Safe from client rules)
                try {
                    const response = await fetch(`${API_URL}/users/${user.uid}`);
                    if (response.ok) {
                        const data = await response.json();
                        setUserData(data);
                        // Store UID in localStorage for API calls
                        localStorage.setItem('userUid', user.uid);
                    } else {
                        setUserData(null);
                    }
                } catch (error) {
                    console.error("Failed to fetch user data:", error);
                    setUserData(null);
                }
            } else {
                setUserData(null);
                localStorage.removeItem('userUid');
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userData,
        loading,
        register,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

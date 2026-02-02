import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBg5JdqFbz6nbDxnRySEnTAaIL_YCWKfYY",
    authDomain: "workhub-app-d82c8.firebaseapp.com",
    projectId: "workhub-app-d82c8",
    storageBucket: "workhub-app-d82c8.firebasestorage.app",
    messagingSenderId: "996975315156",
    appId: "1:996975315156:web:7801a41d9f8f75734a9341"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;

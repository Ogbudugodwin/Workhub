import admin from "./config/firebase.js";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const auth = getAuth();
const db = getFirestore();

const seedAdmin = async () => {
    const adminEmail = "admin@workhub.com";
    const adminPassword = "SuperSecurePassword123!"; // You should change this after first login
    const adminName = "Super Admin";

    try {
        console.log("Checking if admin already exists...");
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(adminEmail);
            console.log("Admin account already exists in Firebase Auth.");
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log("Creating new admin account in Firebase Auth...");
                userRecord = await auth.createUser({
                    email: adminEmail,
                    password: adminPassword,
                    displayName: adminName,
                });
                console.log("Admin account created in Firebase Auth.");
            } else {
                throw error;
            }
        }

        console.log("Syncing admin profile to Firestore...");
        await db.collection("users").doc(userRecord.uid).set({
            name: adminName,
            email: adminEmail,
            role: "super_admin",
            createdAt: new Date().toISOString(),
            status: "active"
        }, { merge: true });

        console.log("-----------------------------------------");
        console.log("SUPER ADMIN SEEDED SUCCESSFULLY!");
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log("-----------------------------------------");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding admin:", error);
        process.exit(1);
    }
};

seedAdmin();

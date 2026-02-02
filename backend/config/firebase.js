import pkg from 'firebase-admin';
const { credential } = pkg;
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');

let app;
if (getApps().length === 0) {
    try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        // Robust key parsing for PEM format
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        app = initializeApp({
            credential: credential.cert(serviceAccount),
            storageBucket: "workhub-app-d82c8.appspot.com"
        });
        console.log("Firebase Admin Initialized successfully using Service Account.");
    } catch (error) {
        console.error("CRITICAL: Firebase Admin Initialization Failed!");
        console.error("Error Detail:", error);
        // Fallback to project ID (this might fail for DB writes if not in GCP)
        app = initializeApp({
            projectId: "workhub-app-d82c8",
            storageBucket: "workhub-app-d82c8.appspot.com"
        });
    }
} else {
    app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const FieldValue = pkg.firestore.FieldValue;

export { db, auth, FieldValue, storage };
export default app;

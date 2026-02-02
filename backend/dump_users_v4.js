import { db } from "./config/firebase.js";

async function dumpUser() {
    try {
        const uid = "FXVfpFoDp9Y1K5wA7W1m6E7m0nM2"; // Based on previous truncated output, wait, let me check the full UID or just list all users.
        const snapshot = await db.collection("users").get();
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        console.log(JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error dumping users:", error);
        process.exit(1);
    }
}

dumpUser();

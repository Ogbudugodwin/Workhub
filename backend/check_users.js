import { db } from "./config/firebase.js";

async function checkUsers() {
    try {
        console.log("Checking users...");
        const snapshot = await db.collection("users").get();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`UID: ${doc.id}, Email: ${data.email}, Role: ${data.role}, CompanyID: ${data.companyId}`);
        });
    } catch (error) {
        console.error("FAILED:", error);
    }
}

checkUsers();

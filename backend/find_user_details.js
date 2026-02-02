import { db } from "./config/firebase.js";

async function findUser() {
    try {
        const snapshot = await db.collection("users").get();
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        const targetUser = users.find(u => u.uid.startsWith("FXVfpFoDp9Y"));
        if (targetUser) {
            console.log(`UID: ${targetUser.uid}`);
            console.log(`Role: ${targetUser.role}`);
            console.log(`CompanyId: ${targetUser.companyId}`);
        } else {
            console.log("User not found");
        }
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

findUser();

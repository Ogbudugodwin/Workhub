import { db } from "./config/firebase.js";

async function listUsers() {
    try {
        const snapshot = await db.collection("users").get();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`UID_START[${doc.id}]UID_END | NAME[${data.name}] | ROLE[${data.role}]`);
        });
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

listUsers();

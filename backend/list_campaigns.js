import { db } from "./config/firebase.js";

async function listAllCampaigns() {
    try {
        const snapshot = await db.collection("email_campaigns").get();
        snapshot.docs.forEach(doc => {
            console.log(`ID: [${doc.id}] Status: [${doc.data().status}] Name: [${doc.data().name}]`);
        });
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

listAllCampaigns();

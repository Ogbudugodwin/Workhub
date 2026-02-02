import { db } from "./config/firebase.js";

async function dumpCampaigns() {
    try {
        const snapshot = await db.collection("email_campaigns").get();
        const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(JSON.stringify(campaigns, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error dumping campaigns:", error);
        process.exit(1);
    }
}

dumpCampaigns();

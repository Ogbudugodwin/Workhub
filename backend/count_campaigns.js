import { db } from "./config/firebase.js";

async function countCampaigns() {
    try {
        const snapshot = await db.collection("email_campaigns").get();
        console.log(`Total Campaigns: ${snapshot.size}`);
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

countCampaigns();

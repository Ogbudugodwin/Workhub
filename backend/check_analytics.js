import { db } from "./config/firebase.js";

async function checkAnalytics() {
    try {
        const snapshot = await db.collection("campaign_analytics").get();
        snapshot.docs.forEach(doc => {
            console.log(`Campaign ${doc.id}: Delivered: ${doc.data().delivered}, Failed: ${doc.data().failed}`);
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkAnalytics();

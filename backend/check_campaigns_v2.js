import { db } from "./config/firebase.js";

async function checkCampaigns() {
    try {
        const snapshot = await db.collection("email_campaigns").get();
        console.log(`Total Campaigns: ${snapshot.size}`);
        snapshot.docs.forEach(doc => {
            const c = doc.data();
            console.log(`ID: ${doc.id} | Name: ${c.name} | Status: ${c.status} | CompanyId: ${c.companyId}`);
        });
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

checkCampaigns();

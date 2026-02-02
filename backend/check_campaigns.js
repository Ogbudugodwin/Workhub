import { db } from "./config/firebase.js";

async function checkCampaigns() {
    try {
        const snapshot = await db.collection("email_campaigns").get();
        const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        campaigns.forEach(c => {
            console.log(`Campaign: ${c.name} | Subject: ${c.subject} | CompanyId: ${c.companyId} | CreatedBy: ${c.createdBy}`);
        });
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

checkCampaigns();

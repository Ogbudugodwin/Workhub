import { db } from "./config/firebase.js";

async function checkCampaign(id) {
    try {
        const campaignDoc = await db.collection("email_campaigns").doc(id).get();
        if (!campaignDoc.exists) {
            console.log("Campaign not found");
            return;
        }
        const campaign = campaignDoc.data();
        console.log("Campaign Name:", campaign.name);
        console.log("Campaign Status:", campaign.status);
        console.log("Recipient Lists:", campaign.recipientListIds);

        const analyticsDoc = await db.collection("campaign_analytics").doc(id).get();
        if (analyticsDoc.exists) {
            console.log("Analytics:", JSON.stringify(analyticsDoc.data(), null, 2));
        } else {
            console.log("No analytics found");
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

checkCampaign("wEv7idK1Gm93lH57NMM");

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
        console.log("HTML Content Length:", campaign.htmlContent?.length);

        const analyticsDoc = await db.collection("campaign_analytics").doc(id).get();
        if (analyticsDoc.exists) {
            console.log("Analytics:", analyticsDoc.data());
        } else {
            console.log("No analytics found");
        }

        if (campaign.recipientListIds && campaign.recipientListIds.length > 0) {
            for (const listId of campaign.recipientListIds) {
                const listDoc = await db.collection("email_lists").doc(listId).get();
                if (listDoc.exists) {
                    const list = listDoc.data();
                    console.log(`List ${listId} (${list.name}) Recipient Count:`, list.recipients?.length);
                    if (list.recipients) {
                        list.recipients.forEach(r => console.log(` - ${r.email}`));
                    }
                } else {
                    console.log(`List ${listId} not found`);
                }
            }
        }

    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

// Get the last created campaign
async function checkLastCampaign() {
    const snapshot = await db.collection("email_campaigns").orderBy("createdAt", "desc").limit(1).get();
    if (snapshot.empty) {
        console.log("No campaigns found");
        process.exit(0);
    }
    const id = snapshot.docs[0].id;
    await checkCampaign(id);
}

checkLastCampaign();

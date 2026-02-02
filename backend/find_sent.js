import { db } from "./config/firebase.js";

async function findSentCampaigns() {
    try {
        const snapshot = await db.collection("email_campaigns").where("status", "==", "sent").get();
        if (snapshot.empty) {
            console.log("No sent campaigns found");
        } else {
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log(`Campaign: ${doc.id}, Name: ${data.name}, Sent At: ${data.sentAt}, List Count: ${data.recipientListIds?.length}`);
            });
        }

        const snapshot2 = await db.collection("email_campaigns").where("status", "==", "sending").get();
        if (!snapshot2.empty) {
            snapshot2.docs.forEach(doc => {
                const data = doc.data();
                console.log(`STUCK Sending: ${doc.id}, Name: ${data.name}`);
            });
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

findSentCampaigns();

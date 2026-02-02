import { db } from "./config/firebase.js";

async function dumpLists() {
    try {
        const snapshot = await db.collection("email_lists").get();
        if (snapshot.empty) {
            console.log("No lists found");
        } else {
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log(`List: ${doc.id}, Name: ${data.name}`);
                console.log("Recipients:", JSON.stringify(data.recipients, null, 2));
            });
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

dumpLists();

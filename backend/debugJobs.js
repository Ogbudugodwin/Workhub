import { db } from "./config/firebase.js";

async function checkJobs() {
    const snapshot = await db.collection("jobs").get();
    console.log(`Total jobs: ${snapshot.size}`);
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Title: ${data.title}, Status: ${data.status}`);
    });
    process.exit(0);
}

checkJobs();

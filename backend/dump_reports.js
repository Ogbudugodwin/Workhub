import { db } from "./config/firebase.js";

async function dumpReports() {
    try {
        console.log("Dumping first 5 work reports...");
        const snapshot = await db.collection("work_reports").limit(5).get();
        if (snapshot.empty) {
            console.log("No reports found.");
            return;
        }
        snapshot.docs.forEach(doc => {
            console.log(`ID: ${doc.id}`);
            console.log(JSON.stringify(doc.data(), null, 2));
            console.log('---');
        });
    } catch (error) {
        console.error("FAILED:", error);
    }
}

dumpReports();

import { db } from "./config/firebase.js";

async function testQuery() {
    try {
        console.log("Testing work_reports query...");
        const snapshot = await db.collection("work_reports").limit(1).get();
        console.log("Query successful. Size:", snapshot.size);
    } catch (error) {
        console.error("Query FAILED:", error);
    }
}

testQuery();

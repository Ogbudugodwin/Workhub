import { db } from "./config/firebase.js";

async function dumpComplaints() {
    const snapshot = await db.collection("complaints").get();
    console.log(`Total complaints: ${snapshot.size}`);

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(JSON.stringify({ id: doc.id, ...data }, null, 2));
        console.log("-------------------");
    });
    process.exit(0);
}

dumpComplaints();

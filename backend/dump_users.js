import { db } from "./config/firebase.js";

async function dumpUsers() {
    const snapshot = await db.collection("users").get();
    let output = "";
    snapshot.forEach(doc => {
        const data = doc.data();
        output += `UID: ${doc.id} | Role: ${data.role} | Email: ${data.email} | CompanyId: ${data.companyId}\n`;
    });
    console.log(output);
    process.exit(0);
}

dumpUsers();

import { db } from "./config/firebase.js";

async function checkUser() {
    try {
        const uid = "FXVfpFoDp9Y1K5wA7W1m6E7m0nM2";
        const doc = await db.collection("users").doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            process.stdout.write(`ROLE_START[${data.role}]ROLE_END\n`);
            process.stdout.write(`COMPANY_START[${data.companyId}]COMPANY_END\n`);
        } else {
            console.log("User not found");
        }
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
}

checkUser();

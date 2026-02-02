import { db } from "./config/firebase.js";

async function migrateJobsToVacancy() {
    try {
        console.log("Starting migration from 'jobs' to 'vacancy' collection...");

        const jobsSnapshot = await db.collection("jobs").get();
        console.log(`Found ${jobsSnapshot.size} jobs to migrate`);

        const batch = db.batch();
        let count = 0;

        for (const doc of jobsSnapshot.docs) {
            const jobData = doc.data();
            const newDocRef = db.collection("vacancy").doc(doc.id);
            batch.set(newDocRef, jobData);
            count++;

            // Firestore batch limit is 500 operations
            if (count % 400 === 0) {
                await batch.commit();
                console.log(`Committed batch of ${count} jobs`);
                batch = db.batch();
            }
        }

        if (count > 0) {
            await batch.commit();
            console.log(`Committed final batch. Total migrated: ${count}`);
        }

        // Optional: Delete old jobs collection after verification
        // console.log("Deleting old jobs collection...");
        // await deleteCollection(db, 'jobs');

        console.log("Migration completed successfully!");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

// Helper function to delete collection (use with caution)
async function deleteCollection(db, collectionPath, batchSize = 10) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve, reject);
    });
}

async function deleteQueryBatch(db, query, resolve, reject) {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve, reject);
    });
}

migrateJobsToVacancy();

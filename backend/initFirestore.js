import admin, { db } from "./config/firebase.js";

const initializeCollections = async () => {
    console.log("🚀 Starting Firestore Collection Initialization...");

    try {
        // 1. CATEGORIES COLLECTION
        console.log("Creating 'categories'...");
        const categories = [
            { name: "Frontend Development", icon: "💻", count: 0 },
            { name: "Backend Development", icon: "⚙️", count: 0 },
            { name: "UI/UX Design", icon: "🎨", count: 0 },
            { name: "Project Management", icon: "📊", count: 0 }
        ];
        for (const cat of categories) {
            await db.collection("categories").add({ ...cat, createdAt: new Date().toISOString() });
        }

        // 2. COMPANIES COLLECTION (Sample)
        console.log("Creating 'companies'...");
        const companyRef = await db.collection("companies").add({
            name: "WorkHub Samples Ltd",
            logo: "https://via.placeholder.com/150",
            contactEmail: "contact@workhub.sample",
            description: "A sample company to demonstrate the platform capabilities.",
            createdAt: new Date().toISOString(),
            status: "active"
        });

        // 3. JOBS COLLECTION (Sample)
        console.log("Creating 'jobs'...");
        await db.collection("jobs").add({
            title: "Senior React Developer",
            companyId: companyRef.id,
            companyName: "WorkHub Samples Ltd",
            category: "Frontend Development",
            location: "Remote / New York",
            salary: "$120k - $150k",
            type: "Full-time",
            description: "We are looking for a Senior React Developer to lead our frontend team...",
            requirements: ["5+ years React experience", "Deep knowledge of Firebase", "Leadership skills"],
            status: "published",
            createdAt: new Date().toISOString()
        });

        // 4. APPLICATIONS COLLECTION
        // (Just a placeholder schema documentation in code, usually created dynamically)
        console.log("Creating 'applications' placeholder...");
        await db.collection("applications").add({
            jobId: "sample_id",
            applicantUid: "sample_uid",
            applicantName: "John Doe",
            cvUrl: "https://example.com/cv.pdf",
            status: "pending",
            appliedAt: new Date().toISOString()
        });

        // 5. SETTINGS COLLECTION
        console.log("Creating 'settings'...");
        await db.collection("settings").doc("site_config").set({
            siteName: "WorkHub Professional",
            maintenanceMode: false,
            allowPublicRegistration: true,
            contactSupportEmail: "support@workhub.com"
        });

        console.log("✅ All collections initialized and seeded with sample data!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error initializing collections:", error);
        process.exit(1);
    }
};

initializeCollections();

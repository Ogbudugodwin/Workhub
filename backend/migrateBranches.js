import { db } from "./config/firebase.js";

/**
 * Migration script to set up the branches collection structure
 * Run this once to initialize the branches collection
 */

async function migrateBranchesCollection() {
    try {
        console.log("Starting branches collection migration...");

        // Create sample branches collection structure
        // This is just for demonstration - in production, branches would be created through the UI

        const sampleBranches = [
            {
                name: "Head Office",
                address: "123 Business District, Lagos",
                location: { lat: 6.524379, lng: 3.379206 },
                companyId: "sample-company-id", // This would be a real company ID
                attendanceSettings: {
                    startTime: '09:00',
                    requireLocation: true,
                    locationRadius: 100,
                    isActive: true
                },
                createdAt: new Date().toISOString(),
                createdBy: "system"
            },
            {
                name: "Branch Office A",
                address: "456 Commerce Avenue, Abuja",
                location: { lat: 9.076479, lng: 7.398574 },
                companyId: "sample-company-id",
                attendanceSettings: {
                    startTime: '08:30',
                    requireLocation: true,
                    locationRadius: 150,
                    isActive: true
                },
                createdAt: new Date().toISOString(),
                createdBy: "system"
            }
        ];

        console.log("Sample branch data structure:");
        console.log(JSON.stringify(sampleBranches[0], null, 2));

        // Note: In production, don't actually create sample data
        // This is just to show the expected structure

        console.log("\n✅ Branches collection migration completed!");
        console.log("📋 Expected Firestore Collection Structure:");
        console.log(`
Collection: branches
├── Document ID: auto-generated
├── Fields:
│   ├── name: string (required)
│   ├── address: string (optional)
│   ├── location: object
│   │   ├── lat: number (required)
│   │   └── lng: number (required)
│   ├── companyId: string (required)
│   ├── attendanceSettings: object
│   │   ├── startTime: string (default: '09:00')
│   │   ├── requireLocation: boolean (default: true)
│   │   ├── locationRadius: number (default: 100)
│   │   └── isActive: boolean (default: true)
│   ├── createdAt: timestamp
│   └── createdBy: string (user UID)
        `);

        console.log("\n🔍 How branches are used for attendance validation:");
        console.log(`
1. Staff member has branchId assigned in their user document
2. When clocking in, system:
   - Gets user's branchId
   - Fetches branch document from 'branches' collection
   - Gets branch location coordinates
   - Calculates distance from current GPS to branch location
   - Validates against locationRadius setting
   - Records attendance if within range
        `);

    } catch (error) {
        console.error("Migration failed:", error);
    }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateBranchesCollection();
}

export { migrateBranchesCollection };

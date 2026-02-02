import express from "express";
import { db, auth } from "../config/firebase.js";
import { checkAuth } from "../middleware/auth.js";

const router = express.Router();

// Ensure User Document Exists (Auto-create for authenticated users)
router.post("/ensure-user", async (req, res) => {
    try {
        const uid = req.headers['x-user-uid'];
        if (!uid) {
            return res.status(401).json({ error: "No UID provided" });
        }

        const userDoc = await db.collection("users").doc(uid).get();

        if (userDoc.exists) {
            const existingData = userDoc.data();
            // Return existing user without modifying - preserves companyId and other settings
            return res.json({
                message: "User document already exists",
                user: { id: userDoc.id, ...existingData }
            });
        }

        // Get user from Firebase Auth
        const userRecord = await auth.getUser(uid);

        // Check if this is the first user (should be super_admin)
        const usersSnapshot = await db.collection("users").limit(1).get();
        const isFirstUser = usersSnapshot.empty;

        // Auto-create user document - default to 'user' role unless first user
        const userData = {
            name: userRecord.displayName || userRecord.email.split('@')[0],
            email: userRecord.email,
            role: isFirstUser ? 'super_admin' : 'user', // Only first user gets super_admin
            companyId: null,
            privileges: [], // Will be populated based on role
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        await db.collection("users").doc(uid).set(userData);

        console.log("Auto-created user document for:", uid, userData);
        res.json({ message: "User document created", user: { id: uid, ...userData } });
    } catch (error) {
        console.error("Error ensuring user document:", error);
        res.status(500).json({ error: "Failed to ensure user document" });
    }
});

// Get User Profile
router.get("/:uid", async (req, res) => {
    try {
        const doc = await db.collection("users").doc(req.params.uid).get();
        if (!doc.exists) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
});

// Get All Users (Restricted based on role)
router.get("/", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const user = req.user;
        let query = db.collection("users");

        // If company_admin, only show users from their company
        if (user.role === 'company_admin') {
            query = query.where("companyId", "==", user.companyId);
        }

        const snapshot = await query.get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

/**
 * Create User (Admin Action)
 * Super Admin can create: company_admin, recruiter, super_admin
 * Company Admin can create: staff (within their company)
 */
router.post("/admin-create", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const adminUser = req.user;
        const {
            email,
            password,
            name,
            role,
            companyId,
            branchId,
            privileges = []
        } = req.body;

        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // --- Role & Privilege Validation ---
        const STAFF_MANAGED_PRIVILEGES = [
            'view_attendance', 'manage_attendance',
            'view_reports', 'manage_reports', 'create_reports',
            'view_leave', 'manage_leave', 'create_leave',
            'view_complaints', 'manage_complaints', 'create_complaints'
        ];

        // 1. Company Admin restrictions
        if (adminUser.role === 'company_admin') {
            // Check if company admin has create_users privilege
            const adminPrivs = adminUser.privileges || [];
            if (!adminPrivs.includes('create_users')) {
                console.warn(`[WARN] Company Admin ${adminUser.uid} denied: Missing 'create_users' privilege.`);
                return res.status(403).json({ error: "Access denied: 'create_users' privilege required." });
            }

            if (role !== 'staff') {
                return res.status(403).json({ error: "Company Admins can only create staff accounts." });
            }
            // Force the companyId to match the admin's company
            req.body.companyId = adminUser.companyId;

            // Security Check: Company Admin can only grant privileges they have
            // EXCEPT for standard staff features which they are naturally authorized to manage for their company.
            if (privileges && privileges.length > 0) {
                const adminPrivileges = adminUser.privileges || [];
                const unauthorizedPrivs = privileges.filter(p =>
                    !adminPrivileges.includes(p) && !STAFF_MANAGED_PRIVILEGES.includes(p)
                );

                if (unauthorizedPrivs.length > 0) {
                    console.warn(`[WARN] Company Admin ${adminUser.uid} tried granting unauthorized management privileges:`, unauthorizedPrivs);
                    return res.status(403).json({
                        error: "Unauthorized: You cannot grant management privileges you do not have.",
                        missingPrivileges: unauthorizedPrivs,
                        adminHas: adminPrivileges
                    });
                }
            }
        }

        // 2. Super Admin creating Company Admin
        if (role === 'company_admin' && !companyId) {
            return res.status(400).json({ error: "Company ID is required for Company Admin role." });
        }

        // --- Firebase Auth User Creation ---
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
        });

        // Handle branch IDs (support both single branchId and array branchIds)
        let branchIds = [];
        if (role === 'staff') {
            if (req.body.branchIds && Array.isArray(req.body.branchIds)) {
                branchIds = req.body.branchIds;
            } else if (req.body.branchId) {
                // Backward compatibility for single branchId
                branchIds = [req.body.branchId];
            }
        }

        // --- Firestore Profile Data ---
        const userData = {
            uid: userRecord.uid, // Explicitly store UID as a field for easy access
            name,
            email,
            role,
            companyId: req.body.companyId || null,
            branchIds: role === 'staff' ? branchIds : [], // Array of branch IDs for staff
            privileges, // Array of strings e.g. ['post_jobs', 'edit_company']
            createdAt: new Date().toISOString(),
            status: 'active',
            createdBy: adminUser.uid
        };

        // Validate branch assignment for staff
        if (role === 'staff' && branchIds.length === 0) {
            return res.status(400).json({ error: "At least one branch assignment is required for staff accounts." });
        }

        // Verify all branches exist and belong to company (for staff accounts)
        if (role === 'staff' && branchIds.length > 0) {
            for (const branchId of branchIds) {
                const branchDoc = await db.collection("branches").doc(branchId).get();
                if (!branchDoc.exists) {
                    return res.status(400).json({ error: `Branch ${branchId} does not exist.` });
                }

                const branchData = branchDoc.data();
                if (adminUser.role === 'company_admin' && branchData.companyId !== adminUser.companyId) {
                    return res.status(403).json({ error: "Cannot assign staff to branch outside your company." });
                }
            }
        }

        await db.collection("users").doc(userRecord.uid).set(userData);

        // If creating a Company Admin, update the company doc with the adminUid
        if (role === 'company_admin' && companyId) {
            try {
                await db.collection("companies").doc(companyId).update({
                    adminUid: userRecord.uid,
                    updatedAt: new Date().toISOString()
                });
                console.log(`Linked Company Admin ${userRecord.uid} to Company ${companyId}`);
            } catch (error) {
                // Log but don't fail the response, as the user is already created
                console.warn("Warning: Failed to link Company Admin to Company document:", companyId, error.message);
            }
        }

        res.status(201).json({
            message: "User account created successfully",
            uid: userRecord.uid,
            ...userData
        });
    } catch (error) {
        console.error("Admin Create User Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update User Metadata (Privileges, Roles, Status)
router.put("/:uid", checkAuth(['super_admin', 'company_admin', 'recruiter', 'staff']), async (req, res) => {
    try {
        const adminUser = req.user;
        const { uid } = req.params;
        const updates = req.body;

        const targetUserDoc = await db.collection("users").doc(uid).get();
        if (!targetUserDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        const targetUserData = targetUserDoc.data();

        // Security Check: Company Admin can only update users in their company
        if (adminUser.role === 'company_admin') {
            if (targetUserData.companyId !== adminUser.companyId) {
                return res.status(403).json({ error: "Unauthorized: User does not belong to your company." });
            }

            // Security Check: Company Admin can only grant privileges they have
            // EXCEPT for standard staff features which they are naturally authorized to manage for their company.
            if (updates.privileges) {
                const adminPrivileges = adminUser.privileges || [];
                const STAFF_MANAGED_PRIVILEGES = [
                    'view_attendance', 'manage_attendance',
                    'view_reports', 'manage_reports', 'create_reports',
                    'view_leave', 'manage_leave', 'create_leave',
                    'view_complaints', 'manage_complaints', 'create_complaints'
                ];

                const unauthorizedPrivs = updates.privileges.filter(p =>
                    !adminPrivileges.includes(p) && !STAFF_MANAGED_PRIVILEGES.includes(p)
                );

                if (unauthorizedPrivs.length > 0) {
                    console.warn(`[WARN] Company Admin ${adminUser.uid} tried granting unauthorized management privileges to user ${uid}:`, unauthorizedPrivs);
                    return res.status(403).json({
                        error: "Unauthorized: You cannot grant management privileges you do not have.",
                        missingPrivileges: unauthorizedPrivs,
                        adminHas: adminPrivileges
                    });
                }
            }
        }

        // Security Check: Recruiters/Staff can only update themselves
        if (adminUser.role === 'recruiter' || adminUser.role === 'staff') {
            if (uid !== adminUser.uid) {
                return res.status(403).json({ error: "Unauthorized: You can only update your own profile." });
            }

            // Prevent updating sensitive fields
            delete updates.role;
            delete updates.companyId;
            delete updates.privileges;
            delete updates.status;
            delete updates.branchId; // Prevent changing branch
        }

        await db.collection("users").doc(uid).update({
            ...updates,
            updatedAt: new Date().toISOString(),
            updatedBy: adminUser.uid
        });

        res.json({ message: "User updated successfully", uid, ...updates });
    } catch (error) {
        res.status(500).json({ error: "Failed to update user" });
    }
});

export default router;

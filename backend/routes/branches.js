import express from "express";
import { db } from "../config/firebase.js";
import { checkAuth } from "../middleware/auth.js";

const router = express.Router();

// GET - Get all branches for a company
router.get("/", checkAuth(['super_admin', 'company_admin', 'staff']), async (req, res) => {
    try {
        const user = req.user;
        console.log("[DEBUG] User fetching branches:", { uid: user.uid, role: user.role, companyId: user.companyId });

        // Privilege check for company admins
        if (user.role === 'company_admin') {
            const privileges = user.privileges || [];
            if (!privileges.includes('view_branches')) {
                console.warn(`[WARN] User ${user.uid} denied access: Missing 'view_branches' privilege.`);
                return res.status(403).json({ error: "Access denied: 'view_branches' privilege required." });
            }
        }

        let query = db.collection("branches");

        // Company admins and staff only see their company's branches
        if (user.role === 'company_admin' || user.role === 'staff') {
            if (!user.companyId) {
                console.warn(`[WARN] ${user.role} has no companyId, returning empty branch list.`);
                return res.json([]);
            }
            query = query.where("companyId", "==", user.companyId);
            console.log(`[DEBUG] ${user.role} query filter:`, user.companyId);
        } else if (user.role === 'super_admin' && req.query.companyId) {
            // Super admin can filter by company
            query = query.where("companyId", "==", req.query.companyId);
            console.log("[DEBUG] Super admin query filter:", req.query.companyId);
        } else {
            console.log("[DEBUG] Super admin fetching all branches (no filter)");
        }

        const snapshot = await query.get();
        const branches = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data
            };
        });

        // Sort in memory to avoid Firestore "Missing Index" errors (Error 500)
        branches.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        console.log("[DEBUG] Branches fetched:", branches.length);

        res.json(branches);
    } catch (error) {
        console.error("Error fetching branches:", error);
        // Helper: Check for missing index error
        if (error.code === 9 || error.message.includes("index")) {
            return res.status(500).json({ error: "Database Index Missing. Please check backend logs." });
        }
        res.status(500).json({ error: "Failed to fetch branches" });
    }
});

// POST - Create a new branch
router.post("/", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const user = req.user;
        const { name, address, location, attendanceSettings } = req.body;

        // Privilege check for company admins
        if (user.role === 'company_admin') {
            const privileges = user.privileges || [];
            if (!privileges.includes('manage_branches')) {
                console.warn(`[WARN] User ${user.uid} denied access: Missing 'manage_branches' privilege.`);
                return res.status(403).json({ error: "Access denied: 'manage_branches' privilege required." });
            }
        }

        if (!name || !location) {
            return res.status(400).json({ error: "Name and location are required" });
        }

        // Determine companyId based on user role
        let companyId;
        if (user.role === 'company_admin') {
            companyId = user.companyId;
            if (!companyId) {
                console.error("Critical: Company Admin has no companyId. User:", user);
                return res.status(500).json({ error: "Your account is not properly linked to a company." });
            }
        } else if (user.role === 'super_admin') {
            companyId = req.body.companyId;
            if (!companyId) {
                return res.status(400).json({ error: "Company ID is required for Super Admin." });
            }
        }

        if (!companyId) {
            return res.status(403).json({ error: "Unauthorized: Role does not support branch creation." });
        }

        const branchData = {
            name,
            address: address || '',
            location, // {lat: number, lng: number}
            companyId,
            attendanceSettings: attendanceSettings || {
                startTime: '09:00',
                requireLocation: true,
                locationRadius: 100, // meters
                isActive: true
            },
            createdAt: new Date().toISOString(),
            createdBy: user.uid
        };

        const docRef = await db.collection("branches").add(branchData);
        res.status(201).json({ id: docRef.id, ...branchData });
    } catch (error) {
        console.error("Error creating branch:", error);
        res.status(500).json({ error: "Failed to create branch" });
    }
});

// PUT - Update branch
router.put("/:id", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const updates = req.body;

        // Privilege check for company admins
        if (user.role === 'company_admin') {
            const privileges = user.privileges || [];
            if (!privileges.includes('manage_branches')) {
                console.warn(`[WARN] User ${user.uid} denied access: Missing 'manage_branches' privilege.`);
                return res.status(403).json({ error: "Access denied: 'manage_branches' privilege required." });
            }
        }

        const branchDoc = await db.collection("branches").doc(id).get();
        if (!branchDoc.exists) {
            return res.status(404).json({ error: "Branch not found" });
        }

        const branchData = branchDoc.data();

        // Check ownership
        if (user.role === 'company_admin' && branchData.companyId !== user.companyId) {
            return res.status(403).json({ error: "Unauthorized: Branch belongs to different company" });
        }

        await db.collection("branches").doc(id).update({
            ...updates,
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid
        });

        res.json({ id, ...updates });
    } catch (error) {
        console.error("Error updating branch:", error);
        res.status(500).json({ error: "Failed to update branch" });
    }
});

// GET - Get single branch
router.get("/:id", checkAuth(['super_admin', 'company_admin', 'staff']), async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const branchDoc = await db.collection("branches").doc(id).get();
        if (!branchDoc.exists) {
            return res.status(404).json({ error: "Branch not found" });
        }

        const branchData = branchDoc.data();

        // Check ownership
        if (user.role === 'company_admin' && branchData.companyId !== user.companyId) {
            return res.status(403).json({ error: "Unauthorized: Branch belongs to different company" });
        }

        // For staff, only allow their own branch
        if (user.role === 'staff' && user.branchId !== id) {
            return res.status(403).json({ error: "Unauthorized: Can only view your own branch" });
        }

        res.json({ id: doc.id, ...branchData });
    } catch (error) {
        console.error("Error fetching branch:", error);
        res.status(500).json({ error: "Failed to fetch branch" });
    }
});

// DELETE - Delete branch
router.delete("/:id", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        // Privilege check for company admins
        if (user.role === 'company_admin') {
            const privileges = user.privileges || [];
            if (!privileges.includes('manage_branches')) {
                console.warn(`[WARN] User ${user.uid} denied access: Missing 'manage_branches' privilege.`);
                return res.status(403).json({ error: "Access denied: 'manage_branches' privilege required." });
            }
        }

        const branchDoc = await db.collection("branches").doc(id).get();
        if (!branchDoc.exists) {
            return res.status(404).json({ error: "Branch not found" });
        }

        const branchData = branchDoc.data();

        // Check ownership
        if (user.role === 'company_admin' && branchData.companyId !== user.companyId) {
            return res.status(403).json({ error: "Unauthorized: Branch belongs to different company" });
        }

        await db.collection("branches").doc(id).delete();
        res.json({ message: "Branch deleted successfully" });
    } catch (error) {
        console.error("Error deleting branch:", error);
        res.status(500).json({ error: "Failed to delete branch" });
    }
});

// POST - Assign user to branch
router.post("/:id/assign-user", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const branchDoc = await db.collection("branches").doc(id).get();
        if (!branchDoc.exists) {
            return res.status(404).json({ error: "Branch not found" });
        }

        const branchData = branchDoc.data();

        // Check ownership
        if (user.role === 'company_admin' && branchData.companyId !== user.companyId) {
            return res.status(403).json({ error: "Unauthorized: Branch belongs to different company" });
        }

        // Update user with branch assignment
        await db.collection("users").doc(userId).update({
            branchId: id,
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid
        });

        res.json({ message: "User assigned to branch successfully" });
    } catch (error) {
        console.error("Error assigning user to branch:", error);
        res.status(500).json({ error: "Failed to assign user to branch" });
    }
});

export default router;

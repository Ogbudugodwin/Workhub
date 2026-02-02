import express from "express";
import { db } from "../config/firebase.js";
import { checkAuth } from "../middleware/auth.js";

const router = express.Router();

// DEBUG - Test route
router.get("/debug", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), (req, res) => {
    res.json({
        message: "Complaints Router is active",
        user: {
            uid: req.user.uid,
            role: req.user.role,
            companyId: req.user.companyId
        }
    });
});

// POST - Submit complaint
router.post("/", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), async (req, res) => {
    try {
        const user = req.user;
        const { title, description, category, priority, anonymous } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: "Title and description are required" });
        }

        // Fetch user's assigned branch to link the complaint
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();

        let branchId = userData?.branchId || (userData?.branchIds?.length > 0 ? userData.branchIds[0] : null);
        let branchName = userData?.branchName || "Main Office / Unassigned";

        if (branchId && !userData?.branchName) {
            const branchDoc = await db.collection("branches").doc(branchId).get();
            if (branchDoc.exists) {
                branchName = branchDoc.data().name;
            }
        }

        const complaintData = {
            userId: anonymous ? null : user.uid,
            userName: anonymous ? 'Anonymous' : (user.name || user.email),
            companyId: user.companyId || null,
            branchId: branchId || null,
            branchName: branchName || "Main Office",
            title,
            description,
            category: category || 'General',
            priority: priority || 'Medium',
            anonymous: anonymous || false,
            submittedAt: new Date().toISOString(),
            status: 'Submitted', // Submitted, Investigating, Resolved, Dismissed
            resolvedBy: null,
            resolvedByAuthor: null,
            resolvedAt: null,
            resolution: null
        };

        const docRef = await db.collection("complaints").add(complaintData);
        console.log(`[Complaints] Created complaint ${docRef.id} for user ${user.uid}`);
        res.status(201).json({ id: docRef.id, ...complaintData });
    } catch (error) {
        console.error("[Complaints] POST Error:", error);
        res.status(500).json({ error: "Failed to submit complaint", details: error.message });
    }
});

// GET - Get complaints
router.get("/", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), async (req, res) => {
    try {
        const user = req.user;
        const { status, category } = req.query;

        const role = (user.role || '').toLowerCase().trim();
        console.log(`[Complaints] GET - User: ${user.uid}, Role: ${role}, Company: "${user.companyId}"`);

        let query = db.collection("complaints");

        // App-level security filtering
        if (role === 'super_admin') {
            console.log("[Complaints] Super Admin: Fetching all");
        } else if (role === 'company_admin') {
            if (!user.companyId) {
                console.warn(`[Complaints] Admin ${user.uid} missing companyId`);
                return res.json([]);
            }
            console.log(`[Complaints] Company Admin: Filtering by companyId: "${user.companyId}"`);
            query = query.where("companyId", "==", user.companyId);
        } else {
            // Staff / Recruiter: Can see their own non-anonymous complaints
            console.log(`[Complaints] Staff/Recruiter: Filtering by userId: ${user.uid}`);
            query = query.where("userId", "==", user.uid);
        }

        const snapshot = await query.get();
        console.log(`[Complaints] Firestore returned ${snapshot.size} records`);

        let complaints = [];
        snapshot.docs.forEach(doc => {
            try {
                const data = doc.data();

                // Normalizing submission date for sorting
                let submittedDate;
                if (data.submittedAt && typeof data.submittedAt.toDate === 'function') {
                    submittedDate = data.submittedAt.toDate();
                } else if (data.submittedAt) {
                    submittedDate = new Date(data.submittedAt);
                } else {
                    submittedDate = new Date(0);
                }

                // Apply in-memory filters (Case-Insensitive)
                if (status && data.status?.toLowerCase() !== status.toLowerCase()) return;
                if (category && data.category?.toLowerCase() !== category.toLowerCase()) return;

                complaints.push({
                    id: doc.id,
                    ...data,
                    _sortDate: isNaN(submittedDate.getTime()) ? 0 : submittedDate.getTime()
                });
            } catch (docErr) {
                console.warn(`[Complaints] Error processing doc ${doc.id}:`, docErr);
            }
        });

        // In-memory sort by submitted date desc
        complaints.sort((a, b) => b._sortDate - a._sortDate);

        // Remove sort field before sending
        const cleanComplaints = complaints.map(({ _sortDate, ...rest }) => rest);

        console.log(`[Complaints] Returning ${cleanComplaints.length} results to user`);
        res.json(cleanComplaints);
    } catch (error) {
        console.error("[Complaints] GET FAIL:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// PATCH - Update complaint status (admin only)
router.patch("/:id/status", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolution } = req.body;
        const user = req.user;

        const allowedStatuses = ['Submitted', 'Investigating', 'Resolved', 'Dismissed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const updateData = {
            status,
            resolvedBy: user.uid,
            resolvedByAuthor: user.name || user.email,
            resolvedAt: new Date().toISOString()
        };

        if (resolution) {
            updateData.resolution = resolution;
        }

        await db.collection("complaints").doc(id).update(updateData);
        console.log(`[Complaints] Updated status of ${id} to ${status} by ${user.uid}`);
        res.json({ message: `Complaint ${status} successfully` });
    } catch (error) {
        console.error("[Complaints] PATCH Error:", error);
        res.status(500).json({ error: "Failed to update complaint status" });
    }
});

export default router;

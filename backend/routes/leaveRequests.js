import express from "express";
import { db } from "../config/firebase.js";
import { checkAuth } from "../middleware/auth.js";

const router = express.Router();

// DEBUG - Test route
router.get("/debug", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), (req, res) => {
    res.json({
        message: "Leave Requests Router is active",
        user: {
            uid: req.user.uid,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            companyId: req.user.companyId
        }
    });
});

// POST - Submit leave request
router.post("/", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), async (req, res) => {
    try {
        const user = req.user;
        const { leaveType, startDate, endDate, reason, emergencyContact } = req.body;

        if (!leaveType || !startDate || !endDate || !reason) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Fetch user's assigned branch to link the request
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

        const requestData = {
            userId: user.uid,
            userName: user.name || user.email,
            companyId: user.companyId || null,
            branchId: branchId || null,
            branchName: branchName || "Main Office",
            leaveType,
            startDate,
            endDate,
            reason,
            emergencyContact: emergencyContact || null,
            submittedAt: new Date().toISOString(),
            status: 'pending',
            daysRequested: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1,
            approvedBy: null,
            approvedByAuthor: null,
            approvedAt: null,
            comments: null
        };

        const docRef = await db.collection("leave_requests").add(requestData);
        res.status(201).json({ id: docRef.id, ...requestData });
    } catch (error) {
        console.error("Error submitting leave request:", error);
        res.status(500).json({ error: "Failed to submit leave request", details: error.message });
    }
});

// GET - Get leave requests
router.get("/", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), async (req, res) => {
    try {
        const user = req.user;
        const { status } = req.query;

        console.log(`[LeaveRequests] GET - User: ${user.uid}, Role: ${user.role}, Company: ${user.companyId}`);

        const role = (user.role || '').toLowerCase().trim();
        let query = db.collection("leave_requests");

        // App-level security filtering
        if (role === 'super_admin') {
            // No base filter
        } else if (role === 'company_admin') {
            if (!user.companyId) {
                console.warn(`[LeaveRequests] Admin ${user.uid} missing companyId`);
                return res.json([]);
            }
            query = query.where("companyId", "==", user.companyId);
        } else {
            // Staff / Recruiter
            query = query.where("userId", "==", user.uid);
        }

        const snapshot = await query.get();
        console.log(`[LeaveRequests] Found ${snapshot.size} raw documents`);

        let requests = [];
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

                // Apply status filter in memory to avoid index requirements if combined with where
                if (status && data.status !== status) return;

                requests.push({
                    id: doc.id,
                    ...data,
                    _sortDate: isNaN(submittedDate.getTime()) ? 0 : submittedDate.getTime()
                });
            } catch (docErr) {
                console.warn(`[LeaveRequests] Error processing doc ${doc.id}:`, docErr);
            }
        });

        // In-memory sort by submitted date desc
        requests.sort((a, b) => b._sortDate - a._sortDate);

        // Remove sort field before sending
        const cleanRequests = requests.map(({ _sortDate, ...rest }) => rest);

        console.log(`[LeaveRequests] Returning ${cleanRequests.length} processed requests`);
        res.json(cleanRequests);
    } catch (error) {
        console.error("[LeaveRequests] FAIL:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// PATCH - Status Update
router.patch("/:id/status", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, comments } = req.body;
        const user = req.user;

        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const updateData = {
            status,
            approvedBy: user.uid,
            approvedByAuthor: user.name || user.email,
            approvedAt: new Date().toISOString(),
            comments: comments || null
        };

        await db.collection("leave_requests").doc(id).update(updateData);
        res.json({ message: `Leave request ${status} successfully` });
    } catch (error) {
        console.error("Error updating leave request:", error);
        res.status(500).json({ error: "Failed to update leave request" });
    }
});

export default router;

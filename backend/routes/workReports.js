import express from "express";
import { db } from "../config/firebase.js";
import { checkAuth } from "../middleware/auth.js";

const router = express.Router();

// DEBUG - Test route
router.get("/debug", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), (req, res) => {
    res.json({
        message: "Work Reports Router is active",
        user: {
            uid: req.user.uid,
            role: req.user.role,
            companyId: req.user.companyId
        }
    });
});

// POST - Submit work report
router.post("/", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), async (req, res) => {
    try {
        const user = req.user;
        const { title, description, date } = req.body;

        // Fetch user's assigned branch to link the report
        const userDoc = await db.collection("users").doc(user.uid).get();
        const userData = userDoc.data();

        // For simplicity, we take the primary branch or first in list if available
        let branchId = userData?.branchId || (userData?.branchIds?.length > 0 ? userData.branchIds[0] : null);
        let branchName = "Main Office / Unassigned";

        if (branchId) {
            const branchDoc = await db.collection("branches").doc(branchId).get();
            if (branchDoc.exists) {
                branchName = branchDoc.data().name;
            }
        }

        const reportData = {
            userId: user.uid,
            userName: user.name || user.email,
            companyId: user.companyId,
            branchId,
            branchName,
            title,
            description,
            date: date || new Date().toISOString().split('T')[0],
            submittedAt: new Date().toISOString(),
            status: 'submitted'
        };

        const docRef = await db.collection("work_reports").add(reportData);
        res.status(201).json({ id: docRef.id, ...reportData });
    } catch (error) {
        console.error("Error submitting work report:", error);
        res.status(500).json({ error: "Failed to submit work report" });
    }
});

// GET - Get work reports
router.get("/", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), async (req, res) => {
    try {
        const user = req.user;
        const { userId, date, status } = req.query;

        console.log(`[WorkReports] Fetching reports - User: ${user.uid}, Role: ${user.role}, Company: ${user.companyId}`);

        const role = user.role ? user.role.toLowerCase() : '';
        console.log(`[WorkReports] Fetching reports - User: ${user.uid}, Role: ${role}, Company: ${user.companyId}`);

        let query = db.collection("work_reports");

        // App-level security filtering
        if (role === 'super_admin') {
            // Full access
            console.log("[WorkReports] Super Admin access granted");
        } else if (role === 'company_admin') {
            if (!user.companyId) {
                console.warn(`[WorkReports] Admin missing companyId: ${user.uid}`);
                return res.json([]);
            }
            console.log(`[WorkReports] Company Admin filter: companyId == ${user.companyId}`);
            query = query.where("companyId", "==", user.companyId);
        } else if (role === 'staff' || role === 'recruiter') {
            console.log(`[WorkReports] Staff/Recruiter filter: userId == ${user.uid}`);
            query = query.where("userId", "==", user.uid);
        } else {
            console.warn(`[WorkReports] Unknown role: ${role}. Access denied.`);
            return res.status(403).json({ error: "Access Denied", message: "Role not recognized for this module." });
        }

        // Additional query param filtering
        if (userId && (role === 'super_admin' || role === 'company_admin')) {
            query = query.where("userId", "==", userId);
        }
        if (status) query = query.where("status", "==", status);
        if (date) query = query.where("date", "==", date);

        let snapshot;
        try {
            console.log(`[WorkReports] Executing Firestore query...`);
            snapshot = await query.get();
            console.log(`[WorkReports] Query successful. size: ${snapshot.size}`);
        } catch (dbError) {
            console.error("[WorkReports] Firestore Query Error:", dbError);
            return res.status(500).json({
                error: "Firestore Query Failed",
                message: "A database error occurred during the specific query execution.",
                details: dbError.message
            });
        }

        let reports = snapshot.docs.map(doc => {
            try {
                const data = doc.data();
                // Normalize dates
                let submittedDate;
                if (data.submittedAt && typeof data.submittedAt.toDate === 'function') {
                    submittedDate = data.submittedAt.toDate();
                } else if (data.submittedAt) {
                    submittedDate = new Date(data.submittedAt);
                } else {
                    submittedDate = new Date(0);
                }

                return {
                    id: doc.id,
                    ...data,
                    _sortDate: isNaN(submittedDate.getTime()) ? 0 : submittedDate.getTime()
                };
            } catch (mapErr) {
                console.error("[WorkReports] Error mapping document:", doc.id, mapErr);
                return null;
            }
        }).filter(r => r !== null);

        // Sort by derived timestamp
        reports.sort((a, b) => b._sortDate - a._sortDate);

        // Remove sort field
        const cleanReports = reports.map(({ _sortDate, ...rest }) => rest);

        console.log(`[WorkReports] Returning ${cleanReports.length} reports`);
        res.json(cleanReports);
    } catch (error) {
        console.error("[WorkReports] FATAL OUTER ERROR:", error);
        res.status(500).json({
            error: "Internal Server Error",
            message: "A fatal error occurred outside the query phase.",
            details: error.message
        });
    }
});

// PATCH - Update report status (admin only)
router.patch("/:id/status", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, feedback } = req.body;

        if (!['submitted', 'reviewed', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const updateData = {
            status,
            reviewedAt: new Date().toISOString()
        };

        if (feedback) {
            updateData.feedback = feedback;
        }

        await db.collection("work_reports").doc(id).update(updateData);
        res.json({ message: `Report ${status} successfully` });
    } catch (error) {
        console.error("Error updating report status:", error);
        res.status(500).json({ error: "Failed to update report status" });
    }
});

export default router;

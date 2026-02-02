import express from "express";
import { db } from "../config/firebase.js";
import { checkAuth } from "../middleware/auth.js";

const router = express.Router();

// POST - Clock in
router.post("/clock-in", checkAuth(['super_admin', 'company_admin', 'staff'], 'manage_attendance'), async (req, res) => {
    try {
        const user = req.user;
        const { location, notes, branchId: requestedBranchId } = req.body;

        // Check if already clocked in today
        const today = new Date().toISOString().split('T')[0];
        const existing = await db.collection("attendance")
            .where("userId", "==", user.uid)
            .where("date", "==", today)
            .where("clockOut", "==", null)
            .get();

        if (!existing.empty) {
            return res.status(400).json({ error: "Already clocked in today" });
        }

        // --- Branch Validation & Settings ---
        let branchSettings = {};
        let branchLocation = null;
        let resolvedCompanyId = user.companyId;
        let resolvedBranchId = requestedBranchId;
        let resolvedBranchName = "Main Office";

        // Determine which branch to use for validation
        const userBranchIds = user.branchIds || (user.branchId ? [user.branchId] : []);

        if (resolvedBranchId) {
            // Validate that user is allowed to clock in at this branch
            if (user.role === 'staff' && !userBranchIds.includes(resolvedBranchId)) {
                return res.status(403).json({ error: "You are not assigned to this branch." });
            }

            const branchDoc = await db.collection("branches").doc(resolvedBranchId).get();
            if (branchDoc.exists) {
                const branchData = branchDoc.data();
                branchSettings = branchData.attendanceSettings || {};
                branchLocation = branchData.location;
                resolvedBranchName = branchData.name;

                if (!resolvedCompanyId && branchData.companyId) {
                    resolvedCompanyId = branchData.companyId;
                }
            } else {
                return res.status(404).json({ error: "Selected branch no longer exists." });
            }
        } else if (userBranchIds.length === 1) {
            // Auto-fallback if staff has only one branch
            resolvedBranchId = userBranchIds[0];
            const branchDoc = await db.collection("branches").doc(resolvedBranchId).get();
            if (branchDoc.exists) {
                const branchData = branchDoc.data();
                branchSettings = branchData.attendanceSettings || {};
                branchLocation = branchData.location;
                resolvedBranchName = branchData.name;
                if (!resolvedCompanyId && branchData.companyId) resolvedCompanyId = branchData.companyId;
            }
        } else if (user.companyId) {
            // Fallback to company level settings
            const companyDoc = await db.collection("companies").doc(user.companyId).get();
            if (companyDoc.exists) {
                const companyData = companyDoc.data();
                branchSettings = companyData.attendanceSettings || {};
                branchLocation = branchSettings.location || branchSettings.approvedLocation;
            }
        }

        // --- Location Validation ---
        if (!branchLocation) {
            branchLocation = branchSettings.location || branchSettings.approvedLocation;
        }

        if (branchSettings.requireLocation && branchLocation) {
            if (!location) {
                return res.status(400).json({ error: "Location is required for clock-in at this branch." });
            }

            // Haversine formula to calculate distance
            const R = 6371e3; // meters
            const φ1 = branchLocation.lat * Math.PI / 180;
            const φ2 = location.lat * Math.PI / 180;
            const Δφ = (location.lat - branchLocation.lat) * Math.PI / 180;
            const Δλ = (location.lng - branchLocation.lng) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            const distance = R * c;
            const allowedRadius = branchSettings.locationRadius || 100;

            if (distance > allowedRadius) {
                return res.status(400).json({
                    error: `Out of Range: You are ${Math.round(distance)}m away. Required: ${allowedRadius}m.`,
                    distance: Math.round(distance),
                    allowedRadius
                });
            }
        }

        // --- Late Check ---
        let isLate = false;
        let lateReason = null;

        if (branchSettings.startTime && branchSettings.isActive) {
            const currentTime = new Date();
            const [hours, minutes] = branchSettings.startTime.split(':');
            const startTime = new Date();
            startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            if (currentTime > startTime) {
                isLate = true;
                if (!notes) {
                    return res.status(400).json({
                        error: "You are clocking in late. Please provide a reason in the notes.",
                        requiresLateReason: true
                    });
                }
                lateReason = notes;
            }
        }

        const attendanceData = {
            userId: user.uid,
            userName: user.name || user.email,
            companyId: resolvedCompanyId || null,
            branchId: resolvedBranchId || null,
            branchName: resolvedBranchName,
            date: today,
            clockIn: new Date().toISOString(),
            clockOut: null,
            location: location || null,
            notes: notes || null,
            status: 'active',
            isLate: isLate,
            lateReason: lateReason,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection("attendance").add(attendanceData);
        console.log(`[DEBUG] Clock-in successful: ${user.uid} at ${resolvedBranchName}`);
        res.status(201).json({ id: docRef.id, ...attendanceData });
    } catch (error) {
        console.error("Error clocking in:", error);
        res.status(500).json({ error: "Failed to clock in. " + error.message });
    }
});

// POST - Clock out
router.post("/clock-out", checkAuth([], 'manage_attendance'), async (req, res) => {
    try {
        const user = req.user;
        const { notes } = req.body;

        const today = new Date().toISOString().split('T')[0];
        const snapshot = await db.collection("attendance")
            .where("userId", "==", user.uid)
            .where("date", "==", today)
            .where("clockOut", "==", null)
            .get();

        if (snapshot.empty) {
            return res.status(400).json({ error: "Not clocked in today" });
        }

        const doc = snapshot.docs[0];
        const attendanceData = doc.data();
        const clockOutTime = new Date().toISOString();

        // Calculate hours worked
        const clockInTime = new Date(attendanceData.clockIn);
        const clockOut = new Date(clockOutTime);
        const hoursWorked = (clockOut - clockInTime) / (1000 * 60 * 60);

        await db.collection("attendance").doc(doc.id).update({
            clockOut: clockOutTime,
            hoursWorked: Math.round(hoursWorked * 100) / 100,
            notes: notes ? attendanceData.notes + "\nClock out: " + notes : attendanceData.notes,
            status: 'completed'
        });

        res.json({ message: "Clocked out successfully", hoursWorked: Math.round(hoursWorked * 100) / 100 });
    } catch (error) {
        console.error("Error clocking out:", error);
        res.status(500).json({ error: "Failed to clock out" });
    }
});

// GET - Get attendance records
router.get("/", checkAuth([], 'view_attendance'), async (req, res) => {
    try {
        const user = req.user;
        console.log("[DEBUG] User fetching attendance:", { uid: user.uid, role: user.role, companyId: user.companyId, type: typeof user.companyId });
        const { userId, date } = req.query;

        let query = db.collection("attendance");

        if (user.role === 'super_admin') {
            // Super admin sees all records
            console.log("[DEBUG] Super admin fetching all attendance (no filter)");
        } else if (user.role === 'company_admin') {
            if (!user.companyId) {
                console.warn("[WARN] Company Admin has no companyId, returning empty attendance list.");
                return res.json([]);
            }
            query = query.where("companyId", "==", user.companyId);
            console.log("[DEBUG] Company admin query filter:", user.companyId);
        } else {
            // Staff and Recruiters can only see their own attendance
            query = query.where("userId", "==", user.uid);
            console.log("[DEBUG] Staff/Recruiter fetching own attendance");
        }

        if (userId) {
            query = query.where("userId", "==", userId);
        }

        if (date) {
            query = query.where("date", "==", date);
        }

        const snapshot = await query.get();
        const attendance = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data
            };
        });

        // Sort in memory to avoid Firestore "Missing Index" errors (Error 500)
        attendance.sort((a, b) => {
            const dateA = new Date(a.clockIn || 0);
            const dateB = new Date(b.clockIn || 0);
            return dateB - dateA; // Descending
        });

        console.log("[DEBUG] Attendance fetched:", attendance.length);
        res.json(attendance);
    } catch (error) {
        console.error("Error fetching attendance:", error);
        // Check for missing index error
        if (error.code === 9 || error.message.includes("index")) {
            return res.status(500).json({ error: "Database Index Missing. Please check backend logs." });
        }
        res.status(500).json({ error: "Failed to fetch attendance" });
    }
});

// GET - Get current user's attendance status
router.get("/status", checkAuth(['super_admin', 'company_admin', 'staff']), async (req, res) => {
    try {
        const user = req.user;
        const today = new Date().toISOString().split('T')[0];

        const snapshot = await db.collection("attendance")
            .where("userId", "==", user.uid)
            .where("date", "==", today)
            .orderBy("clockIn", "desc")
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.json({ status: 'not_clocked_in' });
        }

        const attendance = snapshot.docs[0].data();
        res.json({
            status: attendance.clockOut ? 'clocked_out' : 'clocked_in',
            attendance: { id: snapshot.docs[0].id, ...attendance }
        });
    } catch (error) {
        console.error("Error fetching attendance status:", error);
        res.status(500).json({ error: "Failed to fetch attendance status" });
    }
});

// POST - Set company attendance settings (Company Admin only)
router.post("/settings", checkAuth(['company_admin']), async (req, res) => {
    try {
        const user = req.user;
        const { startTime, approvedLocation, requireLocation } = req.body;

        if (!user.companyId) {
            return res.status(400).json({ error: "User is not associated with a company" });
        }

        const attendanceSettings = {
            startTime: startTime || null, // Format: "HH:MM" (24-hour)
            approvedLocation: approvedLocation || null, // Location coordinates or address
            requireLocation: requireLocation || false,
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid
        };

        await db.collection("companies").doc(user.companyId).update({
            attendanceSettings: attendanceSettings
        });

        res.json({ message: "Attendance settings updated successfully", settings: attendanceSettings });
    } catch (error) {
        console.error("Error updating attendance settings:", error);
        res.status(500).json({ error: "Failed to update attendance settings" });
    }
});

// GET - Get company attendance settings
router.get("/settings", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const user = req.user;
        let companyId = user.companyId;

        // Super admin can specify company ID
        if (user.role === 'super_admin' && req.query.companyId) {
            companyId = req.query.companyId;
        }

        if (!companyId) {
            return res.json({ attendanceSettings: {} });
        }

        const companyDoc = await db.collection("companies").doc(companyId).get();
        const attendanceSettings = companyDoc.exists ?
            (companyDoc.data().attendanceSettings || {}) : {};

        res.json({ attendanceSettings });
    } catch (error) {
        console.error("Error fetching attendance settings:", error);
        res.status(500).json({ error: "Failed to fetch attendance settings" });
    }
});

export default router;

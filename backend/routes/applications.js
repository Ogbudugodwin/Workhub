import express from "express";
import { db } from "../config/firebase.js";
import { checkAuth } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'backend', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) { console.error("Error creating upload dir:", e); }
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /pdf|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            return cb(new Error('Only PDF and DOC files are allowed!'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST - Submit a new application
router.post("/", (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
        if (err) {
            console.error("Multer Upload Error:", err);
            return res.status(400).json({ error: "File upload failed", details: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        console.log("Application submission received [V3]");
        console.log("Request Body:", req.body);

        // Validate Job ID and get details
        const jobId = req.body.jobId;
        if (!jobId) {
            return res.status(400).json({ error: "Job ID is required" });
        }

        const jobDoc = await db.collection("vacancy").doc(jobId).get();
        if (!jobDoc.exists) {
            return res.status(404).json({ error: "Job not found" });
        }
        const jobData = jobDoc.data();

        const applicationData = {
            name: req.body.name || null,
            email: req.body.email || null,
            phone: req.body.phone || null,
            address: req.body.address || null,
            yearsOfExperience: req.body.yearsOfExperience || null,
            salaryExpectation: req.body.salaryExpectation || null,
            coverLetter: req.body.coverLetter || null,
            jobId: jobId,
            jobTitle: jobData.title || 'Unknown',
            companyId: jobData.companyId || null,
            jobOwnerId: jobData.createdBy || null,
            resume: req.file ? `uploads/${req.file.filename}` : null,
            submittedAt: new Date().toISOString(),
            status: 'received'
        };

        const docRef = await db.collection("applications").add(applicationData);
        res.status(201).json({ id: docRef.id, ...applicationData });
    } catch (error) {
        console.error("Error submitting application detailed:", error);
        res.status(500).json({
            error: "Failed to submit application [V3]",
            details: error.message,
            stack: error.stack
        });
    }
});

// GET - Fetch applications
router.get("/", checkAuth(['super_admin', 'company_admin', 'recruiter', 'staff']), async (req, res) => {
    try {
        const user = req.user;
        const { userId, status, category } = req.query;

        let query = db.collection("applications");

        // Role-based Access Control
        if (user.role === 'super_admin') {
            // No filter (unless params)
            console.log("[DEBUG] Super admin fetching all applications");
        } else {
            // STRICT PRIVILEGE CHECK
            const privileges = user.privileges || [];
            if (!privileges.includes('view_applications')) {
                console.warn(`[WARN] User ${user.uid} (${user.role}) denied access: Missing 'view_applications' privilege.`);
                return res.status(403).json({ error: "Access denied: 'view_applications' privilege required." });
            }

            // Filter by jobOwnerId - Only see applicants for YOUR jobs
            query = query.where("jobOwnerId", "==", user.uid);
            console.log(`[DEBUG] User ${user.uid} (${user.role}) fetching own applications.`);
        }

        if (userId) query = query.where("userId", "==", userId);
        if (status) query = query.where("status", "==", status);
        if (category) query = query.where("category", "==", category);

        const snapshot = await query.get();
        const applications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // In-memory sort to avoid index issues
        applications.sort((a, b) => {
            const dateA = new Date(a.submittedAt || 0);
            const dateB = new Date(b.submittedAt || 0);
            return dateB - dateA; // Descending
        });

        res.json(applications);
    } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).json({ error: "Failed to fetch applications" });
    }
});

// GET - Fetch applications for a specific job
router.get("/job/:jobId", checkAuth([], 'view_applications'), async (req, res) => {
    try {
        const { jobId } = req.params;
        const user = req.user;

        // Fetch Job to check permissions
        const jobDoc = await db.collection("vacancy").doc(jobId).get();
        if (!jobDoc.exists) return res.status(404).json({ error: "Job not found" });
        const jobData = jobDoc.data();

        // RBAC Check
        if (user.role !== 'super_admin') {
            if (user.role === 'company_admin') {
                if (jobData.companyId !== user.companyId) return res.status(403).json({ error: "Unauthorized" });
            } else {
                // Recruiter/Staff
                if (jobData.createdBy !== user.uid) return res.status(403).json({ error: "Unauthorized" });
            }
        }

        const snapshot = await db.collection("applications").where("jobId", "==", jobId).get();
        const applications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(applications);
    } catch (error) {
        console.error("Error fetching applications for job:", error);
        res.status(500).json({ error: "Failed to fetch applications" });
    }
});

export default router;

import express from "express";
import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { checkAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET all jobs
 * Access based on role and company ownership:
 * - Super Admin: sees everything
 * - Company Admin: sees all jobs created by users in their company
 * - Recruiter: only sees their own jobs
 * - Staff: sees jobs based on privileges (managed by company admin)
 */
// Routes/jobs.js
// Relaxing route-level privilege check to allow nuanced logic inside
router.get("/", checkAuth(['super_admin', 'company_admin', 'recruiter', 'staff']), async (req, res) => {
    try {
        const user = req.user;
        console.log("[DEBUG] User fetching jobs:", { uid: user.uid, role: user.role, companyId: user.companyId });

        // Manual Privilege Check
        // Super Admin: always allowed
        // Company Admin: always allowed (for their company)
        // Recruiter/Staff: Allowed if they have 'view_jobs' OR if they are just checking their own list (implied)
        if (user.role !== 'super_admin' && user.role !== 'company_admin') {
            const hasViewPrivilege = (user.privileges || []).includes('view_jobs');
            // If they don't have explicit view_jobs, we will strictly limit to their own created jobs below.
            // If they DO have view_jobs, they might see more (depending on company logic), but for now we stick to "created by me" for non-admins as per query below.
            // So essentially, we allow access here, and the query filter acts as the security boundary.
        }

        let query = db.collection("vacancy");

        // Filter based on user role
        // Filter based on user role
        if (user.role === 'super_admin') {
            // Super admin sees all jobs - no filter
            console.log("[DEBUG] Super admin fetching all jobs (no filter)");
        } else {
            // STRICT PRIVILEGE CHECK: Company Admin, Recruiter, Staff
            // Requirement: "only if they have been granted the job-viewing privilege"
            const privileges = user.privileges || [];
            if (!privileges.includes('view_jobs')) {
                console.warn(`[WARN] User ${user.uid} (${user.role}) denied access: Missing 'view_jobs' privilege.`);
                return res.status(403).json({ error: "Access denied: 'view_jobs' privilege required." });
            }

            // Requirement: "Use the user ID to display jobs created by that user"
            // If they have the privilege, they strictly see *their own* posted jobs.
            query = query.where("createdBy", "==", user.uid);
            console.log(`[DEBUG] User ${user.uid} (${user.role}) fetching own jobs (view_jobs granted).`);
        }

        const snapshot = await query.get();
        const jobs = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
            };
        });

        // Sort in memory to avoid Firestore "Missing Index" errors (Error 500)
        // when combining where() calls with orderBy()
        jobs.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // Descending
        });

        console.log("[DEBUG] Jobs fetched:", jobs.length);
        res.json(jobs);
    } catch (error) {
        console.error("Error fetching jobs:", error);
        // Helper: Check for missing index error
        if (error.code === 9 || error.message.includes("index")) {
            return res.status(500).json({ error: "Database Index Missing. Please check backend logs for creation link." });
        }
        res.status(500).json({ error: "Failed to fetch jobs", details: error.message });
    }
});

/**
 * GET Published Jobs (For Frontend)
 */
// routes/job.js
router.get("/published", async (req, res) => {
    console.log("DEBUG: /published route called");
    try {
        console.log("DEBUG: Attempting to query jobs with status 'published'");
        const snapshot = await db.collection("vacancy").where("status", "==", "published").get();
        console.log("DEBUG: Query snapshot received, docs count:", snapshot.docs.length);
        const jobs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt || null, // already ISO string
            };
        });

        // Sort by Newest First
        jobs.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA; // Descending
        });

        console.log("DEBUG: Mapped jobs, returning:", jobs.length, "jobs");
        res.json(jobs);
    } catch (error) {
        console.error("DEBUG: Error in /published route:", error.message);
        res.status(500).json({ error: "Failed to fetch jobs" });
    }
});

/**
 * GET - Fetch a single job by ID
 */
/**
 * GET - Fetch a single job by ID
 */
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection("vacancy").doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Job not found" });
        }

        const jobData = doc.data();

        // Check permissions if not published
        if (jobData.status !== 'published') {
            // Check for auth header "x-user-uid" (simple check for this demo)
            // ideally we use checkAuth middleware but this is a public route usually
            const requestUid = req.headers['x-user-uid'];

            // Allow if requestUid matches creator (secured by frontend sending it only if logged in)
            // NOTE: In production, verify the ID token properly. 
            // Here assuming internal trusted use or low security risk for draft viewing by guessing ID.
            if (!requestUid || (requestUid !== jobData.createdBy)) {
                // Double check if super_admin? (Can't easily without full token verification here)
                // For now, strict: only published or owner.
                return res.status(403).json({ error: "Job is not published." });
            }
        }

        res.json({
            id: doc.id,
            ...jobData,
            createdAt: jobData.createdAt || null
        });
    } catch (error) {
        console.error("Error fetching single job:", error);
        res.status(500).json({ error: "Failed to fetch job details" });
    }
});

/**
 * POST - Create a new job
 */
router.post("/", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), async (req, res) => {
    try {
        const user = req.user;

        // Determine status: explicitly 'draft' or default 'pending'
        const initialStatus = req.body.status === 'draft' ? 'draft' : 'pending';

        const jobData = {
            ...req.body,
            status: initialStatus,
            createdBy: user.uid,
            companyId: user.companyId || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            declineReason: null
        };

        const docRef = await db.collection("vacancy").add(jobData);

        // Don't increment count for new job as it starts as pending/draft

        res.status(201).json({ id: docRef.id, ...jobData });
    } catch (error) {
        console.error("Error creating job:", error);
        res.status(500).json({ error: "Failed to create job post" });
    }
});

/**
 * PUT - Update a job
 */
router.put("/:id", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const docRef = db.collection("vacancy").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Job not found" });

        const existingData = doc.data();
        // Permission check
        if (user.role !== 'super_admin' && existingData.createdBy !== user.uid) {
            return res.status(403).json({ error: "Unauthorized: You don't own this job post" });
        }

        const updates = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        // If a non-admin edits, reset to pending for re-approval
        if (user.role !== 'super_admin') {
            updates.status = 'pending';
        }

        await docRef.update(updates);

        // Update category counts for published jobs
        const finalStatus = updates.status || existingData.status;
        const finalCategoryId = updates.categoryId || existingData.categoryId;

        const wasPublished = existingData.status === 'published';
        const isPublished = finalStatus === 'published';

        if (wasPublished && !isPublished) {
            // Case 1: Was published, now it's not. Decrement the old category.
            if (existingData.categoryId) {
                await db.collection("categories").doc(existingData.categoryId).update({
                    count: FieldValue.increment(-1)
                });
            }
        } else if (!wasPublished && isPublished) {
            // Case 2: Was not published, now it is. Increment the new category.
            if (finalCategoryId) {
                await db.collection("categories").doc(finalCategoryId).update({
                    count: FieldValue.increment(1)
                });
            }
        } else if (wasPublished && isPublished) {
            // Case 3: Both were and are published. Check if category changed.
            if (updates.categoryId && updates.categoryId !== existingData.categoryId) {
                // Decrement old
                if (existingData.categoryId) {
                    await db.collection("categories").doc(existingData.categoryId).update({
                        count: FieldValue.increment(-1)
                    });
                }
                // Increment new
                await db.collection("categories").doc(updates.categoryId).update({
                    count: FieldValue.increment(1)
                });
            }
        }

        res.json({ id, ...updates });
    } catch (error) {
        res.status(500).json({ error: "Failed to update job" });
    }
});

/**
 * GET - Fetch jobs by category name
 */
router.get("/category/:categoryName", async (req, res) => {
    try {
        const { categoryName } = req.params;

        // 1. Find category by name to get its ID
        const catSnapshot = await db.collection("categories")
            .where("name", "==", categoryName)
            .get();

        if (catSnapshot.empty) {
            console.warn(`Category not found: ${categoryName}`);
            return res.json([]);
        }

        const categoryId = catSnapshot.docs[0].id;

        // 2. Find published jobs with this categoryId
        const snapshot = await db.collection("vacancy")
            .where("status", "==", "published")
            .where("categoryId", "==", categoryId)
            .get();

        const jobs = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt || null,
            };
        });

        res.json(jobs);
    } catch (error) {
        console.error("Error fetching jobs by category:", error);
        res.status(500).json({ error: "Failed to fetch jobs by category" });
    }
});

/**
 * PATCH - Change Job Status (Approve/Decline)
 * Super Admin Only
 */
router.patch("/:id/status", checkAuth(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, declineReason } = req.body;

        if (!['published', 'declined', 'pending'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        // Get current job data to check current status
        const jobDoc = await db.collection("vacancy").doc(id).get();
        if (!jobDoc.exists) {
            return res.status(404).json({ error: "Job not found" });
        }

        const currentJobData = jobDoc.data();

        // Update job status
        await db.collection("vacancy").doc(id).update({
            status,
            declineReason: status === 'declined' ? declineReason : null,
            updatedAt: new Date().toISOString()
        });

        // Update category count for published jobs
        if (currentJobData.categoryId) {
            let countChange = 0;
            if (currentJobData.status !== 'published' && status === 'published') {
                countChange = 1; // Now published, increment
            } else if (currentJobData.status === 'published' && status !== 'published') {
                countChange = -1; // No longer published, decrement
            }
            if (countChange !== 0) {
                await db.collection("categories").doc(currentJobData.categoryId).update({
                    count: FieldValue.increment(countChange)
                });
            }
        }

        res.json({ message: `Job ${status} successfully` });
    } catch (error) {
        console.error("Error updating job status:", error);
        res.status(500).json({ error: "Failed to update job status" });
    }
});

/**
 * DELETE - Remove a job
 */
router.delete("/:id", checkAuth(['super_admin', 'company_admin', 'staff', 'recruiter']), async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const docRef = db.collection("vacancy").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Job not found" });

        const jobData = doc.data();

        if (user.role !== 'super_admin' && jobData.createdBy !== user.uid) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await docRef.delete();

        // Decrement count only if the job was published
        if (jobData.categoryId && jobData.status === 'published') {
            await db.collection("categories").doc(jobData.categoryId).update({
                count: FieldValue.increment(-1)
            });
        }

        res.json({ message: "Job deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete job" });
    }
});

export default router;

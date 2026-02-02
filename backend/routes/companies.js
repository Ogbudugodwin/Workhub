import express from "express";
import { db } from "../config/firebase.js";
import { checkAuth } from "../middleware/auth.js";

const router = express.Router();

// Get all companies (Super Admin only)
router.get("/", checkAuth(['super_admin']), async (req, res) => {
    try {
        const snapshot = await db.collection("companies").get();
        const companies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(companies);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch companies" });
    }
});

// Create a new company (Super Admin only)
router.post("/", checkAuth(['super_admin']), async (req, res) => {
    try {
        const { name, logo, contactEmail } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Company name is required" });
        }

        const companyData = {
            name,
            logo: logo || "",
            contactEmail: contactEmail || "",
            createdAt: new Date().toISOString(),
            adminUid: null, // To be assigned when a Company Admin is created
            staffCount: 0
        };

        const docRef = await db.collection("companies").add(companyData);
        res.status(201).json({ id: docRef.id, ...companyData });
    } catch (error) {
        res.status(500).json({ error: "Failed to create company" });
    }
});

// Get company details (Super Admin or members of that company)
router.get("/:id", checkAuth(['super_admin', 'company_admin', 'staff']), async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Restriction: if not super_admin, must belong to this company
        if (user.role !== 'super_admin' && user.companyId !== id) {
            return res.status(403).json({ error: "Forbidden: You do not belong to this company" });
        }

        const doc = await db.collection("companies").doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: "Company not found" });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch company details" });
    }
});

export default router;

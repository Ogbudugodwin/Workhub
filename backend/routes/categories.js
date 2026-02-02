import express from "express";
import { db } from "../config/firebase.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'backend', 'uploads', 'categories');
        if (!fs.existsSync(uploadDir)) {
            try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) { console.error("Error creating categories upload dir:", e); }
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cat-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|svg|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            return cb(new Error('Only images (jpg, png, svg, webp) are allowed!'));
        }
    },
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// GET all categories
router.get("/", async (req, res) => {
    try {
        const snapshot = await db.collection("categories").get();
        const categories = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});

// POST - Create a new category with icon upload
router.post("/", upload.single('icon'), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: "Category name is required" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Category icon is required" });
        }

        const newCategory = {
            name,
            icon: `/uploads/categories/${req.file.filename}`,
            count: 0,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection("categories").add(newCategory);
        res.status(201).json({ id: docRef.id, ...newCategory });
    } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).json({ error: "Failed to create category" });
    }
});

// PUT update category
router.put("/:id", upload.single('icon'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const updates = {};
        if (name) updates.name = name;
        if (req.file) {
            updates.icon = `/uploads/categories/${req.file.filename}`;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        await db.collection("categories").doc(id).update(updates);
        res.json({ id, ...updates });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Failed to update category" });
    }
});

// DELETE category
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection("categories").doc(id).delete();
        res.json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Failed to delete category" });
    }
});

export default router;

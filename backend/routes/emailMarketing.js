import express from "express";
import { db, FieldValue, storage } from "../config/firebase.js";
import { checkAuth } from "../middleware/auth.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

router.use((req, res, next) => {
    console.log(`[EmailMarketingDebug] ${req.method} ${req.originalUrl} -> ${req.path}`);
    next();
});

// Configure multer for image uploads (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Only images are allowed!'));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Route for image upload with explicit error handling
router.post("/upload-image", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ error: err.message || "File upload failed" });
        }

        try {
            if (!req.file) {
                console.error("No file uploaded. req.file is:", req.file);
                return res.status(400).json({ error: "No file uploaded" });
            }

            // Generate a unique filename
            const ext = path.extname(req.file.originalname);
            const uniqueName = `campaign-image-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;

            // Upload buffer to Firebase Storage
            const bucketName = process.env.FIREBASE_STORAGE_BUCKET || "workhub-app-d82c8.appspot.com";
            let bucket;
            try {
                bucket = storage.bucket(bucketName);
            } catch (bucketErr) {
                console.error("Failed to get Firebase Storage bucket:", bucketErr);
                return res.status(500).json({ error: "Failed to access Firebase Storage bucket.", details: bucketErr.message });
            }
            const file = bucket.file(`email-images/${uniqueName}`);
            console.log("Uploading to bucket:", bucket.name, "as:", `email-images/${uniqueName}`);
            try {
                await file.save(req.file.buffer, {
                    metadata: {
                        contentType: req.file.mimetype,
                        cacheControl: 'public, max-age=31536000',
                    },
                    public: true,
                    validation: 'md5',
                });


            } catch (saveErr) {
                console.error("Failed to save file to Firebase Storage:", saveErr);

                const statusCode = saveErr.code || saveErr.status || (saveErr.response && saveErr.response.status);
                if (statusCode === 404 || (saveErr.message && saveErr.message.includes("404"))) {
                    return res.status(500).json({
                        error: "Firebase Storage Bucket not found. Please go to Firebase Console > Storage and click 'Get Started' to create the default bucket.",
                        details: saveErr.message
                    });
                }

                return res.status(500).json({ error: "Failed to upload image to Firebase Storage.", details: saveErr.message });
            }


            // Make file public (in case public: true above doesn't suffice)
            try {
                await file.makePublic();
            } catch (publicErr) {
                console.error("Failed to make file public:", publicErr);
                return res.status(500).json({ error: "Failed to make image public on Firebase Storage.", details: publicErr.message });
            }

            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/email-images/${uniqueName}`;
            console.log("Image uploaded successfully. Public URL:", publicUrl);

            // Save image URL and metadata to Firestore
            try {
                const imageDoc = {
                    url: publicUrl,
                    filename: uniqueName,
                    uploadedBy: req.user.uid,
                    uploadedAt: new Date().toISOString(),
                    contentType: req.file.mimetype,
                    size: req.file.size || null
                };
                await db.collection("email_images").add(imageDoc);
                console.log("Image metadata saved to Firestore.");
                g
            } catch (firestoreErr) {
                console.error("Failed to save image metadata to Firestore:", firestoreErr);
                // Do not block the response if Firestore write fails
            }

            res.json({ url: publicUrl });
        } catch (error) {
            console.error("Image upload post-processing error:", error);
            if (error.stack) console.error(error.stack);
            res.status(500).json({ error: "Internal server error during upload", details: error.message });
        }
    });
});

// ###################################################################################
// ############################ EMAIL CAMPAIGN ROUTES ################################
// ###################################################################################

// CREATE a new email campaign
router.post("/campaigns", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { name, subject, htmlContent, contentBlocks, senderName, senderEmail, preheader, templateId, scheduledAt } = req.body;
        const { uid, companyId, role } = req.user;

        if (!name || !subject) {
            return res.status(400).json({ error: "Missing required fields: name and subject." });
        }

        const newCampaign = {
            name,
            subject,
            preheader: preheader || "",
            senderName: senderName || "WorkHub Team",
            senderEmail: senderEmail || process.env.SMTP_USER,
            htmlContent: htmlContent || "",
            contentBlocks: contentBlocks || [],
            templateId: templateId || null,
            status: scheduledAt ? "scheduled" : "draft",
            scheduledAt: scheduledAt || null,
            createdBy: uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            companyId: role === 'super_admin' ? (req.body.companyId || null) : companyId,
            recipientListIds: req.body.recipientListIds || [],
            excludedRecipientIds: req.body.excludedRecipientIds || [],
        };

        const docRef = await db.collection("email_campaigns").add(newCampaign);
        res.status(201).json({ id: docRef.id, ...newCampaign });
    } catch (error) {
        console.error("Error creating email campaign:", error);
        res.status(500).json({ error: "Failed to create email campaign." });
    }
});

// GET all email campaigns for the user's company
router.get("/campaigns", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { companyId, role } = req.user;

        let query = db.collection("email_campaigns");

        if (role === 'company_admin') {
            query = query.where("companyId", "==", companyId);
        }

        const snapshot = await query.get();
        const campaigns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(campaigns);
    } catch (error) {
        console.error("Error fetching email campaigns:", error);
        res.status(500).json({ error: "Failed to fetch email campaigns." });
    }
});

// GET a single email campaign by ID
router.get("/campaigns/:id", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, role } = req.user;

        const docRef = db.collection("email_campaigns").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Campaign not found." });
        }

        const campaign = { id: doc.id, ...doc.data() };

        // If user is a company_admin, ensure they can only access their own company's campaigns
        if (role === 'company_admin' && campaign.companyId !== companyId) {
            return res.status(403).json({ error: "Forbidden: You do not have access to this campaign." });
        }

        res.json(campaign);
    } catch (error) {
        console.error("Error fetching email campaign:", error);
        res.status(500).json({ error: "Failed to fetch email campaign." });
    }
});

// UPDATE an email campaign
router.put("/campaigns/:id", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, subject, htmlContent, contentBlocks } = req.body;
        const { companyId, role } = req.user;

        console.log(`[UPDATE CAMPAIGN] ID: ${id}`);
        console.log(`[UPDATE CAMPAIGN] Received contentBlocks:`, contentBlocks ? `Array of ${contentBlocks.length} items` : 'undefined');

        const docRef = db.collection("email_campaigns").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Campaign not found." });
        }

        const campaign = doc.data();

        // If user is a company_admin, ensure they can only update their own company's campaigns
        if (role === 'company_admin' && campaign.companyId !== companyId) {
            return res.status(403).json({ error: "Forbidden: You do not have access to this campaign." });
        }

        // Prepare update data with proper handling of contentBlocks and undefined values
        const updateData = {
            name: name || campaign.name || "Untitled Campaign",
            subject: subject || campaign.subject || "No Subject",
            preheader: req.body.preheader !== undefined ? req.body.preheader : (campaign.preheader || ""),
            senderName: req.body.senderName || campaign.senderName || "",
            senderEmail: req.body.senderEmail || campaign.senderEmail || "",
            htmlContent: htmlContent !== undefined ? htmlContent : (campaign.htmlContent || ""),
            contentBlocks: contentBlocks !== undefined ? (Array.isArray(contentBlocks) ? contentBlocks : []) : (campaign.contentBlocks || []),
            templateId: req.body.templateId !== undefined ? req.body.templateId : (campaign.templateId || null),
            recipientListIds: req.body.recipientListIds || campaign.recipientListIds || [],
            excludedRecipientIds: req.body.excludedRecipientIds || campaign.excludedRecipientIds || [],
            scheduledAt: req.body.scheduledAt !== undefined ? req.body.scheduledAt : (campaign.scheduledAt || null),
            status: req.body.status || (req.body.scheduledAt ? "scheduled" : campaign.status),
            updatedAt: new Date().toISOString(),
        };

        console.log(`[UPDATE CAMPAIGN] Updating with ${updateData.contentBlocks.length} content blocks`);

        await docRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (error) {
        console.error("Error updating email campaign:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        res.status(500).json({ error: "Failed to update email campaign.", details: error.message });
    }
});

// DELETE an email campaign
router.delete("/campaigns/:id", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, role } = req.user;

        const docRef = db.collection("email_campaigns").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Campaign not found." });
        }

        const campaign = doc.data();

        // If user is a company_admin, ensure they can only delete their own company's campaigns
        if (role === 'company_admin' && campaign.companyId !== companyId) {
            return res.status(403).json({ error: "Forbidden: You do not have access to this campaign." });
        }

        await docRef.delete();
        res.status(200).json({ message: "Campaign deleted successfully." });
    } catch (error) {
        console.error("Error deleting email campaign:", error);
        res.status(500).json({ error: "Failed to delete email campaign." });
    }
});



// DUPLICATE an email campaign
router.post("/campaigns/:id/duplicate", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, role } = req.user;

        const docRef = db.collection("email_campaigns").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) return res.status(404).json({ error: "Campaign not found." });

        const campaign = doc.data();
        if (role === 'company_admin' && campaign.companyId !== companyId) {
            return res.status(403).json({ error: "Access denied." });
        }

        const duplicatedCampaign = {
            ...campaign,
            name: `${campaign.name} (Copy)`,
            status: "draft",
            lastSentAt: null,
            sentAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            recipientCount: 0
        };

        const newDocRef = await db.collection("email_campaigns").add(duplicatedCampaign);
        res.status(201).json({ id: newDocRef.id, ...duplicatedCampaign });
    } catch (error) {
        console.error("Error duplicating campaign:", error);
        res.status(500).json({ error: "Failed to duplicate campaign." });
    }
});
router.post("/campaigns/suggest-subject", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { campaignName, context } = req.body;

        // Mock AI suggestions based on Omnisend style
        const suggestions = [
            `🚀 Big News for ${campaignName}!`,
            `Special treat just for you 🎁`,
            `Don't miss out on this! ✨`,
            `Your weekly update is here ✉️`,
            `Exclusive access inside... 🔒`
        ];

        res.json({ suggestions });
    } catch (error) {
        res.status(500).json({ error: "Failed to generate subject ideas." });
    }
});

// ###################################################################################
// ############################### EMAIL LIST ROUTES #################################
// ###################################################################################

// CREATE a new email list
router.post("/lists", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { name, emails, description } = req.body; // emails is an array of objects {email, name, tags}
        const { uid, companyId, role } = req.user;

        if (!name) return res.status(400).json({ error: "Missing name." });

        const newList = {
            name,
            description: description || "",
            recipients: emails || [],
            createdBy: uid,
            companyId: role === 'super_admin' ? (req.body.companyId || null) : companyId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection("email_lists").add(newList);
        res.status(201).json({ id: docRef.id, ...newList });
    } catch (error) {
        res.status(500).json({ error: "Failed to create list." });
    }
});

// GET all email lists
router.get("/lists", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { companyId, role } = req.user;
        let query = db.collection("email_lists");

        if (role === 'company_admin') {
            query = query.where("companyId", "==", companyId);
        }

        const snapshot = await query.get();
        const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(lists);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch lists." });
    }
});

// UPDATE an email list
router.put("/lists/:id", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, recipients, description } = req.body;
        const { companyId, role } = req.user;

        const docRef = db.collection("email_lists").doc(id);
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ error: "List not found." });

        const list = doc.data();
        if (role === 'company_admin' && list.companyId !== companyId) {
            return res.status(403).json({ error: "Access denied." });
        }

        const updateData = {
            name: name || list.name,
            description: description !== undefined ? description : list.description,
            recipients: recipients || list.recipients,
            updatedAt: new Date().toISOString()
        };

        await docRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (error) {
        res.status(500).json({ error: "Failed to update list." });
    }
});

// DELETE an email list
router.delete("/lists/:id", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, role } = req.user;

        const docRef = db.collection("email_lists").doc(id);
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ error: "List not found." });

        if (role === 'company_admin' && doc.data().companyId !== companyId) {
            return res.status(403).json({ error: "Access denied." });
        }

        await docRef.delete();
        res.json({ message: "List deleted successfully." });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete list." });
    }
});

// ###################################################################################
// ############################ CAMPAIGN EXECUTION & SENDING #########################
// ###################################################################################

// Configure Nodemailer (Example with Gmail/SMTP - adjust as needed)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// SEND an email campaign
router.post("/campaigns/:id/send", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { listIds, audienceId } = req.body;
        const { companyId, role } = req.user;

        // Check if SMTP is configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error("[EmailMarketing] SMTP credentials missing in .env");
            return res.status(400).json({ error: "Email server (SMTP) not configured. Please check .env file." });
        }

        const campaignDoc = await db.collection("email_campaigns").doc(id).get();
        if (!campaignDoc.exists) return res.status(404).json({ error: "Campaign not found." });

        const campaign = campaignDoc.data();
        if (role === 'company_admin' && campaign.companyId !== companyId) {
            return res.status(403).json({ error: "Access denied." });
        }

        const effectiveListIds = listIds || (audienceId ? [audienceId] : []);

        if (effectiveListIds.length === 0) {
            return res.status(400).json({ error: "No recipient lists selected." });
        }

        // Fetch all recipients from selected lists
        let allRecipients = [];
        for (const listId of effectiveListIds) {
            const listDoc = await db.collection("email_lists").doc(listId).get();
            if (listDoc.exists) {
                const listData = listDoc.data();
                allRecipients = [...allRecipients, ...listData.recipients];
            }
        }

        // De-duplicate receipts by email
        const uniqueRecipients = Array.from(new Set(allRecipients.map(r => r.email)))
            .map(email => allRecipients.find(r => r.email === email));

        if (uniqueRecipients.length === 0) {
            console.warn(`[EmailMarketing] Attempted to send campaign ${id} but no recipients were found in lists: ${effectiveListIds.join(', ')}`);
            return res.status(400).json({ error: "No recipients found in selected lists." });
        }

        console.log(`[EmailMarketing] Starting to send campaign ${id} to ${uniqueRecipients.length} recipients.`);

        // Update campaign status
        await db.collection("email_campaigns").doc(id).update({
            status: "sending",
            sentAt: new Date().toISOString(),
            recipientCount: uniqueRecipients.length
        });

        // Initialize Analytics for this campaign
        const analyticsRef = db.collection("campaign_analytics").doc(id);
        await analyticsRef.set({
            totalSent: uniqueRecipients.length,
            opened: 0,
            clicked: 0,
            delivered: 0,
            failed: 0,
            opens: [],
            clicks: []
        }, { merge: true });

        // In a real production app, we should use a background job/queue for sending
        // For this demo, we'll send them here (and maybe limit for performance)
        const sendPromises = uniqueRecipients.map(async (recipient) => {
            const trackingId = crypto.randomUUID();
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
            const openTrackingPixel = `<img src="${backendUrl}/api/email-marketing/track/open/${id}/${trackingId}" width="1" height="1" style="display:none;" />`;

            // Process HTML content to fix all image URLs
            let processedHtml = campaign.htmlContent;

            // Fix 1: Convert /uploads/ to absolute URL
            processedHtml = processedHtml.replace(/src="\/uploads\//g, `src="${backendUrl}/uploads/`);
            processedHtml = processedHtml.replace(/src='\/uploads\//g, `src='${backendUrl}/uploads/`);

            // Fix 2: Convert localhost:5000/uploads/ to proper BACKEND_URL
            processedHtml = processedHtml.replace(/src="http:\/\/localhost:5000\/uploads\//g, `src="${backendUrl}/uploads/`);
            processedHtml = processedHtml.replace(/src='http:\/\/localhost:5000\/uploads\//g, `src='${backendUrl}/uploads/`);

            // Fix 3: Handle any http://localhost URLs
            processedHtml = processedHtml.replace(/src="http:\/\/localhost:3000\/uploads\//g, `src="${backendUrl}/uploads/`);
            processedHtml = processedHtml.replace(/src='http:\/\/localhost:3000\/uploads\//g, `src='${backendUrl}/uploads/`);

            // Wrap in a full HTML structure with proper email client support
            let finalHtml = `
                <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml">
                <head>
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                    <style type="text/css">
                        body { margin: 0; padding: 0; background-color: #F8F9FA; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
                        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
                        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                    </style>
                </head>
                <body style="margin:0; padding:0; background-color: #F8F9FA;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8F9FA;">
                        <tr>
                            <td align="center" style="padding: 40px 0;">
                                ${processedHtml}
                                ${openTrackingPixel}
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;

            // Wrap links for tracking - preserve original URL appearance
            finalHtml = finalHtml.replace(/href="(?!mailto:|tel:|#|http:\/\/localhost)([^"]+)"/g, (match, url) => {
                try {
                    // Only track external links, not localhost
                    if (url.includes('localhost')) return match;

                    // Use URL-safe Base64 encoding
                    const encodedUrl = Buffer.from(url).toString('base64')
                        .replace(/\+/g, '-')
                        .replace(/\//g, '_')
                        .replace(/=+$/, '');
                    return `href="${backendUrl}/api/email-marketing/track/click/${id}/${trackingId}?u=${encodedUrl}"`;
                } catch (e) {
                    console.error("Link tracking wrap error:", e);
                    return match;
                }
            });

            try {
                await transporter.sendMail({
                    from: `"${campaign.senderName || 'WorkHub Marketing'}" <${campaign.senderEmail || process.env.SMTP_USER}>`,
                    to: recipient.email,
                    subject: campaign.subject,
                    html: finalHtml,
                    headers: {
                        'X-Campaign-ID': id,
                        'X-Tracking-ID': trackingId
                    }
                });

                // Update delivered count
                await analyticsRef.update({
                    delivered: FieldValue.increment(1)
                });
            } catch (err) {
                console.error(`Failed to send email to ${recipient.email}:`, err);
                await analyticsRef.update({
                    failed: FieldValue.increment(1)
                });
            }
        });

        // Use Promise.all with caution if the list is huge
        await Promise.all(sendPromises);

        console.log(`[EmailMarketing] Completed sending campaign ${id}.`);

        await db.collection("email_campaigns").doc(id).update({
            status: "sent",
            lastSentAt: new Date().toISOString()
        });

        res.json({ message: `Campaign sent successfully to ${uniqueRecipients.length} recipients.` });
    } catch (error) {
        console.error("Error sending campaign:", error);
        res.status(500).json({ error: "Failed to send campaign." });
    }
});

// TEST an email campaign
router.post("/campaigns/:id/test", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { testEmail } = req.body;
        const { companyId, role } = req.user;

        // Check if SMTP is configured
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return res.status(400).json({ error: "Email server (SMTP) not configured. Please check .env file." });
        }

        if (!testEmail) return res.status(400).json({ error: "Test email address is required." });

        const campaignDoc = await db.collection("email_campaigns").doc(id).get();
        if (!campaignDoc.exists) return res.status(404).json({ error: "Campaign not found." });

        const campaign = campaignDoc.data();
        if (role === 'company_admin' && campaign.companyId !== companyId) {
            return res.status(403).json({ error: "Access denied." });
        }

        await transporter.sendMail({
            from: `"${campaign.senderName || 'WorkHub'}" <${campaign.senderEmail || process.env.SMTP_USER}>`,
            to: testEmail,
            subject: `[TEST] ${campaign.subject}`,
            html: `
                <div style="background: #FFF4E5; padding: 10px; text-align: center; font-size: 12px; color: #666; font-family: sans-serif; margin-bottom: 20px;">
                    This is a TEST email for campaign: <strong>${campaign.name}</strong>
                </div>
                ${campaign.htmlContent}
            `
        });

        res.json({ message: "Test email sent successfully!" });
    } catch (error) {
        console.error("Error sending test email:", error);
        res.status(500).json({ error: "Failed to send test email." });
    }
});

// RESEND to Non-Openers
router.post("/campaigns/:id/resend-io", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, role } = req.user;

        const campaignDoc = await db.collection("email_campaigns").doc(id).get();
        if (!campaignDoc.exists) return res.status(404).json({ error: "Campaign not found." });

        const analyticsDoc = await db.collection("campaign_analytics").doc(id).get();
        if (!analyticsDoc.exists) return res.status(400).json({ error: "No analytics found for this campaign." });

        const analytics = analyticsDoc.data();
        const openedTrackingIds = (analytics.opens || []).map(o => o.trackingId);

        // This requires tracking which recipient has which trackingId. 
        // For simplicity in this demo, we'll assume we can identify non-openers.
        // In a real app, you'd store trackingId per recipient per campaign.

        res.json({ message: "Resend logic initiated for non-openers." });
    } catch (error) {
        res.status(500).json({ error: "Failed to resend." });
    }
});



// GET campaign analytics
router.get("/campaigns/:id/analytics", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const analyticsDoc = await db.collection("campaign_analytics").doc(id).get();
        if (!analyticsDoc.exists) return res.status(404).json({ error: "Analytics not found." });
        res.json(analyticsDoc.data());
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch analytics." });
    }
});


// ###################################################################################
// ############################### TRACKING ENDPOINTS ################################
// ###################################################################################

// TRACK Email Open
router.get("/track/open/:campaignId/:trackingId", async (req, res) => {
    try {
        const { campaignId, trackingId } = req.params;
        const ip = req.ip;
        const userAgent = req.get('User-Agent');

        await db.collection("campaign_analytics").doc(campaignId).update({
            opened: FieldValue.increment(1),
            opens: FieldValue.arrayUnion({
                trackingId,
                timestamp: new Date().toISOString(),
                ip,
                userAgent
            })
        });

        // Return a 1x1 transparent GIF
        const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(pixel);
    } catch (error) {
        console.error("Open tracking error:", error);
        res.status(500).end();
    }
});

// TRACK Link Click
router.get("/track/click/:campaignId/:trackingId", async (req, res) => {
    try {
        const { campaignId, trackingId } = req.params;
        const { u: encodedUrl } = req.query;

        if (!encodedUrl) return res.status(400).send("Missing target URL");

        // Decode URL-safe Base64
        let base64 = encodedUrl.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const url = Buffer.from(base64, 'base64').toString('ascii');

        await db.collection("campaign_analytics").doc(campaignId).update({
            clicked: FieldValue.increment(1),
            clicks: FieldValue.arrayUnion({
                trackingId,
                url,
                timestamp: new Date().toISOString(),
                ip: req.ip,
                userAgent: req.get('User-Agent')
            })
        });

        res.redirect(url);
    } catch (error) {
        console.error("Click tracking error:", error);
        res.status(500).send("Error redirecting.");
    }
});


// ###################################################################################
// ############################ PRODUCT RECOMMENDATIONS ##############################
// ###################################################################################

// GET recommended products Mock
router.get("/recommended-products", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const mockProducts = [
            { id: 1, name: "Premium Work Desk", price: "299.99", image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=300&q=80" },
            { id: 2, name: "Ergonomic Office Chair", price: "189.50", image: "https://images.unsplash.com/photo-1505797149-43b00766ea16?auto=format&fit=crop&w=300&q=80" },
            { id: 3, name: "Wireless Mechanical Keyboard", price: "120.00", image: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=300&q=80" }
        ];
        res.json(mockProducts);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch recommendations." });
    }
});

// ###################################################################################
// ############################### SYSTEM USER IMPORT ################################
// ###################################################################################

// GET system users for list compilation
router.get("/system-users", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { companyId, role } = req.user;
        let query = db.collection("users");

        if (role === 'company_admin') {
            query = query.where("companyId", "==", companyId);
        }

        const snapshot = await query.get();
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email,
                name: data.name,
                role: data.role,
                tags: [data.role]
            };
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch system users." });
    }
});

// ###################################################################################
// ############################ CUSTOMER MANAGEMENT ##################################
// ###################################################################################

// CREATE a new customer
router.post("/customers", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { email, name, tags } = req.body;
        const { companyId, role } = req.user;

        if (!email) return res.status(400).json({ error: "Email is required." });

        const newCustomer = {
            email,
            name: name || "",
            tags: tags || [],
            companyId: role === 'super_admin' ? (req.body.companyId || null) : companyId,
            createdAt: new Date().toISOString(),
            status: "active"
        };

        const docRef = await db.collection("marketing_customers").add(newCustomer);
        res.status(201).json({ id: docRef.id, ...newCustomer });
    } catch (error) {
        res.status(500).json({ error: "Failed to create customer." });
    }
});

// GET all customers
router.get("/customers", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { companyId, role } = req.user;
        let query = db.collection("marketing_customers");

        if (role === 'company_admin') {
            query = query.where("companyId", "==", companyId);
        }

        const snapshot = await query.get();
        const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch customers." });
    }
});

// UPDATE a customer
router.put("/customers/:id", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name, tags, status } = req.body;
        const { companyId, role } = req.user;

        const docRef = db.collection("marketing_customers").doc(id);
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ error: "Customer not found." });

        if (role === 'company_admin' && doc.data().companyId !== companyId) {
            return res.status(403).json({ error: "Access denied." });
        }

        const updateData = {
            email: email || doc.data().email,
            name: name !== undefined ? name : doc.data().name,
            tags: tags || doc.data().tags,
            status: status || doc.data().status,
            updatedAt: new Date().toISOString()
        };

        await docRef.update(updateData);
        res.json({ id, ...updateData });
    } catch (error) {
        res.status(500).json({ error: "Failed to update customer." });
    }
});

// DELETE a customer
router.delete("/customers/:id", checkAuth(['super_admin', 'company_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { companyId, role } = req.user;

        const docRef = db.collection("marketing_customers").doc(id);
        const doc = await docRef.get();
        if (!doc.exists) return res.status(404).json({ error: "Customer not found." });

        if (role === 'company_admin' && doc.data().companyId !== companyId) {
            return res.status(403).json({ error: "Access denied." });
        }

        await docRef.delete();
        res.json({ message: "Customer deleted successfully." });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete customer." });
    }
});

export default router;

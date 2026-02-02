import express from "express";
import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { checkAuth } from "../middleware/auth.js";
import multer from "multer";
import path from "path";

const router = express.Router();

// Multer setup for file/voice note uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "backend/uploads/chat/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Ensure upload directory exists
import fs from 'fs';
const chatUploadDir = 'backend/uploads/chat';
if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
}

/**
 * GET - Fetch all users in the user's company (for DM/Group selection)
 */
router.get("/users", checkAuth(), async (req, res) => {
    try {
        const user = req.user;
        let query = db.collection("users");

        // If not super_admin, restrict to same company
        if (user.role !== 'super_admin') {
            if (!user.companyId) return res.json([]);
            query = query.where("companyId", "==", user.companyId);
        }

        const snapshot = await query.get();
        const users = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(u => u.id !== user.uid); // Exclude self

        res.json(users);
    } catch (error) {
        console.error("Error fetching chat users:", error);
        res.status(500).json({ error: "Failed to fetch chat users" });
    }
});

/**
 * GET - Fetch all channels for a user's company (Public + Member of Private)
 */
router.get("/channels", checkAuth(), async (req, res) => {
    try {
        const user = req.user;
        let query = db.collection("channels");

        // If not super_admin, filter by companyId
        if (user.role !== 'super_admin') {
            if (!user.companyId) return res.json([]);
            query = query.where("companyId", "==", user.companyId);
        }

        const snapshot = await query.get();
        const allChannels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch unread counts for each channel
        const channelsWithUnread = await Promise.all(allChannels.map(async (channel) => {
            // Only return for public channels OR those where the user is a member
            const isMember = channel.type === 'public' || (channel.members && channel.members.includes(user.uid)) || user.role === 'super_admin';
            if (!isMember) return null;

            // Simple unread count: messages in this channel where user.uid is NOT in readBy
            // To keep it light, we just query for any such messages
            const unreadSnapshot = await db.collection("messages")
                .where("channelId", "==", channel.id)
                .get();

            const unreadCount = unreadSnapshot.docs.filter(doc => {
                const data = doc.data();
                return !(data.readBy || []).includes(user.uid);
            }).length;

            return { ...channel, unreadCount };
        }));

        res.json(channelsWithUnread.filter(Boolean));
    } catch (error) {
        console.error("Error fetching channels:", error);
        res.status(500).json({ error: "Failed to fetch channels" });
    }
});

/**
 * POST - Create a new channel or Group DM
 */
router.post("/channels", checkAuth(), async (req, res) => {
    try {
        const { name, type, members } = req.body;
        const user = req.user;

        // Ensure creator is always a member
        const allMembers = Array.from(new Set([...(members || []), user.uid]));

        const newChannel = {
            name: name || "Group Chat",
            type: type || 'public',
            companyId: user.companyId,
            members: allMembers,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection("channels").add(newChannel);
        res.status(201).json({ id: docRef.id, ...newChannel });
    } catch (error) {
        console.error("Error creating channel:", error);
        res.status(500).json({ error: "Failed to create channel" });
    }
});

/**
 * GET - Fetch messages for a channel
 */
router.get("/messages/:channelId", checkAuth(), async (req, res) => {
    try {
        const { channelId } = req.params;
        const user = req.user;

        // Verify membership
        const channelDoc = await db.collection("channels").doc(channelId).get();
        if (!channelDoc.exists) {
            return res.status(404).json({ error: "Channel not found" });
        }

        const channelData = channelDoc.data();
        const isMember = channelData.members && channelData.members.includes(user.uid);
        const isPublic = channelData.type === 'public';

        if (!isMember && !isPublic) {
            return res.status(403).json({ error: "Unauthorized: You are not a member of this channel" });
        }

        const snapshot = await db.collection("messages")
            .where("channelId", "==", channelId)
            // .orderBy("createdAt", "asc") // Removed to avoid index requirements; sort on frontend instead
            .limit(100)
            .get();

        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort in code to avoid index issues
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        res.json(messages);
    } catch (error) {
        console.error(`[ChatError] Fetching messages for ${req.params.channelId}:`, error);
        res.status(500).json({ error: "Failed to fetch messages", details: error.message });
    }
});

/**
 * POST - Send a message
 */
router.post("/messages", checkAuth(), upload.single('file'), async (req, res) => {
    try {
        const { channelId, content, type } = req.body;
        const user = req.user;

        const messageData = {
            channelId,
            content: content || "",
            type: type || 'text',
            senderId: user.uid,
            senderName: user.name || 'User',
            createdAt: new Date().toISOString(),
            readBy: [user.uid] // Initialize with the sender having read it
        };

        if (req.file) {
            messageData.fileUrl = `/uploads/chat/${req.file.filename}`;
            messageData.fileName = req.file.originalname;
        }

        const docRef = await db.collection("messages").add(messageData);
        res.status(201).json({ id: docRef.id, ...messageData });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: "Failed to send message" });
    }
});

/**
 * PUT - Edit a message
 */
router.put("/messages/:messageId", checkAuth(), async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const user = req.user;

        const messageRef = db.collection("messages").doc(messageId);
        const messageDoc = await messageRef.get();

        if (!messageDoc.exists) {
            return res.status(404).json({ error: "Message not found" });
        }

        const messageData = messageDoc.data();
        if (messageData.senderId !== user.uid) {
            return res.status(403).json({ error: "Unauthorized: You can only edit your own messages" });
        }

        await messageRef.update({
            content,
            editedAt: new Date().toISOString()
        });

        res.json({ id: messageId, ...messageData, content, editedAt: new Date().toISOString() });
    } catch (error) {
        console.error("Error editing message:", error);
        res.status(500).json({ error: "Failed to edit message" });
    }
});

/**
 * DELETE - Remove a message
 */
router.delete("/messages/:messageId", checkAuth(), async (req, res) => {
    try {
        const { messageId } = req.params;
        const user = req.user;

        const messageRef = db.collection("messages").doc(messageId);
        const messageDoc = await messageRef.get();

        if (!messageDoc.exists) {
            return res.status(404).json({ error: "Message not found" });
        }

        const messageData = messageDoc.data();
        if (messageData.senderId !== user.uid) {
            return res.status(403).json({ error: "Unauthorized: You can only delete your own messages" });
        }

        await messageRef.delete();
        res.json({ success: true, messageId });
    } catch (error) {
        console.error("Error deleting message:", error);
        res.status(500).json({ error: "Failed to delete message" });
    }
});

/**
 * POST - Mark all messages in a channel as read
 */
router.post("/read/:channelId", checkAuth(), async (req, res) => {
    try {
        const { channelId } = req.params;
        const user = req.user;

        // Find all messages in this channel where this user is NOT in the readBy list
        const snapshot = await db.collection("messages")
            .where("channelId", "==", channelId)
            .get();

        const batch = db.batch();
        let count = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const readBy = data.readBy || [];
            if (!readBy.includes(user.uid)) {
                batch.update(doc.ref, {
                    readBy: FieldValue.arrayUnion(user.uid)
                });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
        }

        res.json({ success: true, markedRead: count });
    } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ error: "Failed to mark messages as read" });
    }
});

export default router;

import { db } from "../config/firebase.js";

/**
 * Middleware to verify if a user has a specific role or privilege.
 * @param {Array} allowedRoles - List of roles that are allowed (e.g. ['super_admin', 'company_admin'])
 * @param {string} requiredPrivilege - Optional specific privilege required (e.g. 'post_jobs')
 * @param {boolean} requireAllRoles - If true, user must have ALL allowed roles; if false, ANY role
 */
export const checkAuth = (allowedRoles = [], requiredPrivilege = null, requireAllRoles = false) => {
    return async (req, res, next) => {
        try {
            const uid = req.headers['x-user-uid']; // In a real app, this would be from a verified JWT token
            console.log(`[AuthDebug] Incoming UID:`, uid);

            if (!uid) {
                console.error('[AuthDebug] No UID provided in x-user-uid header');
                return res.status(401).json({ error: "Unauthorized: No UID provided" });
            }

            const userDoc = await db.collection("users").doc(uid).get();
            if (!userDoc.exists) {
                console.error(`[AuthDebug] User profile not found for UID: ${uid}`);
                return res.status(403).json({ error: "Forbidden: User profile not found" });
            }

            const userData = userDoc.data();
            console.log(`[AuthDebug] User found:`, userData);

            // 1. Super Admin always has full access
            if (userData.role === 'super_admin') {
                req.user = userData;
                req.user.uid = uid;
                console.log(`[AuthDebug] Super admin access granted for UID: ${uid}`);
                return next();
            }

            // 2. Check if role is allowed (Case-Insensitive & Trimmed)
            if (allowedRoles.length > 0) {
                const userRole = (userData.role || '').trim().toLowerCase();
                const normalizedAllowed = allowedRoles.map(r => r.trim().toLowerCase());
                const isAllowed = normalizedAllowed.includes(userRole);

                // Internal logging
                console.log(`[AuthDebug] UID: ${uid}, Role: "${userRole}", Allowed: [${normalizedAllowed}], Match: ${isAllowed}`);

                if (!isAllowed) {
                    console.error(`[AuthDebug] Role not allowed: ${userRole}`);
                    return res.status(403).json({
                        error: `Forbidden: Role "${userData.role}" does not have access`,
                        debug: {
                            detectedRole: userRole,
                            allowedRoles: normalizedAllowed,
                            match: isAllowed
                        }
                    });
                }
            }

            // 3. Check specific privilege if provided
            if (requiredPrivilege) {
                const privileges = userData.privileges || [];
                if (!privileges.includes(requiredPrivilege)) {
                    console.error(`[AuthDebug] Missing required privilege: ${requiredPrivilege}`);
                    return res.status(403).json({ error: `Forbidden: Missing required privilege: ${requiredPrivilege}` });
                }
            }

            // Add user data to request for next middleware
            req.user = {
                ...userData,
                uid: uid,
                companyId: userData.companyId || null // Ensure explicit null if undefined
            };
            console.log(`[AuthDebug] Auth success for UID: ${uid}`);
            next();
        } catch (error) {
            console.error("RBAC Middleware Error:", error);
            res.status(500).json({ error: "Internal server error during authorization" });
        }
    };
};

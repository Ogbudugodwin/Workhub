import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";

import categoriesRoutes from "./routes/categories.js";
import jobsRoutes from "./routes/jobs.js";
import usersRoutes from "./routes/users.js";
import companiesRoutes from "./routes/companies.js";
import applicationsRoutes from "./routes/applications.js";
import attendanceRoutes from "./routes/attendance.js";
import branchRoutes from "./routes/branches.js";
import workReportsRoutes from "./routes/workReports.js";
import leaveRequestsRoutes from "./routes/leaveRequests.js";
import complaintsRoutes from "./routes/complaints.js";
import chatRoutes from "./routes/chat.js";
import emailMarketingRoutes from "./routes/emailMarketing.js";

const app = express();
const PORT = 5000;
// Force restart timestamp: 2026-01-18T21:23:00

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));
app.use('/backend/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

app.use(cors());
app.use(express.json({ limit: '50mb' }));  // Increased limit for image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
console.log("Loading routes...");
app.use("/api/categories", categoriesRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/applications", applicationsRoutes);
console.log("Attendance routes loading...");
app.use("/api/attendance", attendanceRoutes);
console.log("Attendance routes loaded");
console.log("Branches routes loading...");
app.use("/api/branches", branchRoutes);
console.log("Branches routes loaded");
app.use("/api/work-reports", workReportsRoutes);
app.use("/api/leave-requests", leaveRequestsRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/chat", chatRoutes);
console.log("Mounting Email Marketing routes...");
app.use("/api/email-marketing", emailMarketingRoutes);
console.log("Email Marketing routes mounted");

// Force restart timestamp: 2026-01-04T01:51:00
app.get("/", (req, res) => {
    res.send("WorkHub API is running");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

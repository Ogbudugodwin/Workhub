import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
if (!process.env.SMTP_USER) {
    dotenv.config({ path: path.join(process.cwd(), '.env') });
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function testSend() {
    console.log("Attempting real send to: ogbudugodwin02@gmail.com");
    try {
        const info = await transporter.sendMail({
            from: `"WorkHub Test" <${process.env.SMTP_USER}>`,
            to: process.env.SMTP_USER, // Send to self for test
            subject: "WorkHub REAL Delivery Test",
            html: "<h1>It Works!</h1><p>This is a real delivery test from the backend script.</p>"
        });
        console.log("Email sent successfully!");
        console.log("Message ID:", info.messageId);
        console.log("Response:", info.response);
    } catch (error) {
        console.error("Email SEND Failed:", error.message);
    }
    process.exit(0);
}

testSend();

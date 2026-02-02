import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
if (!process.env.SMTP_USER) {
    dotenv.config({ path: path.join(process.cwd(), '.env') });
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function testSend() {
    console.log("Testing SMTP with User:", process.env.SMTP_USER);

    // First test the current .env config
    console.log(`\nChecking current .env config: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} (secure: ${process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465"})...`);
    try {
        const currentTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        await currentTransporter.verify();
        console.log("✅ Current .env config is WORKING!");
        return;
    } catch (err) {
        console.error("❌ Current .env config FAILED:", err.message);
    }

    const configs = [
        { host: "smtp.gmail.com", port: 587, secure: false },
        { host: "smtp.gmail.com", port: 465, secure: true }
    ];

    for (const config of configs) {
        console.log(`\nTrying ${config.host}:${config.port} (secure: ${config.secure})...`);
        const testTransporter = nodemailer.createTransport({
            ...config,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        try {
            await testTransporter.verify();
            console.log(`✅ SMTP Connection verified on port ${config.port}!`);
            return;
        } catch (error) {
            console.error(`❌ Port ${config.port} failed:`, error.message);
        }
    }

    console.log("\nAll SMTP attempts failed.");
    process.exit(1);
}

testSend();

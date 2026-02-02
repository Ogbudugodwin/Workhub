/**
 * Email Template Testing Guide
 * 
 * This file documents how to test email template rendering
 */

// Test 1: Image Display
// When you upload an image in the email editor:
// - The image URL should now be: http://localhost:5000/uploads/filename.jpg
// - In sent emails, this absolute URL will work for recipients
// - Previously it was /uploads/filename.jpg which didn't work in emails

// Test 2: Button Links
// When you add a button with a link (e.g., https://www.example.com):
// - In the editor: You see the original link
// - In the sent email HTML: The href is wrapped with tracking URL
// - When recipient clicks: They are redirected to the original URL
// - The tracking URL format: http://localhost:5000/api/email-marketing/track/click/[campaignId]/[trackingId]?u=[encodedUrl]

// How to test:
// 1. Create a new campaign
// 2. Add an image block and upload an image
// 3. Add a button block and set href to a real URL (e.g., https://google.com)
// 4. Send a test email to yourself
// 5. Check if:
//    - Image displays correctly
//    - Button link works (redirects to correct destination)
//    - Click tracking is recorded in analytics

console.log('Email template testing guide loaded');

// Test script to verify image URL replacement logic
const testHtml = `
<div>
    <img src="/uploads/test1.jpg" alt="Test 1" />
    <img src='http://localhost:5000/uploads/test2.jpg' alt="Test 2" />
    <img src="http://localhost:3000/uploads/test3.jpg" alt="Test 3" />
    <img src="https://example.com/image.jpg" alt="External" />
    <a href="https://www.google.com">Click here</a>
    <a href="/uploads/file.pdf">Download</a>
</div>
`;

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

let processedHtml = testHtml;

// Fix 1: Convert /uploads/ to absolute URL
processedHtml = processedHtml.replace(/src="\/uploads\//g, `src="${backendUrl}/uploads/`);
processedHtml = processedHtml.replace(/src='\/uploads\//g, `src='${backendUrl}/uploads/`);

// Fix 2: Convert localhost:5000/uploads/ to proper BACKEND_URL
processedHtml = processedHtml.replace(/src="http:\/\/localhost:5000\/uploads\//g, `src="${backendUrl}/uploads/`);
processedHtml = processedHtml.replace(/src='http:\/\/localhost:5000\/uploads\//g, `src='${backendUrl}/uploads/`);

// Fix 3: Handle any http://localhost URLs
processedHtml = processedHtml.replace(/src="http:\/\/localhost:3000\/uploads\//g, `src="${backendUrl}/uploads/`);
processedHtml = processedHtml.replace(/src='http:\/\/localhost:3000\/uploads\//g, `src='${backendUrl}/uploads/`);

console.log('=== ORIGINAL HTML ===');
console.log(testHtml);
console.log('\n=== PROCESSED HTML ===');
console.log(processedHtml);
console.log('\n=== VERIFICATION ===');
console.log('✓ All /uploads/ paths converted:', !processedHtml.includes('src="/uploads/'));
console.log('✓ All localhost:5000 paths converted:', !processedHtml.includes('localhost:5000/uploads'));
console.log('✓ All localhost:3000 paths converted:', !processedHtml.includes('localhost:3000/uploads'));
console.log('✓ External URLs preserved:', processedHtml.includes('https://example.com/image.jpg'));

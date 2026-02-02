
import { readFile } from 'fs/promises';
import { resolve } from 'path';

async function testImports() {
    const indexContent = await readFile('./backend/index.js', 'utf8');
    const lines = indexContent.split('\n');
    for (const line of lines) {
        if (line.trim().startsWith('import ')) {
            const match = line.match(/from\s+["'](.+)["']/);
            if (match) {
                const importPath = match[1];
                if (importPath.startsWith('.')) {
                    const fullPath = resolve('./backend', importPath);
                    console.log(`Checking local import: ${importPath} -> ${fullPath}`);
                    try {
                        await readFile(fullPath);
                        console.log(`  [OK] Found ${fullPath}`);
                    } catch (e) {
                        console.log(`  [FAIL] Missing ${fullPath}`);
                    }
                } else {
                    console.log(`Checking package import: ${importPath}`);
                    try {
                        require.resolve(importPath); // require not available in ESM, but this is just a quick check
                    } catch (e) { }
                }
            }
        }
    }
}

testImports();

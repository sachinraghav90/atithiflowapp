import fs from 'fs';
import path from 'path';

// Helper to convert camelCase or PascalCase to kebab-case
function toKebabCase(str) {
    return str
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
}

function processDirectory(dir) {
    let deletedCount = 0;
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            deletedCount += processDirectory(fullPath);
        } else {
            // Only process TS/TSX files (or any file you want)
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                // If the filename contains any uppercase letters
                if (/[A-Z]/.test(file)) {
                    const ext = path.extname(file);
                    const nameWithoutExt = path.basename(file, ext);
                    
                    const kebabName = toKebabCase(nameWithoutExt) + ext;
                    const kebabFullPath = path.join(dir, kebabName);
                    
                    // If the kebab-case version exists and is a different file
                    if (kebabName !== file && fs.existsSync(kebabFullPath)) {
                        console.log(`Deleting duplicate: ${fullPath}`);
                        console.log(`  Keeping: ${kebabFullPath}`);
                        try {
                            fs.unlinkSync(fullPath);
                            deletedCount++;
                        } catch (err) {
                            console.error(`  Failed to delete ${fullPath}:`, err.message);
                        }
                    }
                }
            }
        }
    }
    return deletedCount;
}

const targetDir = path.join(process.cwd(), 'src');
console.log(`Scanning for duplicates in ${targetDir}...`);
const totalDeleted = processDirectory(targetDir);
console.log(`\nCleanup complete! Deleted ${totalDeleted} duplicate files.`);

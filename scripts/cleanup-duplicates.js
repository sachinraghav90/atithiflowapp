import fs from 'fs';
import path from 'path';

// Helper to convert PascalCase to kebab-case
function toKebabCase(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase().replace(/^-/, '');
}

const DIRS_TO_CHECK = [
  'src/services',
  'src/controllers',
  'src/routes'
];

function getDuplicatePairs(dir) {
  const files = fs.readdirSync(dir);
  const pairs = [];
  
  for (const file of files) {
    if (!file.endsWith('.js')) continue;

    // Check if the file has uppercase letters (camelCase or PascalCase)
    if (/[A-Z]/.test(file)) {
      // It's an "old" format file.
      // Guess its new kebab-case name.
      const nameWithoutExt = file.replace(/\.js$/, '');
      const parts = nameWithoutExt.split('.');
      
      let kebabName = '';
      if (parts.length === 2) {
        // e.g. User.controller
        // acType.routes -> ac-type-route (special case)
        let base = toKebabCase(parts[0]);
        let type = toKebabCase(parts[1]);
        if (type === 'routes') type = 'route'; // Handle routes vs route
        kebabName = `${base}-${type}.js`;
      } else {
        kebabName = toKebabCase(nameWithoutExt) + '.js';
      }

      // Special manual fixes based on what we saw in the directory:
      if (file === 'Room.Service.js') kebabName = 'room-service.js';
      if (file === 'RefPackages.controller.js') kebabName = 'ref-packages-controller.js';
      if (file === 'LaundrySetupService.service.js') kebabName = 'laundry-setup-service.js';
      
      if (files.includes(kebabName)) {
        pairs.push({
          oldFile: file,
          newFile: kebabName,
          dir: dir
        });
      }
    }
  }
  return pairs;
}

function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function processCleanups() {
  let allPairs = [];
  for (const dir of DIRS_TO_CHECK) {
    const fullDirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullDirPath)) {
      allPairs = allPairs.concat(getDuplicatePairs(fullDirPath));
    }
  }

  if (allPairs.length === 0) {
    console.log("No duplicate files found.");
    return;
  }

  console.log(`Found ${allPairs.length} duplicate pairs to clean up.`);

  const allSourceFiles = getAllJsFiles(path.join(process.cwd(), 'src'));
  allSourceFiles.push(path.join(process.cwd(), 'index.js'));

  for (const pair of allPairs) {
    console.log(`Processing: ${pair.oldFile} -> ${pair.newFile}`);
    
    // 1. Update imports in ALL source files
    for (const srcFile of allSourceFiles) {
      if (!fs.existsSync(srcFile)) continue;
      let content = fs.readFileSync(srcFile, 'utf8');
      
      // We look for the exact old filename in the import string.
      // E.g., /User.service.js or User.service.js
      // We do a global replace of the string
      if (content.includes(pair.oldFile)) {
        // Need to be careful not to replace parts of other words, 
        // but since these are full filenames with .js, a simple replace is safe.
        const regex = new RegExp(`(?<=/)${pair.oldFile}`, 'g');
        content = content.replace(regex, pair.newFile);
        
        // Sometimes it's just "./OldFile.js" so the regex with (?<=/) works perfectly.
        // Also replace without the slash just in case
        if (content.includes(pair.oldFile)) {
          const fallbackRegex = new RegExp(`\\b${pair.oldFile}\\b`, 'g');
          content = content.replace(fallbackRegex, pair.newFile);
        }
        
        fs.writeFileSync(srcFile, content, 'utf8');
        console.log(`  Updated imports in ${path.relative(process.cwd(), srcFile)}`);
      }
    }

    // 2. Delete the old file
    const oldFilePath = path.join(pair.dir, pair.oldFile);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
      console.log(`  Deleted ${pair.oldFile}`);
    }
  }
  
  console.log("Cleanup complete!");
}

processCleanups();

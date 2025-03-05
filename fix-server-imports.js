import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting server imports fix...');

// Process server files to update imports
const serverDir = path.join(__dirname, 'server');
function updateImports(directory) {
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      updateImports(filePath);
      return;
    }

    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;

    console.log(`Processing ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Convert any direct local imports to use .js extension
    // Change: import { x } from "./file"; to import { x } from "./file.js";
    // This is needed for ESM compatibility in Node.js
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]\.\/([^'"]+)['"]/g;
    content = content.replace(importRegex, (match, p1) => {
      if (p1.endsWith('.js')) return match;
      modified = true;
      return match.replace(`"./${p1}"`, `"./${p1}.js"`);
    });

    // Same for parent directory imports
    const parentImportRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]\.\.\/(?!shared)([^'"]+)['"]/g;
    content = content.replace(parentImportRegex, (match, p1) => {
      if (p1.endsWith('.js')) return match;
      modified = true;
      return match.replace(`"../${p1}"`, `"../${p1}.js"`);
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated imports in ${filePath}`);
    }
  });
}

try {
  updateImports(serverDir);
  console.log('Server imports fixed successfully');
} catch (error) {
  console.error('Error fixing server imports:', error);
  process.exit(1);
}

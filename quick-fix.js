/**
 * Quick fix for the 502 error in production
 * 
 * This script modifies the dist/server/server/vite.js file to fix path resolution issues
 */

import fs from 'fs';
import path from 'path';

// Path to the server's vite.js file in the build
const viteJsPath = 'dist/server/server/vite.js';

// Check if the file exists
if (!fs.existsSync(viteJsPath)) {
  console.error(`Error: ${viteJsPath} not found. Make sure to build the project first.`);
  process.exit(1);
}

// Read the file
let content = fs.readFileSync(viteJsPath, 'utf8');

// Update the path resolution in the serveStatic function
content = content.replace(
  /const distPath = path\.resolve\([^)]+\);/g,
  'const distPath = path.resolve(__dirname, "..", "..", "public");'
);

// Write the file back
fs.writeFileSync(viteJsPath, content, 'utf8');

console.log(`✅ Fixed path resolution in ${viteJsPath}`);

// Copy the production index.html to key locations
const sourceIndexHtml = 'dist/public/index.html';
if (fs.existsSync(sourceIndexHtml)) {
  // Key locations to copy to
  const targetPaths = [
    'dist/server/client/index.html'
  ];
  
  // Ensure directories exist
  targetPaths.forEach(targetPath => {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Copy the file
    fs.copyFileSync(sourceIndexHtml, targetPath);
    console.log(`✅ Copied ${sourceIndexHtml} to ${targetPath}`);
  });
} else {
  console.error(`Error: Production index.html not found at ${sourceIndexHtml}`);
}

console.log('Quick fix completed. The production server should now serve the correct files.');
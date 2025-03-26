/**
 * Fix path references in the compiled vite.js file
 * 
 * This script patches path references in the compiled vite.js file to ensure
 * client and public directories are properly referenced after compilation.
 * 
 * Usage:
 * 1. Run the build process: npm run build
 * 2. Run this script: node fix-vite-paths.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the compiled vite.js file
const viteJsPath = path.resolve(__dirname, 'dist/server/server/vite.js');

async function fixPaths() {
  console.log('Fixing path references in compiled vite.js file...');
  
  try {
    if (!fs.existsSync(viteJsPath)) {
      console.error(`File not found: ${viteJsPath}`);
      console.log('Make sure to run "npm run build" before running this script.');
      process.exit(1);
    }
    
    // Read the file
    let content = await fs.promises.readFile(viteJsPath, 'utf-8');
    
    // Fix the public path reference
    // From: const distPath = path.resolve(__dirname, "public");
    // To: const distPath = path.resolve(__dirname, "..", "..", "public");
    content = content.replace(
      'const distPath = path.resolve(__dirname, "public");',
      'const distPath = path.resolve(__dirname, "..", "..", "public");'
    );
    
    // Write the updated content back
    await fs.promises.writeFile(viteJsPath, content, 'utf-8');
    
    console.log('Path references fixed successfully!');
    console.log('You can now run "npm start" to start the application.');
  } catch (error) {
    console.error('Error fixing path references:', error);
    process.exit(1);
  }
}

fixPaths();
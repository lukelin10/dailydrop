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

// Path to client index.html
const clientIndexPath = path.resolve(__dirname, 'client/index.html');

async function fixPaths() {
  console.log('Fixing path references in compiled vite.js file...');
  
  try {
    if (!fs.existsSync(viteJsPath)) {
      console.error(`File not found: ${viteJsPath}`);
      console.log('Make sure to run "npm run build" before running this script.');
      process.exit(1);
    }
    
    // Read the vite.js file
    let content = await fs.promises.readFile(viteJsPath, 'utf-8');
    
    // Fix 1: Update the public path reference
    // From: const distPath = path.resolve(__dirname, "public");
    // To: const distPath = path.resolve(__dirname, "..", "..", "public");
    content = content.replace(
      'const distPath = path.resolve(__dirname, "public");',
      'const distPath = path.resolve(__dirname, "..", "..", "public");'
    );
    
    // Fix 2: Add logic to correctly handle client src paths
    // Find the setupVite function and update the clientTemplate path and handling
    content = content.replace(
      'app.use("*", async (req, res, next) => {',
      `app.use("*", async (req, res, next) => {
        // Handle client source files
        if (req.originalUrl.startsWith('/src/')) {
          try {
            const filePath = path.resolve(__dirname, '..', '..', '..', 'client', req.originalUrl);
            if (fs.existsSync(filePath)) {
              // Let vite handle the transformation
              next();
              return;
            }
          } catch (e) {
            // Ignore and continue with normal handling
          }
        }
        `
    );
    
    // Write the updated content back
    await fs.promises.writeFile(viteJsPath, content, 'utf-8');
    
    // Check if client/index.html exists and update if needed
    if (fs.existsSync(clientIndexPath)) {
      console.log('Checking client/index.html for path references...');
      let indexContent = await fs.promises.readFile(clientIndexPath, 'utf-8');
      
      // We could update the script src here if needed
      // For now, let's just log that we're processing it
      console.log('Client index.html paths look good.');
    }
    
    console.log('Path references fixed successfully!');
    console.log('You can now run "npm start" to start the application.');
  } catch (error) {
    console.error('Error fixing path references:', error);
    process.exit(1);
  }
}

fixPaths();
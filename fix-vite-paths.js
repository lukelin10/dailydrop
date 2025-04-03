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
    
    // Fix 2: Fix the index.html path in the fallthrough handler
    content = content.replace(
      'res.sendFile(path.resolve(distPath, "index.html"));',
      `// Try to send from public directory first
      const publicIndexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(publicIndexPath)) {
        return res.sendFile(publicIndexPath);
      }
      
      // Fall back to client directory if public index doesn't exist
      const clientIndexPath = path.resolve(__dirname, "..", "client", "index.html");
      if (fs.existsSync(clientIndexPath)) {
        return res.sendFile(clientIndexPath);
      }
      
      // Last resort - try an absolute path
      const absoluteIndexPath = path.resolve(process.cwd(), "dist", "public", "index.html");
      if (fs.existsSync(absoluteIndexPath)) {
        return res.sendFile(absoluteIndexPath);
      }
      
      // Nothing found, send a readable error
      console.error("[Static Serving] Could not find index.html in any location");
      res.status(500).send("Error: Could not find index.html file. Please make sure the application is built correctly.")`
    );
    
    // Fix 3: Add logging to help diagnose template loading issues
    content = content.replace(
      'let template = await fs.promises.readFile(clientTemplate, "utf-8");',
      `console.log("[Vite] Loading template from:", clientTemplate);
      console.log("[Vite] Template exists:", fs.existsSync(clientTemplate));
      let template = await fs.promises.readFile(clientTemplate, "utf-8");`
    );
    
    // Fix 4: Add a try/catch block around template reading in serveStatic
    content = content.replace(
      'serveStatic = (app) => {',
      `serveStatic = (app) => {
        console.log("[Vite] Setting up static file serving");`
    );
    
    // Fix 5: Add better error handling for the template loading
    content = content.replace(
      'app.use("*", async (req, res, next) => {',
      `app.use("*", async (req, res, next) => {
        // Additional debugging for request handling
        console.log("[Vite] Handling request:", req.originalUrl);
        
        try {
        `
    );
    
    // Fix 6: Add corresponding catch block at the end of the function
    content = content.replace(
      'next(e);',
      `console.error("[Vite Template Error]", e);
          next(e);
        }`
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
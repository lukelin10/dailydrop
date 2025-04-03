/**
 * Production Path Fix Script
 * 
 * This script ensures that in production:
 * 1. All locations where client/index.html could be served from have the production version
 * 2. The serveStatic function is properly patched to look in the correct locations
 * 3. Paths are correctly set up to avoid the 502 error related to missing '/src/main.tsx'
 */

import fs from 'fs';
import path from 'path';

// Helper function to ensure a directory exists
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper function to copy a file
function copyFile(source, target) {
  try {
    if (fs.existsSync(source)) {
      const content = fs.readFileSync(source, 'utf8');
      fs.writeFileSync(target, content, 'utf8');
      console.log(`Copied ${source} to ${target}`);
      return true;
    } else {
      console.error(`Source file not found: ${source}`);
      return false;
    }
  } catch (error) {
    console.error(`Error copying file from ${source} to ${target}:`, error.message);
    return false;
  }
}

// Main function to fix paths
async function fixPaths() {
  console.log('Starting path fixes for production...');
  
  // 1. Ensure all necessary directories exist
  const directories = [
    'dist/server/client',
    'dist/server/server/client'
  ];
  
  directories.forEach(dir => ensureDirectoryExists(dir));
  
  // 2. Copy the production index.html to all possible locations
  const sourceIndexHtml = 'dist/public/index.html';
  const targetLocations = [
    'dist/client/index.html',
    'dist/server/client/index.html',
    'dist/server/server/client/index.html'
  ];
  
  if (!fs.existsSync(sourceIndexHtml)) {
    console.error(`Critical error: Production index.html not found at ${sourceIndexHtml}`);
    process.exit(1);
  }
  
  targetLocations.forEach(target => {
    copyFile(sourceIndexHtml, target);
  });
  
  // 3. Update the vite.js file to ensure it's looking in the right places
  const viteJsPath = 'dist/server/server/vite.js';
  
  if (fs.existsSync(viteJsPath)) {
    let viteContent = fs.readFileSync(viteJsPath, 'utf8');
    
    // Look for the serveStatic function and update the path resolution
    const updatedContent = viteContent.replace(
      /const distPath = path\.resolve\([^)]+\);/g,
      'const distPath = path.resolve(__dirname, "..", "..", "public");'
    );
    
    // Add additional file existence checks for better error messages
    const enhancedContent = updatedContent.replace(
      /app\.use\("\*", \([^}]+}\);/g,
      `app.use("*", (req, res) => {
    // Try to send from public directory first
    const publicIndexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(publicIndexPath)) {
      console.log("[Production] Serving index.html from public directory");
      return res.sendFile(publicIndexPath);
    }
    
    // Fall back to client directory if public index doesn't exist
    const clientIndexPath = path.resolve(__dirname, "..", "client", "index.html");
    if (fs.existsSync(clientIndexPath)) {
      console.log("[Production] Serving index.html from client directory");
      return res.sendFile(clientIndexPath);
    }
    
    // Nothing found, send a readable error
    console.error("[Production] Could not find index.html in any location");
    res.status(500).send("Error: Could not find index.html file. Please check the server logs for details.");
  });`
    );
    
    if (enhancedContent !== viteContent) {
      fs.writeFileSync(viteJsPath, enhancedContent, 'utf8');
      console.log(`Updated ${viteJsPath} with improved path resolution`);
    } else {
      console.log(`No changes needed for ${viteJsPath}`);
    }
  } else {
    console.error(`Warning: Could not find vite.js at ${viteJsPath}`);
  }
  
  console.log('Path fixes for production completed successfully.');
}

// Run the fix
fixPaths().catch(error => {
  console.error('Error fixing paths:', error);
  process.exit(1);
});
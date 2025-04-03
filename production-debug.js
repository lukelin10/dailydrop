/**
 * Production Debug Utility
 * 
 * This file is included in the production build and logs diagnostic information
 * to help debug 502 errors in production.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug function to log environment info at startup
export function logProductionEnvironment() {
  try {
    console.log('=== PRODUCTION ENVIRONMENT DEBUG INFO ===');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Current working directory:', process.cwd());
    console.log('__dirname:', __dirname);
    
    // Check dist structure
    const rootDir = process.cwd();
    console.log('\nFile system structure:');
    
    // List root directory
    try {
      const rootContents = fs.readdirSync(rootDir);
      console.log(`Root directory (${rootDir}) contents:`, rootContents);
    } catch (error) {
      console.error(`Could not read root directory: ${error.message}`);
    }
    
    // Check dist directory
    const distDir = path.join(rootDir, 'dist');
    try {
      if (fs.existsSync(distDir)) {
        const distContents = fs.readdirSync(distDir);
        console.log(`dist directory contents:`, distContents);
        
        // Check public directory
        const publicDir = path.join(distDir, 'public');
        if (fs.existsSync(publicDir)) {
          const publicContents = fs.readdirSync(publicDir);
          console.log(`public directory contents (${publicContents.length} items):`);
          // Only print the first 10 items to avoid overwhelming logs
          console.log(publicContents.slice(0, 10));
          
          // Check for index.html
          const indexPath = path.join(publicDir, 'index.html');
          console.log(`index.html exists:`, fs.existsSync(indexPath));
        } else {
          console.error(`public directory doesn't exist!`);
        }
        
        // Check server directory structure
        const serverDir = path.join(distDir, 'server');
        if (fs.existsSync(serverDir)) {
          const serverContents = fs.readdirSync(serverDir);
          console.log(`server directory contents:`, serverContents);
          
          // Check for deeper server directories
          const serverServerDir = path.join(serverDir, 'server');
          if (fs.existsSync(serverServerDir)) {
            console.log(`server/server directory exists, contents:`, fs.readdirSync(serverServerDir));
          }
        }
      } else {
        console.error(`dist directory doesn't exist!`);
      }
    } catch (error) {
      console.error(`Error inspecting dist directory: ${error.message}`);
    }
    
    // Simulate what serveStatic in vite.ts would do
    console.log('\nStatic file serving paths:');
    const viteJsPath = path.join(distDir, 'server', 'server', 'vite.js');
    if (fs.existsSync(viteJsPath)) {
      console.log('vite.js found at:', viteJsPath);
      
      // This is what serveStatic would use as distPath
      const viteJsDirname = path.dirname(viteJsPath);
      const staticPath = path.join(viteJsDirname, 'public');
      console.log('staticPath from vite.js dirname:', staticPath);
      console.log('This path exists:', fs.existsSync(staticPath));
      
      // Alternative path to try in production
      const alternativePath1 = path.join(distDir, 'public');
      console.log('Alternative path (dist/public):', alternativePath1);
      console.log('This path exists:', fs.existsSync(alternativePath1));
      
      const alternativePath2 = path.join(viteJsDirname, '../../public');
      console.log('Alternative path (../../public from vite.js):', alternativePath2);
      console.log('This path exists:', fs.existsSync(alternativePath2));
    } else {
      console.error('vite.js not found at expected path:', viteJsPath);
    }
    
    console.log('=== END DEBUG INFO ===');
  } catch (error) {
    console.error('Error in debug logging:', error);
  }
}

// Export a function to create a symlink to fix path issues if needed
export function createSymlinkIfNeeded() {
  try {
    const rootDir = process.cwd();
    const distDir = path.join(rootDir, 'dist');
    
    // Check if server/server/public directory exists
    const serverPublicPath = path.join(distDir, 'server', 'server', 'public');
    if (!fs.existsSync(serverPublicPath)) {
      console.log('Creating server/server/public directory for symlink');
      fs.mkdirSync(serverPublicPath, { recursive: true });
    }
    
    // Create symlink from server/server/public to dist/public
    const targetPath = path.join(distDir, 'public');
    if (fs.existsSync(targetPath) && !fs.existsSync(path.join(serverPublicPath, 'index.html'))) {
      console.log(`Creating symlink from ${serverPublicPath} to ${targetPath}`);
      
      // Check if running on Windows
      if (process.platform === 'win32') {
        // Windows uses different symlink types for directories
        fs.symlinkSync(targetPath, serverPublicPath, 'junction');
      } else {
        // Unix-like systems
        fs.symlinkSync(targetPath, serverPublicPath);
      }
      console.log('Symlink created successfully');
    } else {
      console.log('No need to create symlink, paths already exist correctly');
    }
  } catch (error) {
    console.error('Error creating symlink:', error);
  }
}
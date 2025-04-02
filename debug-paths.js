/**
 * Debug script to verify path resolution in production build
 * 
 * This script checks:
 * 1. The current working directory
 * 2. __dirname resolution
 * 3. Existence of critical directories/files
 * 4. Path resolution for static file serving
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Path Debug Information ---');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// Check dist directory structure
const distDir = path.resolve(process.cwd(), 'dist');
console.log('\n--- Checking dist directory structure ---');
console.log('dist path:', distDir);
console.log('dist exists:', fs.existsSync(distDir));

if (fs.existsSync(distDir)) {
  // List contents of dist
  console.log('\nContents of dist:');
  const distContents = fs.readdirSync(distDir);
  console.log(distContents);

  // Check for public directory
  const publicDir = path.resolve(distDir, 'public');
  console.log('\nChecking public directory:');
  console.log('public path:', publicDir);
  console.log('public exists:', fs.existsSync(publicDir));
  
  if (fs.existsSync(publicDir)) {
    console.log('Contents of public:');
    const publicFiles = fs.readdirSync(publicDir);
    console.log(publicFiles);
    console.log('index.html exists:', publicFiles.includes('index.html'));
  }

  // Check server directory  
  const serverDir = path.resolve(distDir, 'server');
  console.log('\nChecking server directory:');
  console.log('server path:', serverDir);
  console.log('server exists:', fs.existsSync(serverDir));
  
  if (fs.existsSync(serverDir)) {
    console.log('Contents of server:');
    const serverFiles = fs.readdirSync(serverDir);
    console.log(serverFiles);
    console.log('index.js exists:', serverFiles.includes('index.js'));
    
    // Check server/server directory
    const serverServerDir = path.resolve(serverDir, 'server');
    console.log('\nChecking server/server directory:');
    console.log('server/server path:', serverServerDir);
    console.log('server/server exists:', fs.existsSync(serverServerDir));
    
    if (fs.existsSync(serverServerDir)) {
      console.log('Contents of server/server:');
      console.log(fs.readdirSync(serverServerDir));
    }
  }

  // Check for vite.js file
  const viteJsPath = path.resolve(serverDir, 'server', 'vite.js');
  console.log('\nChecking vite.js file:');
  console.log('vite.js path:', viteJsPath);
  console.log('vite.js exists:', fs.existsSync(viteJsPath));
  
  // Test path resolution that would be used in serveStatic
  const distPathFromVite = path.resolve(path.dirname(viteJsPath), 'public');
  console.log('\nTesting path resolution used in server/vite.js:');
  console.log('Original distPath would be:', distPathFromVite);
  console.log('This path exists:', fs.existsSync(distPathFromVite));
  
  // Try alternative resolutions
  const alternativePath1 = path.resolve(path.dirname(viteJsPath), '../../public');
  console.log('\nAlternative path resolution 1:');
  console.log('Path:', alternativePath1);
  console.log('Path exists:', fs.existsSync(alternativePath1));
  
  const alternativePath2 = path.resolve(distDir, 'public');
  console.log('\nAlternative path resolution 2:');
  console.log('Path:', alternativePath2);
  console.log('Path exists:', fs.existsSync(alternativePath2));
}

console.log('\n--- End of Debug Information ---');
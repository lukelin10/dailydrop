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

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== PATH RESOLUTION DEBUG INFO ===');
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
      console.log(publicContents.slice(0, 10)); // First 10 items
      
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
      
      // Check vite.js
      const viteJsPath = path.join(serverDir, 'server', 'vite.js');
      if (fs.existsSync(viteJsPath)) {
        console.log('vite.js found at:', viteJsPath);
      } else {
        console.error('vite.js not found at expected path:', viteJsPath);
      }
    }
  } else {
    console.error(`dist directory doesn't exist!`);
  }
} catch (error) {
  console.error(`Error inspecting dist directory: ${error.message}`);
}

// Validate path resolution for server
console.log('\nValidating path resolution for server:');
const serverIndexPath = path.join(distDir, 'server', 'index.js');
if (fs.existsSync(serverIndexPath)) {
  console.log(`Server entry point exists at: ${serverIndexPath}`);
} else {
  console.error(`Server entry point not found at: ${serverIndexPath}`);
}

// Validate shared schema
const sharedSchemaPath = path.join(distDir, 'shared', 'schema.js');
if (fs.existsSync(sharedSchemaPath)) {
  console.log(`Shared schema exists at: ${sharedSchemaPath}`);
} else {
  console.error(`Shared schema not found at: ${sharedSchemaPath}`);
}

// Print potential static file serving paths
console.log('\nPotential static file serving paths:');
const possiblePaths = [
  path.join(distDir, 'public'),
  path.join(distDir, 'server', 'public'),
  path.join(distDir, 'server', 'server', 'public')
];

for (const testPath of possiblePaths) {
  const exists = fs.existsSync(testPath);
  const hasIndex = exists && fs.existsSync(path.join(testPath, 'index.html'));
  console.log(`Path: ${testPath}`);
  console.log(`  - Exists: ${exists}`);
  console.log(`  - Has index.html: ${hasIndex}`);
  
  if (exists) {
    // Check if it's a symlink
    try {
      const stat = fs.lstatSync(testPath);
      if (stat.isSymbolicLink()) {
        const target = fs.readlinkSync(testPath);
        console.log(`  - Is symlink to: ${target}`);
      }
    } catch (error) {
      console.error(`  - Error checking symlink: ${error.message}`);
    }
  }
}

console.log('=== END PATH DEBUG INFO ===');
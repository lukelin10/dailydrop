/**
 * Path Debug Tool
 * 
 * This tool helps diagnose path resolution issues in the production build by:
 * 1. Checking if critical files exist in expected locations
 * 2. Reporting directory structures
 * 3. Testing path resolution logic 
 * 
 * Usage: node path-debug.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Path Debug Tool ===');
console.log('Current directory:', process.cwd());
console.log('Script directory (__dirname):', __dirname);

function testPathResolution() {
  console.log('\n=== Path Resolution Test ===');
  
  // Test various path resolution scenarios
  const paths = [
    { name: 'Public index.html (relative to cwd)', path: path.resolve(process.cwd(), 'public', 'index.html') },
    { name: 'Public index.html (relative to dist)', path: path.resolve(process.cwd(), 'dist', 'public', 'index.html') },
    { name: 'Client index.html (from server dir)', path: path.resolve(__dirname, 'server', 'client', 'index.html') },
    { name: 'Client index.html (from root)', path: path.resolve(process.cwd(), 'client', 'index.html') },
    { name: 'Client index.html (relative to server)', path: path.resolve(__dirname, 'client', 'index.html') },
    { name: 'Client index.html (server/server -> ../client)', path: path.resolve(__dirname, 'server', 'server', '..', 'client', 'index.html') }
  ];
  
  paths.forEach(({ name, path: testPath }) => {
    const exists = fs.existsSync(testPath);
    console.log(`${name}:\n  Path: ${testPath}\n  Exists: ${exists ? '✅ YES' : '❌ NO'}`);
  });
}

function reportDirectoryStructure(dirPath, level = 0, maxDepth = 3) {
  if (level > maxDepth) return;
  
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`${' '.repeat(level * 2)}❌ Directory not found: ${dirPath}`);
      return;
    }
    
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const isDirectory = fs.statSync(itemPath).isDirectory();
      
      console.log(`${' '.repeat(level * 2)}${isDirectory ? '📁' : '📄'} ${item}`);
      
      if (isDirectory) {
        reportDirectoryStructure(itemPath, level + 1, maxDepth);
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
}

function checkCriticalPaths() {
  console.log('\n=== Critical Path Check ===');
  
  // Define critical paths to check
  const criticalPaths = [
    { name: 'server/index.js', path: path.resolve(__dirname, 'server', 'server', 'index.js') },
    { name: 'server/vite.js', path: path.resolve(__dirname, 'server', 'server', 'vite.js') },
    { name: 'client/index.html', path: path.resolve(__dirname, 'client', 'index.html') },
    { name: 'server/client/index.html', path: path.resolve(__dirname, 'server', 'client', 'index.html') },
    { name: 'public/index.html', path: path.resolve(__dirname, 'public', 'index.html') },
    { name: 'public/assets (directory)', path: path.resolve(__dirname, 'public', 'assets') }
  ];
  
  criticalPaths.forEach(({ name, path }) => {
    const exists = fs.existsSync(path);
    console.log(`${name}: ${exists ? '✅ Found' : '❌ Missing'}`);
    
    if (exists) {
      const isDirectory = fs.statSync(path).isDirectory();
      if (!isDirectory && name.endsWith('.js')) {
        try {
          // Read first few lines of JS files for debugging
          const content = fs.readFileSync(path, 'utf8').split('\n').slice(0, 5).join('\n');
          console.log(`  First 5 lines: ${content.replace(/\n/g, '\n  ')}`);
        } catch (err) {
          console.log(`  Cannot read file: ${err.message}`);
        }
      }
    }
  });
}

async function main() {
  console.log('\nEnvironment Information:');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('Platform:', process.platform);
  console.log('Node.js version:', process.version);
  
  console.log('\n=== Directory Structure ===');
  console.log('Current Directory:');
  reportDirectoryStructure(process.cwd(), 0, 2);
  
  console.log('\nScript Directory:');
  reportDirectoryStructure(__dirname, 0, 2);
  
  checkCriticalPaths();
  testPathResolution();
  
  // If we're in a server directory, try to also check from one level up
  if (path.basename(__dirname) === 'server') {
    console.log('\n=== Checking from parent directory ===');
    reportDirectoryStructure(path.resolve(__dirname, '..'), 0, 2);
  }
  
  console.log('\nPath debug completed. Use this information to fix missing files or incorrect path references.');
}

main().catch(error => {
  console.error('Error in path debug tool:', error);
  process.exit(1);
});
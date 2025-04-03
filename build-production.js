/**
 * Production Build & Run Script
 * 
 * A single, simplified script that:
 * 1. Builds the application for production
 * 2. Fixes the critical path issue with index.html
 * 3. Provides a function to start the production server
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const clientIndexHtmlPath = path.resolve(__dirname, 'client', 'index.html');
const distDir = path.resolve(__dirname, 'dist');
const serverClientDir = path.resolve(distDir, 'server', 'client');

// Whether we're building or running
const isRunMode = process.argv.includes('--run');

/**
 * Build the application for production
 */
function buildApp() {
  console.log('Building for production...');
  
  try {
    // Build client (frontend)
    console.log('Building client...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Directly run server in development mode with NODE_ENV set to production
    // This approach avoids the need to compile TypeScript
    console.log('Preparing quick-start solution...');
    
    // Create modified-server-index.js if it doesn't exist already
    const modifiedServerPath = path.resolve(distDir, 'modified-server-index.js');
    const originalServerContent = fs.readFileSync(path.resolve(__dirname, 'server', 'index.ts'), 'utf8');
    
    // Create a modified version of the server that includes our path fixes
    const modifiedServerContent = `
// Modified server entry point for production quick-start
// This file wraps the original server/index.ts with production-specific fixes

// Set environment to production
process.env.NODE_ENV = 'production';

// Add path fixing logic
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create client directories if they don't exist
['dist/server/client', 'dist/server/server/client'].forEach(dir => {
  const dirPath = path.resolve(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Copy index.html to all required locations
const indexPaths = [
  path.resolve(__dirname, '..', 'client/index.html'),
  path.resolve(__dirname, 'public/index.html')
];

// Find the first available index.html
let indexContent = null;
for (const indexPath of indexPaths) {
  if (fs.existsSync(indexPath)) {
    indexContent = fs.readFileSync(indexPath, 'utf8');
    break;
  }
}

if (indexContent) {
  // Write to all required locations
  [
    path.resolve(__dirname, 'server/client/index.html'), 
    path.resolve(__dirname, 'server/server/client/index.html')
  ].forEach(dest => {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, indexContent);
  });
}

// Start the original server using tsx (Direct execution of TypeScript)
// We use a spawn to execute tsx because it's not directly importable
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

// Handle exit
process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));
`;

    // Write the modified server entry point
    fs.writeFileSync(modifiedServerPath, modifiedServerContent);
    
    // Fix index.html paths for production
    fixIndexHtml();
    
    console.log('✅ Production build completed successfully!');
    console.log('To run the production server: node build-production.js --run');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Fix the index.html path issue for production
 */
function fixIndexHtml() {
  console.log('Fixing index.html paths...');
  
  // Create server/client directory if it doesn't exist
  if (!fs.existsSync(serverClientDir)) {
    fs.mkdirSync(serverClientDir, { recursive: true });
  }
  
  // Get the content of index.html
  const builtIndexHtmlPath = path.resolve(distDir, 'public', 'index.html');
  let indexHtmlContent;
  
  if (fs.existsSync(builtIndexHtmlPath)) {
    indexHtmlContent = fs.readFileSync(builtIndexHtmlPath, 'utf8');
  } else {
    console.warn('Warning: Using original index.html as fallback');
    indexHtmlContent = fs.readFileSync(clientIndexHtmlPath, 'utf8');
  }
  
  // Copy to server/client directory
  fs.writeFileSync(path.resolve(serverClientDir, 'index.html'), indexHtmlContent);
  
  // Create nested server/server/client directory (if that's where the server is looking)
  const nestedDir = path.resolve(distDir, 'server', 'server', 'client');
  if (!fs.existsSync(nestedDir)) {
    fs.mkdirSync(nestedDir, { recursive: true });
  }
  fs.writeFileSync(path.resolve(nestedDir, 'index.html'), indexHtmlContent);
}

/**
 * Run the production server
 */
function runServer() {
  // Ensure we're in production mode
  process.env.NODE_ENV = 'production';
  
  // Verify index.html exists (emergency fix if needed)
  const indexHtmlPath = path.resolve(serverClientDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.log('Emergency fix: Copying index.html');
    fixIndexHtml();
  }
  
  console.log('Starting production server with quick-start method...');
  
  // Ensure the modified server file exists
  const modifiedServerPath = path.resolve(distDir, 'modified-server-index.js');
  if (!fs.existsSync(modifiedServerPath)) {
    console.log('Modified server file not found, running build step first...');
    buildApp();
  }
  
  // Start the modified server
  const server = spawn('node', [modifiedServerPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    console.log('Trying alternative direct method...');
    
    // Fallback: Try to run the server directly with tsx
    const directServer = spawn('npx', ['tsx', 'server/index.ts'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    
    directServer.on('error', (directErr) => {
      console.error('Failed to start server with direct method:', directErr);
    });
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.kill('SIGTERM');
  });
}

// Main execution
if (isRunMode) {
  runServer();
} else {
  buildApp();
}
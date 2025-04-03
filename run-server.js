/**
 * Production Server Starter
 * 
 * This script:
 * 1. Ensures the NODE_ENV is set to 'production'
 * 2. Runs a final check for index.html in critical locations
 * 3. Starts the server with the correct entry point
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Set NODE_ENV for production
process.env.NODE_ENV = 'production';

// Critical path to check
const serverClientDir = path.resolve('dist', 'server', 'client');
const serverClientIndexHtml = path.resolve(serverClientDir, 'index.html');

// Verify critical files exist
if (!fs.existsSync(serverClientIndexHtml)) {
  console.error('Error: index.html not found in', serverClientDir);
  console.error('Running emergency fix...');
  
  try {
    // Create directory if it doesn't exist
    if (!fs.existsSync(serverClientDir)) {
      fs.mkdirSync(serverClientDir, { recursive: true });
    }
    
    // Copy from original client/index.html as last resort
    const originalIndexHtml = path.resolve('client', 'index.html');
    if (fs.existsSync(originalIndexHtml)) {
      fs.copyFileSync(originalIndexHtml, serverClientIndexHtml);
      console.log('Emergency fix completed: copied index.html to', serverClientDir);
    } else {
      console.error('Fatal error: Could not find client/index.html for emergency fix');
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during emergency fix:', err);
    process.exit(1);
  }
}

console.log('Starting production server...');

// Start the server
const server = spawn('node', ['dist/server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
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
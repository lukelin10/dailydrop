/**
 * Production Server Starter
 * 
 * This script:
 * 1. Ensures the NODE_ENV is set to 'production'
 * 2. Runs diagnostic checks before starting the server
 * 3. Sets up proper error handling and logging
 * 4. Starts the server with the correct entry point
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

console.log('=== Production Server Starter ===');
console.log('Current directory:', rootDir);
console.log('Script directory:', __dirname);

// Ensure NODE_ENV is production
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
  console.log('Setting NODE_ENV to "production"');
}

// Try to load and run diagnostics
let hasDiagnostics = false;
try {
  const { runAllDiagnostics } = await import('./production-startup-check.js');
  console.log('Running startup diagnostics...');
  await runAllDiagnostics();
  hasDiagnostics = true;
} catch (error) {
  console.error('Failed to run diagnostics:', error.message);
}

// Find server entry point
let serverScript = path.join(rootDir, 'dist/server/index.js');
if (!fs.existsSync(serverScript)) {
  console.log(`Server entry point not found at ${serverScript}`);
  
  // Try alternative locations
  const alternatives = [
    path.join(rootDir, 'server/index.js'),
    path.join(__dirname, 'server/index.js'),
    path.join(__dirname, 'dist/server/index.js')
  ];
  
  for (const alt of alternatives) {
    console.log(`Checking alternative: ${alt}`);
    if (fs.existsSync(alt)) {
      serverScript = alt;
      console.log(`Found server entry point at: ${serverScript}`);
      break;
    }
  }
}

if (!fs.existsSync(serverScript)) {
  console.error('CRITICAL ERROR: Could not find server entry point!');
  process.exit(1);
}

// Start the server in a separate process
console.log(`Starting server from: ${serverScript}`);
const server = spawn('node', [serverScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

// Handle server process events
server.on('error', (error) => {
  console.error('Failed to start server:', error);
});

server.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`Server process exited with code ${code} and signal ${signal}`);
    
    if (!hasDiagnostics) {
      console.log('\nTrying to run port binding test as fallback diagnostics...');
      
      const testScript = path.join(rootDir, 'test-port-binding.js');
      if (fs.existsSync(testScript)) {
        const testProcess = spawn('node', [testScript], { stdio: 'inherit' });
        testProcess.on('exit', (testCode) => {
          process.exit(testCode || 1);
        });
      } else {
        console.error('Could not find test-port-binding.js');
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  } else {
    console.log('Server process exited normally');
    process.exit(0);
  }
});

// Forward termination signals to the child process
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log(`Received ${signal}, forwarding to server...`);
    server.kill(signal);
  });
});
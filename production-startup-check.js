/**
 * Production Startup Diagnostic Tool
 * 
 * This script performs comprehensive diagnostics at application startup to identify
 * potential issues with:
 * 1. Environment detection
 * 2. Port binding
 * 3. File system access
 * 4. Critical path resolution
 * 5. Network connectivity
 * 
 * Use this as a standalone script with: node production-startup-check.js
 * Or import its functions in the production server entry point.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import os from 'os';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run all diagnostic checks
 */
export async function runAllDiagnostics() {
  console.log('=== PRODUCTION STARTUP DIAGNOSTICS ===');
  
  // Log basic environment information
  logEnvironmentInfo();
  
  // Check file system access
  checkFileSystemAccess();
  
  // Verify critical paths
  verifyCriticalPaths();
  
  // Test port binding
  await testPortBinding();
  
  // Check network interfaces
  checkNetworkInterfaces();
  
  console.log('=== END DIAGNOSTICS ===\n');
}

/**
 * Log basic environment information
 */
function logEnvironmentInfo() {
  console.log('\n--- Environment Information ---');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Current Working Directory:', process.cwd());
  console.log('Script Directory (__dirname):', __dirname);
  console.log('Node Version:', process.version);
  console.log('Platform:', process.platform);
  console.log('Architecture:', process.arch);
  console.log('Memory Usage:', process.memoryUsage());
  console.log('Uptime:', process.uptime(), 'seconds');
  
  // Check environment variables
  const requiredEnvVars = ['PORT', 'DATABASE_URL'];
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`${envVar}: [PRESENT]`);
    } else {
      console.log(`${envVar}: [MISSING]`);
    }
  }
}

/**
 * Check if file system is accessible
 */
function checkFileSystemAccess() {
  console.log('\n--- File System Access Check ---');
  
  // Test dirs to check for access
  const dirsToCheck = [
    process.cwd(),
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), 'dist/public'),
    path.join(process.cwd(), 'dist/server'),
    __dirname
  ];
  
  for (const dir of dirsToCheck) {
    try {
      if (fs.existsSync(dir)) {
        const stats = fs.statSync(dir);
        console.log(`${dir}: ${stats.isDirectory() ? 'Directory' : 'Not a directory'} [ACCESSIBLE]`);
        
        try {
          // Try to list directory contents
          const files = fs.readdirSync(dir);
          console.log(`  - Contains ${files.length} files/directories`);
        } catch (readError) {
          console.log(`  - Unable to read directory contents: ${readError.message}`);
        }
      } else {
        console.log(`${dir}: [DOES NOT EXIST]`);
      }
    } catch (error) {
      console.log(`${dir}: [ERROR] ${error.message}`);
    }
  }
  
  // Test write access to temp directory
  const tempFile = path.join(os.tmpdir(), 'replit-test-' + Date.now() + '.txt');
  try {
    fs.writeFileSync(tempFile, 'Test write access');
    console.log(`Temp file write: [SUCCESS] at ${tempFile}`);
    
    try {
      fs.unlinkSync(tempFile);
      console.log('Temp file cleanup: [SUCCESS]');
    } catch (cleanupError) {
      console.log(`Temp file cleanup: [FAILED] ${cleanupError.message}`);
    }
  } catch (writeError) {
    console.log(`Temp file write: [FAILED] ${writeError.message}`);
  }
}

/**
 * Verify critical paths for the application
 */
function verifyCriticalPaths() {
  console.log('\n--- Critical Path Verification ---');
  
  // List of critical files to check
  const criticalFiles = [
    { path: path.join(process.cwd(), 'dist/server/index.js'), description: 'Server Entry Point' },
    { path: path.join(process.cwd(), 'dist/server/production-debug.js'), description: 'Production Debug Utilities' },
    { path: path.join(process.cwd(), 'dist/public/index.html'), description: 'Client Entry Point' },
    { path: path.join(process.cwd(), 'dist/server/server/vite.js'), description: 'Vite Server Integration' }
  ];
  
  for (const file of criticalFiles) {
    try {
      if (fs.existsSync(file.path)) {
        const stats = fs.statSync(file.path);
        console.log(`${file.description}: [FOUND] Size: ${stats.size} bytes, Modified: ${stats.mtime}`);
      } else {
        console.log(`${file.description}: [MISSING] at ${file.path}`);
      }
    } catch (error) {
      console.log(`${file.description}: [ERROR] ${error.message}`);
    }
  }
  
  // Check static file directories
  const staticDirs = [
    path.join(process.cwd(), 'dist/public'),
    path.join(process.cwd(), 'dist/server/public'),
    path.join(process.cwd(), 'dist/server/server/public')
  ];
  
  console.log('\nStatic File Directories:');
  for (const dir of staticDirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const hasIndexHtml = files.includes('index.html');
        const hasAssets = files.includes('assets');
        console.log(`${dir}: [EXISTS] Has index.html: ${hasIndexHtml}, Has assets: ${hasAssets}`);
        
        if (fs.lstatSync(dir).isSymbolicLink()) {
          const target = fs.readlinkSync(dir);
          console.log(`  - Is symbolic link to: ${target}`);
        }
      } else {
        console.log(`${dir}: [DOES NOT EXIST]`);
      }
    } catch (error) {
      console.log(`${dir}: [ERROR] ${error.message}`);
    }
  }
}

/**
 * Test if the server can bind to the required port
 */
async function testPortBinding() {
  console.log('\n--- Port Binding Test ---');
  
  const port = process.env.PORT || 5000;
  
  return new Promise((resolve) => {
    try {
      // Create a simple test server
      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Port binding test successful');
      });
      
      // Handle potential errors
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.log(`Port ${port} binding: [FAILED] Port is already in use`);
        } else if (error.code === 'EACCES') {
          console.log(`Port ${port} binding: [FAILED] Permission denied`);
        } else {
          console.log(`Port ${port} binding: [FAILED] ${error.message}`);
        }
        resolve();
      });
      
      // Try to listen on the port
      server.listen(port, () => {
        console.log(`Port ${port} binding: [SUCCESS] Server can bind to port`);
        
        // Close the server after successful binding
        server.close(() => {
          console.log(`Port ${port} released successfully`);
          resolve();
        });
      });
      
      // Set a timeout in case the server never starts or closes
      setTimeout(() => {
        try {
          server.close();
        } catch (e) {
          // Ignore errors on close
        }
        console.log('Port binding test: [TIMED OUT]');
        resolve();
      }, 5000);
    } catch (error) {
      console.log(`Port binding test: [ERROR] ${error.message}`);
      resolve();
    }
  });
}

/**
 * Check network interfaces
 */
function checkNetworkInterfaces() {
  console.log('\n--- Network Interface Check ---');
  
  const interfaces = os.networkInterfaces();
  
  for (const [name, interfaceInfo] of Object.entries(interfaces)) {
    console.log(`Interface: ${name}`);
    
    if (Array.isArray(interfaceInfo)) {
      interfaceInfo.forEach((info, index) => {
        console.log(`  Address ${index + 1}: ${info.address} (${info.family})`);
        console.log(`    Internal: ${info.internal ? 'Yes' : 'No'}`);
      });
    }
  }
}

// Run diagnostics if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAllDiagnostics().catch(console.error);
}

export default { runAllDiagnostics };
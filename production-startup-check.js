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
import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run all diagnostic checks
 */
export async function runAllDiagnostics() {
  console.log('=== Production Startup Diagnostics ===');
  console.log('Running diagnostics at:', new Date().toISOString());
  
  logEnvironmentInfo();
  checkFileSystemAccess();
  verifyCriticalPaths();
  await testPortBinding();
  checkNetworkInterfaces();
  
  console.log('=== Diagnostics Complete ===');
}

/**
 * Log basic environment information
 */
function logEnvironmentInfo() {
  console.log('\n--- Environment Information ---');
  console.log('Node.js Version:', process.version);
  console.log('Platform:', process.platform);
  console.log('Architecture:', process.arch);
  console.log('Process ID:', process.pid);
  console.log('Current Working Directory:', process.cwd());
  console.log('Script Directory (__dirname):', __dirname);
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('PORT:', process.env.PORT || '(default)');
  
  // Log memory usage
  const memoryUsage = process.memoryUsage();
  console.log('Memory Usage:');
  console.log('  - RSS:', Math.round(memoryUsage.rss / 1024 / 1024), 'MB');
  console.log('  - Heap Total:', Math.round(memoryUsage.heapTotal / 1024 / 1024), 'MB');
  console.log('  - Heap Used:', Math.round(memoryUsage.heapUsed / 1024 / 1024), 'MB');
  
  // Log system memory
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024);
  console.log('System Memory:');
  console.log('  - Total:', totalMem, 'MB');
  console.log('  - Free:', freeMem, 'MB');
  console.log('  - Used:', totalMem - freeMem, 'MB');
}

/**
 * Check if file system is accessible
 */
function checkFileSystemAccess() {
  console.log('\n--- File System Access Check ---');
  
  try {
    // Check if we can create and write to a temporary file
    const tempFile = path.join(os.tmpdir(), `diagnostics-${Date.now()}.tmp`);
    fs.writeFileSync(tempFile, 'Test file system access');
    console.log('✅ Successfully wrote to temp file:', tempFile);
    
    // Try to read it back
    const content = fs.readFileSync(tempFile, 'utf8');
    console.log('✅ Successfully read from temp file');
    
    // Clean up
    fs.unlinkSync(tempFile);
    console.log('✅ Successfully deleted temp file');
  } catch (error) {
    console.error('❌ File system access error:', error.message);
  }
}

/**
 * Verify critical paths for the application
 */
function verifyCriticalPaths() {
  console.log('\n--- Critical Path Verification ---');
  
  // Define the critical paths for your application
  const criticalPaths = [
    { name: 'public directory', path: path.resolve(process.cwd(), 'public') },
    { name: 'public/index.html', path: path.resolve(process.cwd(), 'public', 'index.html') },
    { name: 'client directory', path: path.resolve(process.cwd(), 'client') },
    { name: 'client/index.html', path: path.resolve(process.cwd(), 'client', 'index.html') },
    { name: 'server directory', path: path.resolve(process.cwd(), 'server') },
    { name: 'server/server directory', path: path.resolve(process.cwd(), 'server', 'server') },
    // Build-production.js specific paths
    { name: 'dist directory', path: path.resolve(process.cwd(), 'dist') },
    { name: 'dist/server directory', path: path.resolve(process.cwd(), 'dist', 'server') },
    { name: 'dist/server/client directory', path: path.resolve(process.cwd(), 'dist', 'server', 'client') },
    { name: 'dist/server/client/index.html', path: path.resolve(process.cwd(), 'dist', 'server', 'client', 'index.html') },
    { name: 'dist/server/server/client directory', path: path.resolve(process.cwd(), 'dist', 'server', 'server', 'client') },
    { name: 'dist/server/server/client/index.html', path: path.resolve(process.cwd(), 'dist', 'server', 'server', 'client', 'index.html') },
    { name: 'build-server.sh', path: path.resolve(process.cwd(), 'build-server.sh') },
    { name: 'build-production.js', path: path.resolve(process.cwd(), 'build-production.js') }
  };
  
  // Check each path
  criticalPaths.forEach(({ name, path }) => {
    try {
      const exists = fs.existsSync(path);
      if (exists) {
        const stats = fs.statSync(path);
        const type = stats.isDirectory() ? 'directory' : 'file';
        console.log(`✅ ${name}: Found (${type})`);
      } else {
        console.log(`❌ ${name}: Missing`);
        
        // Try to find alternative paths
        if (name.includes('index.html')) {
          const possiblePaths = [
            path.resolve(__dirname, '..', 'client', 'index.html'),
            path.resolve(__dirname, 'client', 'index.html'),
            path.resolve(__dirname, 'public', 'index.html'),
            path.resolve(__dirname, '..', 'public', 'index.html')
          ];
          
          console.log('  Checking alternative paths:');
          possiblePaths.forEach(altPath => {
            console.log(`  - ${altPath}: ${fs.existsSync(altPath) ? '✅ Found' : '❌ Missing'}`);
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error checking ${name}:`, error.message);
    }
  });
}

/**
 * Test if the server can bind to the required port
 */
async function testPortBinding() {
  console.log('\n--- Port Binding Test ---');
  
  const PORT = process.env.PORT || 5000;
  
  return new Promise(resolve => {
    try {
      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Port binding test successful');
      });
      
      server.on('error', (error) => {
        console.error(`❌ Cannot bind to port ${PORT}:`, error.message);
        resolve(false);
      });
      
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Successfully bound to port ${PORT}`);
        server.close(() => {
          console.log(`✅ Successfully closed test server`);
          resolve(true);
        });
      });
    } catch (error) {
      console.error('❌ Unexpected error during port binding test:', error.message);
      resolve(false);
    }
  });
}

/**
 * Check network interfaces
 */
function checkNetworkInterfaces() {
  console.log('\n--- Network Interfaces ---');
  
  const interfaces = os.networkInterfaces();
  
  for (const [name, netInterface] of Object.entries(interfaces)) {
    console.log(`Interface: ${name}`);
    
    if (!netInterface) continue;
    
    netInterface.forEach((iface, index) => {
      console.log(`  [${index}] ${iface.family}:`);
      console.log(`    Address: ${iface.address}`);
      console.log(`    Netmask: ${iface.netmask}`);
      console.log(`    MAC: ${iface.mac}`);
      console.log(`    Internal: ${iface.internal}`);
    });
  }
}

// If this script is run directly, execute all diagnostics
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDiagnostics().catch(error => {
    console.error('Diagnostic tool error:', error);
    process.exit(1);
  });
}
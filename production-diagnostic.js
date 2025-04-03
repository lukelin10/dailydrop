/**
 * Consolidated Production Diagnostic Tool
 * 
 * This unified script replaces multiple debugging utilities and provides
 * comprehensive diagnostics for production deployment issues.
 * 
 * Features:
 * 1. Environment detection and analysis
 * 2. File system integrity verification
 * 3. Port binding tests
 * 4. Path resolution diagnosis
 * 5. Network connectivity analysis
 * 6. Production build validation
 * 7. Server startup verification
 * 
 * Usage:
 *   node production-diagnostic.js [command]
 * 
 * Commands:
 *   all       - Run all diagnostics (default)
 *   env       - Check environment information only
 *   files     - Verify file system and critical paths only
 *   network   - Run network and port binding tests only
 *   build     - Validate production build setup
 *   server    - Test server startup
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command line option (default to "all")
const command = process.argv[2] || 'all';

// Flag to track if any test failed
let hasFailure = false;

// Default port for tests
const PORT = process.env.PORT || 5000;

/**
 * MAIN FUNCTION
 * Entry point that orchestrates all diagnostic tests
 */
async function main() {
  console.log('\n========================================');
  console.log('   CONSOLIDATED PRODUCTION DIAGNOSTICS');
  console.log('========================================\n');
  console.log(`Running diagnostics at: ${new Date().toISOString()}`);
  
  try {
    if (['all', 'env'].includes(command)) {
      await checkEnvironment();
    }
    
    if (['all', 'files'].includes(command)) {
      await checkFileSystem();
    }
    
    if (['all', 'network'].includes(command)) {
      await checkNetwork();
    }
    
    if (['all', 'build'].includes(command)) {
      await checkBuild();
    }
    
    if (['all', 'server'].includes(command)) {
      await testServerStartup();
    }
    
    console.log('\n========================================');
    if (hasFailure) {
      console.log('❌ DIAGNOSTICS COMPLETED WITH ISSUES');
      console.log('Review the logs above to address the identified problems.');
    } else {
      console.log('✅ DIAGNOSTICS COMPLETED SUCCESSFULLY');
      console.log('All tests passed. Your production environment looks good!');
    }
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILURE:', error.message);
    hasFailure = true;
    process.exit(1);
  }
}

/**
 * ENVIRONMENT DIAGNOSTICS
 * Checks environment variables, system resources, and runtime details
 */
async function checkEnvironment() {
  console.log('\n=== Environment Diagnostics ===');
  
  // Node environment
  logStatusItem('Node.js Version', process.version);
  logStatusItem('Platform', process.platform);
  logStatusItem('Architecture', process.arch);
  logStatusItem('NODE_ENV', process.env.NODE_ENV || 'not set');
  logStatusItem('PORT', process.env.PORT || 'default (5000)');
  
  // Memory usage
  console.log('\n• Memory Resources:');
  const memoryUsage = process.memoryUsage();
  const totalMem = Math.round(os.totalmem() / 1024 / 1024);
  const freeMem = Math.round(os.freemem() / 1024 / 1024);
  
  console.log(`  - System Total: ${totalMem} MB`);
  console.log(`  - System Free:  ${freeMem} MB (${Math.round(freeMem/totalMem*100)}%)`);
  console.log(`  - Process RSS:  ${Math.round(memoryUsage.rss / 1024 / 1024)} MB`);
  console.log(`  - Heap Total:   ${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`);
  console.log(`  - Heap Used:    ${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`);
  
  // Process Details
  console.log('\n• Process Details:');
  console.log(`  - PID:          ${process.pid}`);
  console.log(`  - Current Dir:  ${process.cwd()}`);
  
  // Environment Variables
  console.log('\n• Key Environment Variables:');
  const importantVars = ['NODE_ENV', 'PORT', 'DATABASE_URL', 'GOOGLE_SHEETS_ID'];
  importantVars.forEach(varName => {
    const value = process.env[varName];
    // Mask sensitive values
    const displayValue = varName.includes('URL') || varName.includes('KEY') || varName.includes('SECRET') 
      ? value ? '****' : 'not set'
      : value || 'not set';
    console.log(`  - ${varName}: ${displayValue}`);
  });
}

/**
 * FILE SYSTEM DIAGNOSTICS
 * Verifies file system access and critical paths
 */
async function checkFileSystem() {
  console.log('\n=== File System Diagnostics ===');
  
  // Test basic file system operations
  console.log('\n• Basic File System Operations:');
  
  try {
    // Test write access
    const tempFile = path.join(os.tmpdir(), `diagnostics-${Date.now()}.tmp`);
    fs.writeFileSync(tempFile, 'Test file system access');
    logSuccessItem('Write access', `Created ${tempFile}`);
    
    // Test read access
    const content = fs.readFileSync(tempFile, 'utf8');
    logSuccessItem('Read access', 'Successfully read test file');
    
    // Test delete access
    fs.unlinkSync(tempFile);
    logSuccessItem('Delete access', 'Successfully deleted test file');
  } catch (error) {
    logErrorItem('File system access', error.message);
    hasFailure = true;
  }
  
  // Check directory structure
  console.log('\n• Directory Structure:');
  logDirectoryStructure(process.cwd(), '  ', 2);
  
  // Critical Path Verification
  console.log('\n• Critical Path Verification:');
  const criticalPaths = getCriticalPaths();
  
  // Check existence of critical files
  let missingPaths = 0;
  for (const { name, path: filePath } of criticalPaths) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const type = stats.isDirectory() ? 'directory' : 'file';
        logSuccessItem(name, `${type}, ${formatSize(stats.size)}`);
      } else {
        logErrorItem(name, 'missing');
        missingPaths++;
      }
    } catch (error) {
      logErrorItem(name, `error: ${error.message}`);
      missingPaths++;
    }
  }
  
  if (missingPaths > 0) {
    hasFailure = true;
    console.log(`\n❌ Found ${missingPaths} missing critical paths. This may cause issues in production.`);
  } else {
    console.log('\n✅ All critical paths verified. File system looks good!');
  }
}

/**
 * NETWORK DIAGNOSTICS
 * Tests network interfaces and port binding
 */
async function checkNetwork() {
  console.log('\n=== Network Diagnostics ===');
  
  // Check Network Interfaces
  console.log('\n• Network Interfaces:');
  const interfaces = os.networkInterfaces();
  
  for (const [name, netInterface] of Object.entries(interfaces)) {
    if (!netInterface || netInterface.length === 0) continue;
    
    console.log(`  Interface: ${name}`);
    netInterface.forEach(iface => {
      if (iface.family === 'IPv4' || iface.family === 4) { // Check both string and number format
        console.log(`    - Address: ${iface.address} (${iface.internal ? 'internal' : 'external'})`);
      }
    });
  }
  
  // Port Binding Test
  console.log('\n• Port Binding Test:');
  const portBindingSuccess = await testPortBinding(PORT);
  
  if (!portBindingSuccess) {
    console.log(`\n❌ Port binding test failed. The application may not be able to listen on port ${PORT}.`);
    hasFailure = true;
  } else {
    console.log(`\n✅ Port binding test passed. The application can listen on port ${PORT}.`);
  }
}

/**
 * BUILD DIAGNOSTICS
 * Validates the production build configuration
 */
async function checkBuild() {
  console.log('\n=== Build Diagnostics ===');
  
  // Check package.json for build scripts
  console.log('\n• Build Configuration:');
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.build) {
      logSuccessItem('Build script', packageJson.scripts.build);
    } else {
      logErrorItem('Build script', 'missing in package.json');
      hasFailure = true;
    }
    
    // Check for build-production.js
    if (fs.existsSync(path.join(process.cwd(), 'build-production.js'))) {
      logSuccessItem('build-production.js', 'found');
    } else {
      logErrorItem('build-production.js', 'missing');
      hasFailure = true;
    }
    
    // Check for build output directory
    const distDir = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distDir) && fs.statSync(distDir).isDirectory()) {
      const fileCount = fs.readdirSync(distDir).length;
      logSuccessItem('dist directory', `found with ${fileCount} items`);
      
      // Check for key build outputs
      const clientDir = path.join(distDir, 'client');
      const serverDir = path.join(distDir, 'server');
      
      if (fs.existsSync(clientDir) && fs.statSync(clientDir).isDirectory()) {
        logSuccessItem('dist/client', 'found');
      } else {
        logWarningItem('dist/client', 'missing or not a directory');
      }
      
      if (fs.existsSync(serverDir) && fs.statSync(serverDir).isDirectory()) {
        logSuccessItem('dist/server', 'found');
      } else {
        logWarningItem('dist/server', 'missing or not a directory');
      }
    } else {
      logWarningItem('dist directory', 'not found - build may not have been run yet');
    }
    
  } catch (error) {
    logErrorItem('Build configuration check', error.message);
    hasFailure = true;
  }
}

/**
 * SERVER STARTUP DIAGNOSTICS
 * Tests if the server can start successfully
 */
async function testServerStartup() {
  console.log('\n=== Server Startup Diagnostics ===');
  console.log('\n• Testing Server Startup (10 second test):');
  
  return new Promise((resolve) => {
    let output = '';
    let serverStarted = false;
    
    try {
      // Determine the server start command
      let command = 'npm';
      let args = ['run', 'dev'];
      
      // If in production mode and there's a build-production.js, use that
      if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(process.cwd(), 'build-production.js'))) {
        command = 'node';
        args = ['build-production.js', '--run'];
      }
      
      console.log(`Starting server with: ${command} ${args.join(' ')}`);
      
      // Start the server process
      const serverProcess = spawn(command, args, {
        env: { ...process.env, PORT: String(PORT + 1) } // Use PORT+1 to avoid conflicts with the diagnostic tool
      });
      
      // Collect stdout
      serverProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(`  ${text}`);
        
        // Look for successful server start signals
        if (text.includes('server listening') || text.includes('running at http')) {
          serverStarted = true;
        }
      });
      
      // Collect stderr
      serverProcess.stderr.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stderr.write(`  ${text}`);
      });
      
      // Handle server process exit
      serverProcess.on('close', (code) => {
        console.log(`\nServer process exited with code: ${code}`);
        
        if (serverStarted) {
          console.log('\n✅ Server started successfully!');
        } else {
          console.log('\n❌ Server may not have started properly. Check the logs above.');
          hasFailure = true;
        }
        
        resolve();
      });
      
      // Time limit for test (10 seconds)
      setTimeout(() => {
        console.log('\nTest duration (10 seconds) complete, terminating server process...');
        serverProcess.kill();
      }, 10000);
      
    } catch (error) {
      console.error(`\nError starting server: ${error.message}`);
      hasFailure = true;
      resolve();
    }
  });
}

/**
 * HELPER FUNCTIONS
 */

// Test if we can bind to a specific port
async function testPortBinding(port) {
  return new Promise((resolve) => {
    try {
      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Port binding test successful');
      });
      
      server.on('error', (error) => {
        logErrorItem(`Port ${port} binding`, error.message);
        
        if (error.code === 'EACCES') {
          console.log('  (This port requires elevated privileges)');
        } else if (error.code === 'EADDRINUSE') {
          console.log('  (This port is already in use by another process)');
        }
        
        resolve(false);
      });
      
      server.listen(port, '0.0.0.0', () => {
        const addressInfo = server.address();
        logSuccessItem(`Port ${port} binding`, `bound to ${addressInfo.address}:${addressInfo.port}`);
        
        // Try to connect to our own server as a final test
        const req = http.request({
          hostname: 'localhost',
          port: port,
          path: '/',
          method: 'GET',
          timeout: 3000
        }, (res) => {
          logSuccessItem('Self-connection test', `${res.statusCode} ${res.statusMessage}`);
          server.close(() => {
            resolve(true);
          });
        });
        
        req.on('error', (err) => {
          logErrorItem('Self-connection test', err.message);
          server.close(() => {
            resolve(false);
          });
        });
        
        req.end();
      });
    } catch (error) {
      logErrorItem('Port binding test', error.message);
      resolve(false);
    }
  });
}

// Get list of critical paths to verify
function getCriticalPaths() {
  return [
    // Source files
    { name: 'client directory', path: path.resolve(process.cwd(), 'client') },
    { name: 'server directory', path: path.resolve(process.cwd(), 'server') },
    { name: 'client/index.html', path: path.resolve(process.cwd(), 'client', 'index.html') },
    { name: 'server/index.ts', path: path.resolve(process.cwd(), 'server', 'index.ts') },
    { name: 'server/routes.ts', path: path.resolve(process.cwd(), 'server', 'routes.ts') },
    
    // Build files
    { name: 'dist directory', path: path.resolve(process.cwd(), 'dist') },
    { name: 'build-production.js', path: path.resolve(process.cwd(), 'build-production.js') },
    
    // Config files
    { name: 'package.json', path: path.resolve(process.cwd(), 'package.json') },
    { name: 'vite.config.ts', path: path.resolve(process.cwd(), 'vite.config.ts') },
    
    // Build output (if it exists)
    { name: 'dist/client directory', path: path.resolve(process.cwd(), 'dist', 'client') },
    { name: 'dist/server directory', path: path.resolve(process.cwd(), 'dist', 'server') },
    { name: 'dist/server/client directory', path: path.resolve(process.cwd(), 'dist', 'server', 'client') },
    { name: 'dist/server/client/index.html', path: path.resolve(process.cwd(), 'dist', 'server', 'client', 'index.html') },
    { name: 'dist/public directory', path: path.resolve(process.cwd(), 'dist', 'public') },
    { name: 'dist/public/index.html', path: path.resolve(process.cwd(), 'dist', 'public', 'index.html') },
  ];
}

// Helper function to log directory structure
function logDirectoryStructure(dirPath, indent = '', maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth) return;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    // Filter out hidden files and node_modules for clarity
    const visibleItems = items.filter(item => !item.startsWith('.') && item !== 'node_modules');
    
    for (const item of visibleItems) {
      const itemPath = path.join(dirPath, item);
      try {
        const stats = fs.statSync(itemPath);
        const isDir = stats.isDirectory();
        
        console.log(`${indent}${isDir ? '📁' : '📄'} ${item}${isDir ? '/' : ''}`);
        
        if (isDir) {
          logDirectoryStructure(itemPath, `${indent}  `, maxDepth, currentDepth + 1);
        }
      } catch (err) {
        console.log(`${indent}❌ ${item} (error: ${err.message})`);
      }
    }
    
    if (visibleItems.length === 0) {
      console.log(`${indent}(empty directory)`);
    }
  } catch (err) {
    console.error(`${indent}❌ Error reading directory: ${err.message}`);
  }
}

// Format file size for display
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Status logging helpers
function logStatusItem(label, value) {
  console.log(`• ${label}: ${value}`);
}

function logSuccessItem(label, value) {
  console.log(`✅ ${label}: ${value}`);
}

function logErrorItem(label, value) {
  console.log(`❌ ${label}: ${value}`);
  hasFailure = true;
}

function logWarningItem(label, value) {
  console.log(`⚠️ ${label}: ${value}`);
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in diagnostic tool:', error);
  process.exit(1);
});
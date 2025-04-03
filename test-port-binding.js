/**
 * Port Binding Test Script
 * 
 * This script tests if the server can bind to the required port
 * and logs detailed information about the environment and file system.
 * 
 * Usage: node test-port-binding.js [port]
 * If no port is provided, it will use the PORT environment variable or default to 5000.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse port from command line argument or environment variable
const portArg = process.argv[2];
const PORT = portArg ? Number(portArg) : (Number(process.env.PORT) || 5000);

// Log environment information
console.log('=== PORT BINDING TEST ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Current Working Directory:', process.cwd());
console.log('Script Directory:', __dirname);
console.log('Testing port:', PORT);

// Log network interfaces
console.log('\n--- Network Interfaces ---');
const interfaces = os.networkInterfaces();
for (const [name, info] of Object.entries(interfaces)) {
  if (Array.isArray(info)) {
    info.forEach(addr => {
      console.log(`${name}: ${addr.address} (${addr.family}), internal: ${addr.internal}`);
    });
  }
}

// Log process information
console.log('\n--- Process Information ---');
console.log('Process ID:', process.pid);
console.log('User ID:', process.getuid ? process.getuid() : 'N/A');
console.log('Group ID:', process.getgid ? process.getgid() : 'N/A');
console.log('Platform:', process.platform);
console.log('Memory Usage:', process.memoryUsage());

// Log available directories
console.log('\n--- Directory Contents ---');
try {
  const cwd = process.cwd();
  console.log(`Contents of ${cwd}:`);
  fs.readdirSync(cwd).forEach(file => {
    try {
      const stats = fs.statSync(path.join(cwd, file));
      console.log(`  ${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
    } catch (err) {
      console.log(`  ${file} (error reading stats: ${err.message})`);
    }
  });
} catch (err) {
  console.error('Error reading directory:', err);
}

// Test port binding
console.log('\n--- Port Binding Test ---');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Port binding test successful!\n');
});

// Handle errors
server.on('error', (err) => {
  console.error('Port binding failed:', err.message);
  
  if (err.code === 'EACCES') {
    console.error('Permission denied. This port requires elevated privileges.');
  } else if (err.code === 'EADDRINUSE') {
    console.error('Port is already in use. Another process may be using it.');
    
    // Try to get information about what's using the port
    if (process.platform === 'linux') {
      try {
        console.log('\nTrying to identify process using the port...');
        const { execSync } = require('child_process');
        const result = execSync(`lsof -i :${PORT}`).toString();
        console.log(result);
      } catch (execErr) {
        console.log('Could not identify process:', execErr.message);
      }
    }
  }
  
  process.exit(1);
});

// Start listening
server.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log(`Success! Server is listening on ${address.address}:${address.port}`);
  
  // Keep the server running briefly to ensure it's stable
  console.log('Keeping server running for 5 seconds to verify stability...');
  
  // Test connection from the same process
  testConnection();
  
  // Close the server after 5 seconds
  setTimeout(() => {
    server.close(() => {
      console.log('Server closed successfully.');
      process.exit(0);
    });
  }, 5000);
});

// Test connecting to our own server
function testConnection() {
  console.log('\n--- Connection Test ---');
  console.log('Attempting to connect to the server we just started...');
  
  // Make a simple request to our server
  const req = http.request({
    hostname: 'localhost',
    port: PORT,
    path: '/',
    method: 'GET'
  }, (res) => {
    console.log(`Connection successful! Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Response:', data.trim());
    });
  });
  
  req.on('error', (err) => {
    console.error('Connection test failed:', err.message);
  });
  
  req.end();
}
#!/bin/bash

# Diagnostic script for production issues
# This script tests each component of the application separately
# to isolate and identify the issue causing 502 errors in production

echo "=== Production Diagnostic Tool ==="
echo "This script will check various components of your application"
echo "to help diagnose the 502 error in production."
echo ""

# Step 1: Check environment variables
echo "=== Step 1: Environment Variables ==="
echo "NODE_ENV: ${NODE_ENV:-'not set'}"
echo "PORT: ${PORT:-'not set'}"
echo "DATABASE_URL: ${DATABASE_URL:0:10}... (truncated for security)"
echo ""

# Step 2: Check the file system
echo "=== Step 2: File System Check ==="
echo "Current directory: $(pwd)"

echo "Checking build directories..."
if [ -d "dist" ]; then
  echo "✓ dist directory exists"
  echo "  Contents: $(ls -la dist | wc -l) files"
else
  echo "✗ dist directory missing!"
fi

if [ -d "dist/public" ]; then
  echo "✓ dist/public directory exists"
  echo "  Contents: $(ls -la dist/public | wc -l) files"
  
  if [ -f "dist/public/index.html" ]; then
    echo "✓ dist/public/index.html exists"
  else
    echo "✗ dist/public/index.html missing!"
  fi
else
  echo "✗ dist/public directory missing!"
fi

if [ -d "dist/server" ]; then
  echo "✓ dist/server directory exists"
  echo "  Contents: $(ls -la dist/server | wc -l) files"
  
  if [ -f "dist/server/index.js" ]; then
    echo "✓ dist/server/index.js exists"
  else
    echo "✗ dist/server/index.js missing!"
  fi
else
  echo "✗ dist/server directory missing!"
fi
echo ""

# Step 3: Test port binding
echo "=== Step 3: Port Binding Test ==="
echo "Checking if port binding is possible..."
PORT_TO_TEST=${PORT:-5000}

echo "Attempting to bind to port $PORT_TO_TEST..."
node -e "
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Port binding test successful');
});

server.on('error', (err) => {
  console.error('Port binding test failed:', err.message);
  process.exit(1);
});

server.listen($PORT_TO_TEST, '0.0.0.0', () => {
  console.log('✓ Successfully bound to port $PORT_TO_TEST');
  server.close(() => {
    console.log('✓ Port released successfully');
  });
});
" || echo "✗ Failed to bind to port $PORT_TO_TEST"
echo ""

# Step 4: Test database connection
echo "=== Step 4: Database Connection Test ==="
if [ -z "$DATABASE_URL" ]; then
  echo "✗ DATABASE_URL environment variable not set"
else
  echo "DATABASE_URL is set, testing connection..."
  node -e "
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('✗ Database connection failed:', err.message);
      process.exit(1);
    } else {
      console.log('✓ Database connection successful');
      console.log('  Server time:', res.rows[0].now);
      pool.end();
    }
  });" || echo "✗ Failed to connect to database"
fi
echo ""

# Step 5: Test static file serving
echo "=== Step 5: Static File Serving Test ==="
echo "Creating a minimal Express server to test static file serving..."

# Create a temporary file with a minimal Express server
cat > temp-static-server.js << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Check if public directory exists
const publicDir = path.join(process.cwd(), 'dist/public');
if (fs.existsSync(publicDir)) {
  console.log(`✓ Public directory found at: ${publicDir}`);
  console.log(`  Contents: ${fs.readdirSync(publicDir).join(', ')}`);
  
  // Set up static file serving
  app.use(express.static(publicDir));
  console.log('✓ Static middleware configured');
  
  // Serve index.html for all routes
  app.get('*', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
      console.log(`✓ Serving index.html for route: ${req.path}`);
    } else {
      res.status(404).send('index.html not found');
      console.log(`✗ index.html not found at ${indexPath}`);
    }
  });
} else {
  console.log(`✗ Public directory not found at: ${publicDir}`);
  app.get('*', (req, res) => {
    res.status(404).send('Public directory not found');
  });
}

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Test server listening on port ${PORT}`);
  console.log('  Server will automatically shut down after 5 seconds');
  
  // Shut down after 5 seconds
  setTimeout(() => {
    console.log('✓ Test server shutting down');
    process.exit(0);
  }, 5000);
});
EOF

# Run the test server
echo "Starting test static file server (will run for 5 seconds)..."
node temp-static-server.js

# Clean up
rm temp-static-server.js
echo ""

# Step 6: Test server startup
echo "=== Step 6: Server Startup Test ==="
echo "Testing server startup with a timeout..."

# Create a script that will kill the server after 10 seconds
cat > test-server-startup.js << 'EOF'
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Determine server entry point
let serverPath = path.join(process.cwd(), 'dist/server/index.js');
if (!fs.existsSync(serverPath)) {
  console.log(`✗ Server entry point not found at: ${serverPath}`);
  serverPath = path.join(process.cwd(), 'server/index.js');
  console.log(`Trying alternative path: ${serverPath}`);
}

if (!fs.existsSync(serverPath)) {
  console.error('✗ Could not find server entry point');
  process.exit(1);
}

console.log(`✓ Starting server from: ${serverPath}`);

// Set environment for the test
const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: process.env.PORT || 5050 // Use a different port than the main app
};

// Start the server
const server = spawn('node', [serverPath], {
  env,
  stdio: 'pipe' // Capture all output
});

let output = '';

// Capture server output
server.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text); // Forward to parent process
});

server.stderr.on('data', (data) => {
  const text = data.toString();
  output += text;
  process.stderr.write(text); // Forward to parent process
});

// Handle server exit
server.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  
  // Analyze output
  if (output.includes('server listening on port')) {
    console.log('✓ Server started successfully and is listening');
  } else {
    console.log('✗ Server may not have started properly');
  }
  
  // Log findings
  console.log('\nOutput Analysis:');
  
  if (output.includes('EADDRINUSE')) {
    console.log('✗ Port already in use');
  }
  
  if (output.includes('EACCES')) {
    console.log('✗ Permission denied when binding to port');
  }
  
  if (output.includes('Error:')) {
    console.log('✗ Server reported errors');
  }
  
  process.exit(0);
});

// Kill the server after 10 seconds
setTimeout(() => {
  console.log('\nTest timeout reached (10 seconds). Stopping server...');
  server.kill();
}, 10000);
EOF

# Run the server test
node test-server-startup.js

# Clean up
rm test-server-startup.js

echo ""
echo "=== Diagnostic Tests Complete ==="
echo "Review the results above to identify potential issues causing the 502 error."
echo "If you see errors in any of the steps, focus on resolving those specific issues."
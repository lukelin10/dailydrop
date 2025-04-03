#!/bin/bash

# Exit on any error
set -e

echo "=== Production Build Process ==="

# Step 1: Clean up old builds
echo "Cleaning up previous builds..."
rm -rf dist

# Step 2: Create client build with Vite
echo "Building client application with Vite..."
npm run build

# Step 3: Build the server TypeScript code
echo "Compiling server TypeScript code..."
npx tsc --project server/tsconfig.json

# Step 4: Fix import paths in the server code
echo "Fixing import paths in server code..."
node fix-server-imports.js

# Step 5: Copy shared code to the dist folder and fix imports
echo "Setting up shared code..."
mkdir -p dist/shared
cp shared/schema.ts dist/shared/schema.js
# Only add .js extension to imports that don't already have it
sed -i '/\/\// !{/\.js['"'"'"]/ !s|from \(['"'"']\)\([^'"'"']*\)\1|from \1\2.js\1|g}' dist/shared/schema.js

# Step 6: Include debugging utilities
echo "Setting up debugging utilities..."
# Copy to both root and server directories to ensure they can be found
cp production-debug.js dist/production-debug.js
cp production-debug.js dist/server/production-debug.js
cp production-startup-check.js dist/production-startup-check.js
cp production-startup-check.js dist/server/production-startup-check.js
cp test-port-binding.js dist/test-port-binding.js

# Step 7: Set up enhanced entry point for production
echo "Setting up enhanced entry point..."
cp modified-server-index.js dist/server/index.js

# Step 8: Add startup test script
echo "Adding startup test script..."
cat > dist/check-environment.js << 'EOF'
/**
 * Production Environment Check
 * 
 * This script checks the runtime environment to ensure everything is set up correctly
 * before starting the production server.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=== PRODUCTION ENVIRONMENT CHECK ===");
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`Node.js version: ${process.version}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`Script directory: ${__dirname}`);
console.log(`Platform: ${os.platform()} ${os.release()}`);

// Check if client directory exists
const clientDir = path.resolve(__dirname, 'client');
console.log(`Client directory exists: ${fs.existsSync(clientDir)}`);

// Check if server directory exists
const serverDir = path.resolve(__dirname, 'server');
console.log(`Server directory exists: ${fs.existsSync(serverDir)}`);

// Check if index.html exists
const indexHtmlPath = path.resolve(__dirname, 'client', 'index.html');
console.log(`Client index.html exists: ${fs.existsSync(indexHtmlPath)}`);

// Check if server/index.js exists
const serverIndexPath = path.resolve(__dirname, 'server', 'index.js');
console.log(`Server index.js exists: ${fs.existsSync(serverIndexPath)}`);

// Check if server/vite.js exists
const viteJsPath = path.resolve(__dirname, 'server', 'server', 'vite.js');
console.log(`Server vite.js exists: ${fs.existsSync(viteJsPath)}`);

// Check available directories
console.log("\nDirectory listing of current directory:");
try {
  const files = fs.readdirSync(__dirname);
  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    const stats = fs.statSync(filePath);
    console.log(`${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
  });
} catch (error) {
  console.error("Error listing directory:", error);
}

// Check server directory
if (fs.existsSync(serverDir)) {
  console.log("\nDirectory listing of server directory:");
  try {
    const files = fs.readdirSync(serverDir);
    files.forEach(file => {
      const filePath = path.join(serverDir, file);
      const stats = fs.statSync(filePath);
      console.log(`${file} (${stats.isDirectory() ? 'directory' : 'file'})`);
    });
  } catch (error) {
    console.error("Error listing server directory:", error);
  }
}

console.log("\n=== ENVIRONMENT CHECK COMPLETE ===");
EOF

# Step 9: Final verification
echo "Performing final verification..."

# Check for ESM imports in JS files
find dist/server -type f -name "*.js" | while read file; do
  # Check for any remaining @shared references in actual imports
  if grep -q '^[[:space:]]*import.*from.*@shared/' "$file"; then
    echo "ERROR: Found untransformed @shared import in $file"
    grep '^[[:space:]]*import.*from.*@shared/' "$file"
    exit 1
  fi

  # Check for duplicate .js extensions
  if grep -q '\.js\.js' "$file"; then
    echo "ERROR: Found duplicate .js extensions in $file"
    grep '\.js\.js' "$file"
    exit 1
  fi
done

# Check if client build directory exists
if [ ! -d "dist/public" ]; then
  echo "ERROR: Client build directory not found! The server will not be able to serve static files."
  exit 1
fi

# Check for index.html in client build
if [ ! -f "dist/public/index.html" ]; then
  echo "ERROR: Client index.html not found in build directory!"
  exit 1
fi

# Step 10: Create a starting script
cat > dist/start.sh << 'EOF'
#!/bin/bash
echo "Starting production server..."
echo "NODE_ENV: $NODE_ENV"
echo "Current directory: $(pwd)"
echo "Files in this directory: $(ls -la)"

# Run environment check first
echo "Running environment check..."
node check-environment.js

# Check port binding
echo "Testing port binding..."
node test-port-binding.js

# Start the server
echo "Starting the actual server..."
node server/index.js
EOF

chmod +x dist/start.sh

echo "=== Production build completed successfully ==="
echo "To start the server, run: node dist/server/index.js"
echo "Or use the start script: ./dist/start.sh"
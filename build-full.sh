#!/bin/bash

# Exit on any error
set -e

echo "=== Full Production Build Process ==="

# Step 1: Clean up old builds
echo "Cleaning up previous builds..."
rm -rf dist

# Step 2: Build the server first (TypeScript to JavaScript)
echo "Building server..."
bash build-server.sh

# Step 3: Build the client (Vite)
echo "Building client..."
bash build-client.sh

# Step 4: Fix paths in the vite.js file
echo "Fixing path references in vite.js..."
node fix-vite-paths.js

# Step 5: Run the production build script
echo "Finalizing production build..."
bash build-for-production.sh

# Step 6: Make the start script executable
echo "Making start script executable..."
chmod +x dist/start.sh

echo "=== Build completed successfully ==="
echo "To start the server, run: ./dist/start.sh"
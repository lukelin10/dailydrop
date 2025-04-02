#!/bin/bash
set -e

echo "Starting complete build process for production..."

# Step 1: Clean up dist directory if it exists
if [ -d "dist" ]; then
  echo "Cleaning existing dist directory..."
  rm -rf dist
fi

# Step 2: Create necessary directories
echo "Creating build directories..."
mkdir -p dist/shared
mkdir -p dist/server
mkdir -p dist/public

# Step 3: Build the client application
echo "Building client application..."
npm run build

# Step 4: Build the server
echo "Building server application..."
bash build-server.sh

# Step 5: Final verification
echo "Verifying build..."
if [ ! -d "dist/public" ]; then
  echo "ERROR: Client build directory not found!"
  exit 1
fi

if [ ! -f "dist/server/index.js" ]; then
  echo "ERROR: Server entry point not found!"
  exit 1
fi

echo "Build process completed successfully!"
echo "To start the application in production mode, run: node dist/server/index.js"
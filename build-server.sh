#!/bin/bash
set -e

# This script builds the application for production deployment
# using build-production.js which handles both client and server files

echo "========================================="
echo "BUILDING APPLICATION FOR PRODUCTION DEPLOYMENT"
echo "========================================="

echo "Building application..."
node build-production.js

# Copy the server index.js file to the expected location
echo "Fixing server path for deployment..."
mkdir -p dist/server
cp dist/server/server/index.js dist/server/index.js 2>/dev/null || echo "Warning: Could not copy server index.js"

echo "========================================="
echo "Production build completed successfully!"
echo "========================================="
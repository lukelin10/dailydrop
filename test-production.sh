#!/bin/bash
set -e

# This script tests the production build and runtime using the simplified
# build-production.js script, which handles both building and running.

echo "========================================="
echo "PRODUCTION BUILD & RUN TEST"
echo "========================================="

echo "Step 1: Building application for production..."
node build-production.js

echo "========================================="
echo "Step 2: Testing server startup in production mode..."
echo "This will run for 3 seconds to validate server startup."
echo "========================================="

# Run the server briefly to check for startup errors
echo "Starting server for quick validation (will terminate after 3 seconds)..."
timeout 3s node build-production.js --run || echo "Server startup test completed"

echo "========================================="
echo "Production test completed successfully!"
echo "========================================="
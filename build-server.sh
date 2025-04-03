#!/bin/bash
set -e

# This script builds the application for production deployment
# using build-production.js which handles both client and server files

echo "========================================="
echo "BUILDING APPLICATION FOR PRODUCTION DEPLOYMENT"
echo "========================================="

echo "Building application..."
node build-production.js

echo "========================================="
echo "Production build completed successfully!"
echo "========================================="
#!/bin/bash
echo "Building client for production..."

# Set NODE_ENV to production
export NODE_ENV=production

# Create public directory if it doesn't exist
mkdir -p dist/public

# Run vite build
npx vite build --outDir dist/public

# Copy client/index.html to dist/client/
mkdir -p dist/client
cp client/index.html dist/client/

echo "Client build complete."
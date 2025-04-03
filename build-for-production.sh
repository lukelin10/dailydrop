#!/bin/bash
echo "Building application for production..."

# Set environment variables
export NODE_ENV=production

# Build client first (this creates dist/public folder with built assets)
echo "Building client..."
npm run build

# Create a modified version of index.html for development vs production
echo "Creating production-ready client/index.html"
cp client/index.html client/index.html.dev
sed -i 's|<script type="module" src="/src/main.tsx"></script>|<!-- Production build uses assets from public folder -->|' client/index.html

# Build server
echo "Building server..."
cd server
tsc
cd ..

# Reset client/index.html to development version
echo "Restoring development client/index.html"
mv client/index.html.dev client/index.html

# Run the path fix script
echo "Running path fixes for production..."
node fix-paths-for-production.js

echo "Build completed!"
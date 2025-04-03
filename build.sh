#!/bin/bash
echo "Building for production with fixes..."

# Build client application with Vite
echo "Building client application with Vite..."
npm run build

# Build server
echo "Building server..."
cd server
tsc
cd ..

# Run our simple fix script
echo "Applying production build fixes..."
node fix-build.js

echo "Build completed successfully!"
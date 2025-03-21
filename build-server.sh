#!/bin/bash
set -e

echo "Starting server build process..."

# Step 1: Clean and create build directories
rm -rf dist
mkdir -p dist/server
mkdir -p dist/shared

# Step 2: Compile TypeScript files
echo "Compiling TypeScript files..."
npx tsc -p server/tsconfig.json

# Step 3: Ensure .js extensions are properly added to imports
echo "Processing import statements..."
find dist -type f -name "*.js" | while read file; do
  sed -i 's/from "\.\//from "\.\//' "$file"
  sed -i 's/from "\.\./from "\.\.' "$file"
  sed -i 's/\([^.]\)"\([^"]*\)";/\1"\2.js";/g' "$file"
done

# Step 4: Copy necessary files
echo "Copying additional files..."
cp shared/schema.ts dist/shared/schema.js
cp dist/server/server/index.js dist/server/index.js

echo "Server build completed successfully"
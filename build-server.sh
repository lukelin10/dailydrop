#!/bin/bash
set -e

echo "Starting server build process..."

# Step 1: Ensure build directories exist
mkdir -p dist/shared
mkdir -p dist/server

# Step 2: Compile server TypeScript code
echo "Compiling server TypeScript code..."
npx tsc -p server/tsconfig.json

# Step 3: Copy and transform shared schema
echo "Processing shared schema..."
cp shared/schema.ts dist/shared/schema.js
sed -i 's/import {.*} from "\(.*\)";/import {\1} from "\1.js";/g' dist/shared/schema.js

# Step 4: Fix import paths in server files
echo "Fixing import paths in server files..."
for file in dist/server/server/*.js; do
  # Convert @shared imports to relative paths
  sed -i 's|from ["'"'"']@shared/\([^"'"'"']*\)["'"'"']|from "../shared/\1.js"|g' "$file"
  # Add .js extension to relative imports
  sed -i 's|from ["'"'"']\./\([^"'"'"']*\)["'"'"']|from "./\1.js"|g' "$file"
  sed -i 's|from ["'"'"']\.\.\/\([^"'"'"']*\)["'"'"']|from "../\1.js"|g' "$file"
done

# Step 5: Move index.js to correct location
echo "Setting up entry point..."
cp dist/server/server/index.js dist/server/index.js

# Step 6: Verify critical files
echo "Verifying build artifacts..."
required_files=("dist/server/index.js" "dist/shared/schema.js")
for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Required file $file is missing!"
    exit 1
  fi
done

echo "Server build completed successfully"
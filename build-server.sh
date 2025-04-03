#!/bin/bash
set -e

echo "Starting server build process..."

# Step 1: Ensure build directories exist
mkdir -p dist/shared
mkdir -p dist/server

# Step 1.5: Build the client application first
echo "Building client application with Vite..."
npm run build

# Step 2: Compile TypeScript code
echo "Compiling server TypeScript code..."
npx tsc -p server/tsconfig.json

# Step 3: Clean up any existing duplicate .js extensions
echo "Cleaning up duplicate .js extensions..."
find dist/server -type f -name "*.js" | while read file; do
  echo "Checking file: $file"
  # Replace multiple .js extensions with a single one
  if grep -q '\.js\.js' "$file"; then
    echo "Fixing duplicate .js extensions in $file"
    sed -i 's/\.js\.js/\.js/g' "$file"
  fi
done

# Step 4: Process import paths
echo "Processing import paths..."
find dist/server -type f -name "*.js" | while read file; do
  echo "Processing file: $file"

  # Only process actual import statements, ignore comments
  if grep -q '^[[:space:]]*import.*from.*@shared/' "$file"; then
    echo "Converting @shared imports in $file"
    # Get relative path to shared directory
    rel_path=$(realpath --relative-to="$(dirname "$file")" "$(dirname "$file")/../shared")
    rel_path=${rel_path//\\/\/} # Normalize path separators

    # Transform @shared imports, handling both quote types
    sed -i '/^[[:space:]]*import.*from.*@shared\// {
      /\/\// !{
        /\.js['"'"'"]/ !s|from ['"'"']@shared/\([^'"'"']*\)['"'"']|from "'"$rel_path"'/\1.js"|g
      }
    }' "$file"
  fi

  # Add .js extension to local imports (only if missing)
  echo "Processing local imports in $file"
  # Handle ./ imports
  sed -i '/^[[:space:]]*import.*from.*['"'"'"]\.\/[^"]*['"'"']/ {
    /\/\// !{
      /\.js['"'"'"]/ !s|from \(['"'"']\)\./\([^'"'"']*\)\1|from \1./\2.js\1|g
    }
  }' "$file"
  # Handle ../ imports
  sed -i '/^[[:space:]]*import.*from.*['"'"'"]\.\.\/[^"]*['"'"']/ {
    /\/\// !{
      /\.js['"'"'"]/ !s|from \(['"'"']\)../\([^'"'"']*\)\1|from \1../\2.js\1|g
    }
  }' "$file"
done

# Step 5: Copy and transform schema
echo "Processing shared schema..."
cp shared/schema.ts dist/shared/schema.js
# Only add .js extension to imports that don't already have it
sed -i '/\/\// !{/\.js['"'"'"]/ !s|from \(['"'"']\)\([^'"'"']*\)\1|from \1\2.js\1|g}' dist/shared/schema.js

# Step 6: Include debug utilities for production
echo "Adding production debugging utilities..."
# Copy to both locations to ensure it's found regardless of where the server is started from
cp production-debug.js dist/production-debug.js
cp production-debug.js dist/server/production-debug.js
cp production-startup-check.js dist/production-startup-check.js
cp production-startup-check.js dist/server/production-startup-check.js

# Step 6.5: Set up enhanced entry point for production
echo "Setting up enhanced entry point..."
cp modified-server-index.js dist/server/index.js

# Step 7: Final verification
echo "Performing final verification..."
find dist/server -type f -name "*.js" | while read file; do
  # Check for any remaining @shared references in actual imports
  if grep -q '^[[:space:]]*import.*from.*@shared/' "$file"; then
    echo "ERROR: Found untransformed @shared import in $file"
    grep '^[[:space:]]*import.*from.*@shared/' "$file"
    exit 1
  fi

  # Check for duplicate .js extensions
  if grep -q '\.js\.js' "$file"; then
    echo "ERROR: Found duplicate .js extensions in $file"
    grep '\.js\.js' "$file"
    exit 1
  fi
done

# Check if client build directory exists
if [ ! -d "dist/public" ]; then
  echo "ERROR: Client build directory not found! The server will not be able to serve static files."
  exit 1
fi

# Check for index.html in client build
if [ ! -f "dist/public/index.html" ]; then
  echo "ERROR: Client index.html not found in build directory!"
  exit 1
fi

echo "Server build completed successfully"
#!/bin/bash
set -e

echo "Starting comprehensive production build process..."

# Step 1: Clean the dist directory to start fresh
echo "Cleaning dist directory..."
rm -rf dist
mkdir -p dist/shared
mkdir -p dist/server
mkdir -p dist/server/server/public

# Step 2: Build the client application with Vite
echo "Building client application with Vite..."
npm run build

# Step 3: Compile server TypeScript code
echo "Compiling server TypeScript code..."
npx tsc -p server/tsconfig.json

# Step 4: Clean up duplicate .js extensions
echo "Cleaning up duplicate .js extensions..."
find dist/server -type f -name "*.js" | while read file; do
  # Replace multiple .js extensions with a single one
  if grep -q '\.js\.js' "$file"; then
    echo "Fixing duplicate .js extensions in $file"
    sed -i 's/\.js\.js/\.js/g' "$file"
  fi
done

# Step 5: Process import paths in server files
echo "Processing import paths in server files..."
find dist/server -type f -name "*.js" | while read file; do
  # Transform @shared imports, handling both quote types
  if grep -q '^[[:space:]]*import.*from.*@shared/' "$file"; then
    echo "Converting @shared imports in $file"
    # Get relative path to shared directory
    rel_path=$(realpath --relative-to="$(dirname "$file")" "$(dirname "$file")/../shared")
    rel_path=${rel_path//\\/\/} # Normalize path separators

    # Transform @shared imports
    sed -i '/^[[:space:]]*import.*from.*@shared\// {
      /\/\// !{
        /\.js['"'"'"]/ !s|from ['"'"']@shared/\([^'"'"']*\)['"'"']|from "'"$rel_path"'/\1.js"|g
      }
    }' "$file"
  fi

  # Add .js extension to local imports (only if missing)
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

# Step 6: Process shared schema
echo "Processing shared schema..."
cp shared/schema.ts dist/shared/schema.js
# Only add .js extension to imports that don't already have it
sed -i '/\/\// !{/\.js['"'"'"]/ !s|from \(['"'"']\)\([^'"'"']*\)\1|from \1\2.js\1|g}' dist/shared/schema.js

# Step 7: Add debugging utilities for production
echo "Adding production debugging utilities..."
cp production-debug.js dist/production-debug.js

# Step 8: Set up enhanced entry point for production
echo "Setting up enhanced entry point..."
cp modified-server-index.js dist/server/index.js

# Step 9: Create symbolic link to ensure static files are found
echo "Setting up symbolic links for static files..."
# Ensure correct paths for static files (various potential locations)
if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
  # Create symbolic link from server/server/public to dist/public
  echo "Creating symbolic link from server/server/public to dist/public..."
  ln -sf $(realpath dist/public) dist/server/server/public
  
  # Alternative paths that might be needed
  mkdir -p dist/server/public
  ln -sf $(realpath dist/public) dist/server/public
else
  echo "ERROR: Client build files not found in dist/public!"
  exit 1
fi

# Step 10: Final verification
echo "Performing final verification..."
# Check for any remaining @shared references
find dist/server -type f -name "*.js" | while read file; do
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

# Check for client build files
if [ ! -d "dist/public" ] || [ ! -f "dist/public/index.html" ]; then
  echo "ERROR: Client build files missing! Check for build errors."
  exit 1
fi

# Check for server files
if [ ! -f "dist/server/index.js" ]; then
  echo "ERROR: Server entry point missing!"
  exit 1
fi

# Dump directory structure for verification
echo "Final dist directory structure:"
find dist -type f | sort

echo "Production build completed successfully!"
echo "To test locally, run: NODE_ENV=production node dist/server/index.js"
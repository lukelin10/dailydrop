#!/bin/bash
set -e

echo "Starting server build process..."

# Step 1: Ensure build directories exist
mkdir -p dist/shared
mkdir -p dist/server

# Step 2: Compile server TypeScript code
echo "Compiling server TypeScript code..."
npx tsc -p server/tsconfig.json

# Step 3: Transform path aliases
echo "Transforming path aliases..."
npx tsc-alias -p server/tsconfig.json

# Step 4: Ensure shared schema is available
echo "Processing shared schema..."
node build.js

# Step 5: Verify the result
echo "Verifying compiled server files..."
for file in dist/server/auth.js dist/server/db.js dist/server/storage.js dist/server/routes.js; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
        # Check for @shared/ references that didn't get transformed
        if grep -q '@shared/' "$file"; then
            echo "⚠️ WARNING: $file still contains @shared/ imports!"
            # Manual fix as a last resort
            sed -i 's|from ["'"'"']@shared\/\([^"'"'"']*\)["'"'"']|from "../shared/\1.js"|g' "$file"
            echo "Applied manual fix to $file"
        else
            echo "✓ $file imports look correct"
        fi

        # Also check and fix relative imports without .js extension
        if grep -q 'from ["'"'"']\./[^"'"'"']*["'"'"']' "$file" | grep -v '\.js'; then
            echo "⚠️ WARNING: $file contains relative imports without .js extension!"
            # Fix relative imports
            sed -i 's|from ["'"'"']\./\([^"'"'"']*\)["'"'"']|from "./\1.js"|g' "$file"
            echo "Fixed relative imports in $file"
        fi
    else
        echo "✗ $file is missing"
    fi
done

echo "Server build completed successfully"
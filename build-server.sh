
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

# Step 5: Fix import paths
echo "Fixing import paths in server files..."
node fix-server-imports.js

# Step 6: Copy the index.js file to the expected location for deployment
echo "Copying index.js to deployment location..."
mkdir -p dist/server
cp dist/server/server/index.js dist/server/index.js

# Step 6: Verify the result
echo "Verifying compiled server files..."
for file in dist/server/server/auth.js dist/server/server/db.js dist/server/server/storage.js dist/server/server/routes.js dist/server/server/index.js; do
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
        if [ "$file" = "dist/server/index.js" ]; then
            echo "ERROR: index.js is missing! Build failed."
            exit 1
        fi
    fi
done

echo "Server build completed successfully"

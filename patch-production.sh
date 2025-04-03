#!/bin/bash
echo "Patching production build to fix the 502 error..."

# Check if the build exists
if [ ! -d "dist/public" ]; then
  echo "Error: No production build found. Run build-for-production.sh first."
  exit 1
fi

# Create directories if they don't exist
mkdir -p dist/client
mkdir -p dist/server/client
mkdir -p dist/server/server/client

# Copy the production index.html to all possible locations
echo "Copying production index.html to all necessary locations..."
cp dist/public/index.html dist/client/index.html
cp dist/public/index.html dist/server/client/index.html
cp dist/server/client/index.html dist/server/server/client/index.html

# Check if our patched vite.js exists
if [ -f "dist/server/server/vite.js" ]; then
  # Backup the original
  cp dist/server/server/vite.js dist/server/server/vite.js.bak
  
  # Modify the vite.js file to add better path handling
  echo "Updating vite.js with better path handling..."
  sed -i 's|const distPath = path.resolve(__dirname, "public");|const distPath = path.resolve(__dirname, "..", "..", "public");|g' dist/server/server/vite.js
  
  # Create enhanced path handling for the fallback route
  cat > temp_fallback.js << 'EOF'
app.use("*", (req, res) => {
    // Try to send from public directory first
    const publicIndexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(publicIndexPath)) {
      console.log("[Production] Serving index.html from public directory");
      return res.sendFile(publicIndexPath);
    }
    
    // Fall back to client directory if public index doesn't exist
    const clientIndexPath = path.resolve(__dirname, "..", "client", "index.html");
    if (fs.existsSync(clientIndexPath)) {
      console.log("[Production] Serving index.html from client directory");
      return res.sendFile(clientIndexPath);
    }
    
    // Nothing found, send a readable error
    console.error("[Production] Could not find index.html in any location");
    res.status(500).send("Error: Could not find index.html file. Please check the server logs for details.");
  });
EOF
  
  # Replace the fallback route handler
  sed -i '/app.use("\*", ([^}]*});/,/});/c\'"$(cat temp_fallback.js)" dist/server/server/vite.js
  rm temp_fallback.js
  
  echo "vite.js has been patched with better path handling."
else
  echo "Warning: vite.js not found at dist/server/server/vite.js"
fi

echo "Patch completed. The 502 error should now be fixed."
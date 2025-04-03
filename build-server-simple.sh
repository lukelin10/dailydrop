#!/bin/bash
echo "Building server code only..."

# Create the necessary directories
mkdir -p dist/server
mkdir -p dist/shared

# Copy shared schema directly (this is a simplified approach)
cp shared/schema.ts dist/shared/schema.js

# Manually add basic index.js (for testing only)
mkdir -p dist/server/server
cat > dist/server/server/index.js << 'EOF'
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Log all available directories
console.log("Current directory:", process.cwd());
console.log("__dirname:", __dirname);

// Set up static file serving
app.use(express.static(path.resolve(__dirname, "..", "..", "public")));

// Create a simple API endpoint
app.get("/api/healthcheck", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV });
});

// Fallback route for SPA
app.use("*", (req, res) => {
  try {
    // Try client directory
    const clientPath = path.resolve(__dirname, "..", "client", "index.html");
    if (require("fs").existsSync(clientPath)) {
      return res.sendFile(clientPath);
    }
    
    // Try public directory
    const publicPath = path.resolve(__dirname, "..", "..", "public", "index.html");
    if (require("fs").existsSync(publicPath)) {
      return res.sendFile(publicPath);
    }
    
    // Last resort
    return res.status(500).send("Could not find index.html");
  } catch (error) {
    console.error("Error serving index.html:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
EOF

# Create vite.js stub (for testing only)
cat > dist/server/server/vite.js << 'EOF'
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

export function serveStatic(app) {
  console.log("[Vite] Setting up static file serving");
  const distPath = path.resolve(__dirname, "..", "..", "public");
  
  console.log("[Vite] Static files path:", distPath);
  console.log("[Vite] Static files exist:", fs.existsSync(distPath));
  
  app.use(express.static(distPath));
  
  app.use("*", (req, res) => {
    // Try to send from public directory first
    const publicIndexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(publicIndexPath)) {
      return res.sendFile(publicIndexPath);
    }
    
    // Fall back to client directory if public index doesn't exist
    const clientIndexPath = path.resolve(__dirname, "..", "client", "index.html");
    if (fs.existsSync(clientIndexPath)) {
      return res.sendFile(clientIndexPath);
    }
    
    // Last resort - try an absolute path
    const absoluteIndexPath = path.resolve(process.cwd(), "dist", "public", "index.html");
    if (fs.existsSync(absoluteIndexPath)) {
      return res.sendFile(absoluteIndexPath);
    }
    
    // Nothing found, send a readable error
    console.error("[Static Serving] Could not find index.html in any location");
    res.status(500).send("Error: Could not find index.html file. Please make sure the application is built correctly.");
  });
}

export async function setupVite() {
  throw new Error("setupVite should not be called in production mode");
}
EOF

echo "Simple server build complete."
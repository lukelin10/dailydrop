/**
 * Modified Server Entry Point for Production
 * 
 * This file extends the original server/index.ts with additional
 * debugging and path fixing capabilities for production.
 */
import express from "express";
import { registerRoutes } from "./server/routes.js";
import { setupVite, serveStatic, log } from "./server/vite.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import production startup diagnostics
let runAllDiagnostics;
try {
  const { runAllDiagnostics: diagnostics } = await import('./production-startup-check.js');
  runAllDiagnostics = diagnostics;
  console.log('Successfully imported production-startup-check.js');
} catch (error) {
  try {
    const { runAllDiagnostics: diagnostics } = await import('../production-startup-check.js');
    runAllDiagnostics = diagnostics;
    console.log('Successfully imported production-startup-check.js from parent directory');
  } catch (secondError) {
    console.error('Failed to import production-startup-check.js', secondError.message);
    runAllDiagnostics = async () => {
      console.log('Using fallback diagnostics');
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('Current working directory:', process.cwd());
    };
  }
}

// Dynamic import of production-debug.js - try multiple possible locations
let logProductionEnvironment, createSymlinkIfNeeded;

try {
  // First try the same directory
  const { logProductionEnvironment: log1, createSymlinkIfNeeded: create1 } = await import('./production-debug.js');
  logProductionEnvironment = log1;
  createSymlinkIfNeeded = create1;
  console.log('Successfully imported production-debug.js from server directory');
} catch (error) {
  console.log('Failed to import production-debug.js from server directory, trying root directory...');
  try {
    // Then try the root directory
    const { logProductionEnvironment: log2, createSymlinkIfNeeded: create2 } = await import('../production-debug.js');
    logProductionEnvironment = log2;
    createSymlinkIfNeeded = create2;
    console.log('Successfully imported production-debug.js from root directory');
  } catch (secondError) {
    console.error('Failed to import production-debug.js from all locations:', secondError.message);
    // Provide fallback implementations if the module can't be loaded
    logProductionEnvironment = () => {
      console.log('Using fallback production environment logger');
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('Current working directory:', process.cwd());
      console.log('__dirname:', __dirname);
    };
    createSymlinkIfNeeded = () => {
      console.log('Using fallback symlink creator (does nothing)');
    };
  }
}

// Log environment information for debugging in production
console.log('Starting server with enhanced debugging...');
logProductionEnvironment();

// Run startup diagnostics if not in development mode
if (process.env.NODE_ENV !== 'development') {
  console.log('Running production startup diagnostics...');
  try {
    await runAllDiagnostics();
  } catch (error) {
    console.error('Error running diagnostics:', error);
  }
}

// Initialize Express application
const app = express();

// Set up middleware for parsing JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use a modified static file serving approach for production
function enhancedServeStatic(app) {
  console.log('Setting up enhanced static file serving for production...');
  
  // Get current directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // First try the original path that serveStatic would use
  const originalDistPath = path.resolve(__dirname, "server/public");
  
  // Alternative paths to try
  const altPath1 = path.resolve(process.cwd(), "dist/public");
  const altPath2 = path.resolve(__dirname, "../../public");
  const altPath3 = path.resolve(__dirname, "../public");
  
  // Try all possible paths for the static files
  const possiblePaths = [originalDistPath, altPath1, altPath2, altPath3];
  let staticPath = null;
  
  for (const testPath of possiblePaths) {
    console.log(`Checking for static files at: ${testPath}`);
    if (fs.existsSync(testPath) && fs.existsSync(path.join(testPath, 'index.html'))) {
      console.log(`Found valid static files at: ${testPath}`);
      staticPath = testPath;
      break;
    }
  }
  
  if (!staticPath) {
    console.error('CRITICAL ERROR: Could not find static files in any expected location!');
    console.error('This will result in 502 errors for client requests.');
    console.error('Attempted paths:', possiblePaths);
    // Try to create symlink as a last resort
    createSymlinkIfNeeded();
    // Fall back to the original dist path even if it doesn't exist
    staticPath = originalDistPath;
  }
  
  console.log(`Using static path: ${staticPath}`);
  app.use(express.static(staticPath));
  
  // Fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(staticPath, "index.html");
    console.log(`Serving index.html from: ${indexPath}`);
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`ERROR: index.html not found at ${indexPath}`);
      res.status(500).send('Server Error: index.html not found in build');
    }
  });
}

/**
 * Request logging middleware
 */
app.use((req, res, next) => {
  // Record start time for calculating request duration
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  // Override res.json to capture response body for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log details after response is sent
  res.on("finish", () => {
    const duration = Date.now() - start;
    // Only log API requests
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // Truncate long log lines for readability
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * Server initialization
 */
(async () => {
  try {
    // Register all API routes and get the HTTP server instance
    const server = registerRoutes(app);

    /**
     * Global error handling middleware
     */
    app.use((err, _req, res, _next) => {
      console.error('Server error:', err);
      // Extract status code from error object or default to 500
      const status = err.status || err.statusCode || 500;
      // Extract error message or use generic message
      const message = err.message || "Internal Server Error";

      // Send error response to client
      res.status(status).json({ message });
    });

    /**
     * Frontend serving setup
     */
    if (app.get("env") === "development") {
      console.log('Setting up Vite dev server');
      await setupVite(app, server);
    } else {
      console.log('Setting up production static file serving');
      // Use enhanced static file serving for production
      enhancedServeStatic(app);
    }

    /**
     * Start server listening
     */
    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Fatal server initialization error:', error);
    process.exit(1);
  }
})();
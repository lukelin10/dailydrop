/**
 * Server Entry Point
 * 
 * This file is the main entry point for the Express server. It:
 * 1. Sets up middleware for request parsing
 * 2. Configures logging for API requests
 * 3. Registers all application routes
 * 4. Sets up error handling
 * 5. Configures Vite for development or static file serving for production
 * 6. Starts the server
 */
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";

// Initialize Express application
const app = express();

// Set up middleware for parsing JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * Request logging middleware
 * 
 * This middleware captures information about incoming API requests and logs:
 * - HTTP method (GET, POST, etc.)
 * - Path (/api/...)
 * - Status code (200, 404, etc.)
 * - Response time in milliseconds
 * - Response body (JSON, truncated to 80 characters)
 */
app.use((req, res, next) => {
  // Record start time for calculating request duration
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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
 * Server initialization and configuration
 * 
 * The application server is set up as an immediately invoked async function 
 * to allow for proper async/await handling during initialization.
 */
(async () => {
  /**
   * API_ROUTES_FIRST is a special flag used in production to ensure
   * that API routes are registered before the catch-all static file serving.
   * Without this, the static file serving would capture all API requests 
   * and return the index.html instead of JSON responses.
   */
  const apiRoutesFirst = process.env.API_ROUTES_FIRST === 'true';
  
  let server;
  
  if (apiRoutesFirst || app.get("env") === "development") {
    // Register API routes first, then serve static files
    console.log("Registering API routes before static file serving...");
    server = registerRoutes(app);
    
    /**
     * Global error handling middleware
     */
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      // Extract status code from error object or default to 500
      const status = err.status || err.statusCode || 500;
      // Extract error message or use generic message
      const message = err.message || "Internal Server Error";
  
      // Send error response to client
      res.status(status).json({ message });
      throw err; // Re-throw for logging purposes
    });
    
    /**
     * Frontend serving setup AFTER API routes
     */
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  } else {
    // Legacy production mode - first static files, then API routes
    // This is kept only for backward compatibility
    console.log("LEGACY MODE: Static file serving before API routes (not recommended)");
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    server = registerRoutes(app);
    
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });
  }

  /**
   * Start server listening on specified port
   * 
   * The server listens on all network interfaces (0.0.0.0)
   * and serves both the API and the client application
   */
  const PORT = Number(process.env.PORT) || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();

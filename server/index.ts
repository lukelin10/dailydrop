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
  // Register all API routes and get the HTTP server instance
  const server = registerRoutes(app);

  /**
   * Global error handling middleware
   * 
   * This middleware catches any errors thrown during request processing
   * and returns a proper error response to the client.
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
   * Frontend serving setup
   * 
   * In development mode, Vite handles serving the React frontend
   * In production, static files are served from the built assets
   * 
   * Note: This must be set up after all API routes to avoid Vite's
   * catch-all route from interfering with API endpoints
   */
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
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

# DailyDrop

A daily journaling app that prompts users with thoughtful questions and analyzes responses over time.

## Features

- A new thoughtful question daily
- Simple, focused interface
- Stores your journal entries
- Text analysis to find patterns
- Sharable insights (public links)

## Technologies

- React (w/ TypeScript) for smooth UI
- Firebase authentication
- PostgreSQL for data storage
- Express API backend
- Shadcn for modern UI components

## Build & Deployment Instructions

### Development Mode

To run the application in development mode:

1. Make sure all dependencies are installed:
   ```
   npm install
   ```

2. Start the application workflow:
   ```
   npm run dev
   ```

### Building for Production

To build the application for production, we've simplified the process to a single script:

1. Build the application:
   ```
   node build-production.js
   ```

2. Run the production server:
   ```
   node build-production.js --run
   ```

### Understanding the 502 Error Fix

The 502 errors in production were caused by path resolution issues:

1. In development, the server runs from the project root and can easily find `client/index.html`.
2. In production, the server runs from `dist/server/` but still expects to find `../client/index.html`.
3. The specific error was "Pre-transform error: Failed to load url /src/main.tsx", indicating Vite was incorrectly trying to load development source files.
4. Our solution:
   - Creates a modified server entry point specifically for production
   - Uses ESM module syntax (import/export) to match the project's module type
   - Copies index.html to all necessary locations to ensure it's always found
   - Provides fallbacks and automatic recovery mechanisms

### How the Build Script Works

Our `build-production.js` script consolidates multiple scripts into a single solution:

1. **Building**: Runs the frontend build process with Vite
2. **Quick-Start Solution**: Creates a modified server entry point (`dist/modified-server-index.js`) that:
   - Uses ES module syntax required by the project
   - Handles all path resolution issues at runtime
   - Starts the server with proper environment variables
3. **Path Fixing**: Ensures index.html is placed in all required locations:
   - `dist/server/client/index.html`
   - `dist/server/server/client/index.html` 
4. **Running**: When called with `--run`, sets NODE_ENV to production and starts the server with all fixes applied
5. **Error Recovery**: Includes fallback mechanisms if the primary approach fails

### Troubleshooting

If you encounter issues in production:

1. **Missing Files**: The most common cause is missing index.html files. The script should place them automatically.

2. **Manual Fix**: If needed, you can manually copy the file:
   ```bash
   mkdir -p dist/server/client dist/server/server/client
   cp client/index.html dist/server/client/
   cp client/index.html dist/server/server/client/
   ```

3. **Emergency Restart**: The run mode includes emergency fixes:
   ```bash
   node build-production.js --run
   ```

### Testing Production Build

We've included a test script that can be used to verify the production build works correctly:

```bash
chmod +x test-production.sh
./test-production.sh
```

This script:
1. Builds the application for production
2. Starts the server briefly to validate it launches without errors
3. Provides detailed logs about any issues encountered

The test script is designed to terminate automatically after a few seconds so it can be used for quick validation.
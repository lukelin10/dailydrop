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

To build the application for production:

1. Use the comprehensive build script:
   ```
   ./build-full.sh
   ```

   This script will:
   - Clean up previous builds
   - Build the server TypeScript code
   - Build the client with Vite
   - Fix path references for production
   - Create a ready-to-run production build in the `dist` directory

2. Start the server in production mode:
   ```
   cd dist
   ./start.sh
   ```

### Alternative Build Options

If you need more control over the build process, you can use the individual scripts:

- `./build-server.sh` - Builds only the server code
- `./build-client.sh` - Builds only the client code
- `./build-for-production.sh` - Finalizes the production build

### Deploying to Replit

To deploy this application on Replit:

1. Make sure all changes are committed to the repository
2. Run the full build script:
   ```
   ./build-full.sh
   ```
3. Click the "Deploy" button in the Replit interface
4. The deployment process will package and configure the built application for production

### Understanding the Build Process

Our build process is specifically designed to address path resolution issues in production:

1. **Server Build**: Compiles TypeScript server code to JavaScript, maintaining proper import paths.
2. **Client Build**: Uses Vite to build optimized assets for the frontend.
3. **Path Fixing**: Runs scripts to ensure compiled server code correctly references client files.
4. **Directory Structure**: Creates multiple copies of critical files (like index.html) in all locations where the server might look for them.
5. **Validation**: Verifies the build integrity and file presence before finalizing.

### Troubleshooting Production Issues

If you encounter a 502 error in production:

#### Step 1: Run the diagnostics

```bash
cd dist
# Check environment
node check-environment.js

# Run the path debug tool
node path-debug.js

# Test port binding
node test-port-binding.js
```

#### Step 2: Check critical file locations

Our application needs index.html in specific locations:

```bash
# Check if the index.html exists in all required locations
ls -la dist/client/index.html
ls -la dist/server/client/index.html
ls -la dist/server/server/client/index.html
ls -la dist/public/index.html
```

If any of these files are missing, you can manually copy them:

```bash
mkdir -p dist/server/client
cp client/index.html dist/server/client/
mkdir -p dist/server/server/client
cp client/index.html dist/server/server/client/
```

#### Step 3: Verify vite.js path resolution

The `dist/server/server/vite.js` file needs to correctly resolve paths:

```bash
# Check the paths in vite.js
grep -n "path.resolve" dist/server/server/vite.js
```

Expected output should include:
- `const distPath = path.resolve(__dirname, "..", "..", "public");` (for static assets)
- References to `clientTemplate` paths

#### Step 4: Restart with the included script

The start.sh script includes additional safeguards:

```bash
# Make it executable if needed
chmod +x dist/start.sh

# Run with production environment
NODE_ENV=production ./dist/start.sh
```

#### Common Issues and Solutions

1. **Missing Files**: Our build process places index.html in multiple locations to handle different path resolutions.

2. **Path Resolution**: Make sure all script references in index.html use absolute paths (start with `/`).

3. **Symlink Creation**: The start.sh script attempts to create missing directories and files at startup.

4. **Server Paths**: In production, the server is running from `dist/server/` but needs to access files in other directories.

5. **Build Order**: Always follow the complete build process via `build-full.sh` to ensure all path fixing scripts are run.

#### Advanced Debugging

For in-depth diagnostics:

```bash
# Run detailed environment checks
NODE_ENV=production node dist/production-startup-check.js

# Examine Vite path resolution
node dist/path-debug.js

# Check server logs with debugging enabled
DEBUG=express:* NODE_ENV=production node dist/server/index.js
```

### Understanding the 502 Error Fix

The 502 errors were caused by path resolution issues between development and production environments:

1. In development, the server runs from the project root and can easily find `client/index.html`.
2. In production, the server runs from `dist/server/` but the vite.js file still expects to find `../client/index.html`.
3. Our solution places index.html in multiple locations to ensure it's always found, regardless of where path resolution happens.
4. The fix-vite-paths.js script modifies the compiled vite.js file to add additional error handling and path resolution logic.
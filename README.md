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

### Troubleshooting Production Issues

If you encounter a 502 error in production:

1. Check the server logs for path resolution errors:
   ```
   cd dist
   node check-environment.js
   ```

2. Verify paths in the vite.js file:
   ```
   cat dist/server/server/vite.js | grep 'src'
   ```

3. Common issues and solutions:
   - **Path Resolution**: Ensure client/index.html uses absolute paths for scripts (`/src/main.tsx` not `./src/main.tsx`)
   - **Missing Files**: Verify that `dist/client/index.html` and `dist/public/index.html` both exist
   - **Port Binding**: Use the test script `node dist/test-port-binding.js` to check if the server can bind to the required port
   - **Directory Structure**: Ensure the build process properly copied all required files (check with `ls -la dist`)

4. For in-depth diagnostics, use:
   ```
   NODE_ENV=production node dist/production-startup-check.js
   ```

For more detailed debugging, review the logs produced during the build and startup processes.
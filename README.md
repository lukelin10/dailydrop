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
3. Our solution copies index.html to the necessary locations to ensure it's always found.

### How the Build Script Works

Our `build-production.js` script handles the entire process:

1. **Building**: Runs the standard build process via `npm run build`
2. **Path Fixing**: Ensures index.html is placed in all required locations:
   - `dist/server/client/index.html`
   - `dist/server/server/client/index.html`
3. **Running**: When called with `--run`, sets NODE_ENV to production and starts the server

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
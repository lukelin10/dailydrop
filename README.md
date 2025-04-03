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

## Deployment Instructions

To deploy this application on Replit:

1. Make sure all changes are committed to the repository
2. Click the "Deploy" button in the Replit interface
3. The deployment process will:
   - Build the client and server code using our production build script
   - Package all assets properly for production use
   - Configure the environment for production

### Manual Deployment Testing

If you need to test the production build locally before deploying:

1. Run the production build script:
   ```
   ./build-for-production.sh
   ```

2. Start the server in production mode:
   ```
   NODE_ENV=production node dist/server/index.js
   ```

### Troubleshooting

If you encounter a 502 error in production:

1. Check the logs for path resolution errors
2. Verify that client files were properly built and included in the deployment
3. Check the symbolic links between server/server/public and dist/public

For more detailed debugging, review the logs produced during the build process.
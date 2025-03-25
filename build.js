import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting build process...');

// Ensure the dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

try {
  // Build the client first
  console.log('Building client...');
  execSync('npx vite build', { stdio: 'inherit' });

  // Run the server build script
  console.log('Building server...');
  execSync('bash build-server.sh', { stdio: 'inherit' });

  // Ensure client files are in all possible locations the server might look for them
  console.log('Ensuring client files are where the server expects them...');
  
  // Possible locations where the server might look for client files
  const possibleServerPaths = [
    'dist/server/server/public',  // Based on vite.ts path resolution in production
    'dist/server/public',         // Alternative path the server might use
    'dist/public'                 // Default vite output path
  ];
  
  // Copy client files to all possible locations
  const clientDistDir = path.join(__dirname, 'dist/public');
  
  if (fs.existsSync(clientDistDir)) {
    // Copy to all possible server locations
    for (const serverPath of possibleServerPaths) {
      const fullServerPath = path.join(__dirname, serverPath);
      
      // Create the directory if it doesn't exist
      if (!fs.existsSync(fullServerPath)) {
        fs.mkdirSync(fullServerPath, { recursive: true });
      }
      
      try {
        execSync(`cp -r ${clientDistDir}/* ${fullServerPath}/`, { stdio: 'inherit' });
        console.log(`Client files copied to ${serverPath}`);
      } catch (err) {
        console.error(`Failed to copy files to ${serverPath}:`, err);
      }
    }
  } else {
    console.error('Client build directory not found. The deployment may fail.');
  }

  console.log('Build process completed successfully');
} catch (error) {
  console.error('Build process failed:', error);
  process.exit(1);
}
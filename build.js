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
  // Run the server build script
  console.log('Building server...');
  execSync('bash build-server.sh', { stdio: 'inherit' });

  // Build the client
  console.log('Building client...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('Build process completed successfully');
} catch (error) {
  console.error('Build process failed:', error);
  process.exit(1);
}
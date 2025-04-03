/**
 * Production Build & Run Script
 * 
 * A single, simplified script that:
 * 1. Builds the application for production
 * 2. Fixes the critical path issue with index.html
 * 3. Provides a function to start the production server
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Paths
const clientIndexHtmlPath = path.resolve('client', 'index.html');
const distDir = path.resolve('dist');
const serverClientDir = path.resolve(distDir, 'server', 'client');

// Whether we're building or running
const isRunMode = process.argv.includes('--run');

/**
 * Build the application for production
 */
function buildApp() {
  console.log('Building for production...');
  
  try {
    // Build client and server
    execSync('npm run build', { stdio: 'inherit' });

    // Fix index.html paths for production
    fixIndexHtml();
    
    console.log('✅ Production build completed successfully!');
    console.log('To run the production server: node build-production.js --run');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Fix the index.html path issue for production
 */
function fixIndexHtml() {
  console.log('Fixing index.html paths...');
  
  // Create server/client directory if it doesn't exist
  if (!fs.existsSync(serverClientDir)) {
    fs.mkdirSync(serverClientDir, { recursive: true });
  }
  
  // Get the content of index.html
  const builtIndexHtmlPath = path.resolve(distDir, 'public', 'index.html');
  let indexHtmlContent;
  
  if (fs.existsSync(builtIndexHtmlPath)) {
    indexHtmlContent = fs.readFileSync(builtIndexHtmlPath, 'utf8');
  } else {
    console.warn('Warning: Using original index.html as fallback');
    indexHtmlContent = fs.readFileSync(clientIndexHtmlPath, 'utf8');
  }
  
  // Copy to server/client directory
  fs.writeFileSync(path.resolve(serverClientDir, 'index.html'), indexHtmlContent);
  
  // Create nested server/server/client directory (if that's where the server is looking)
  const nestedDir = path.resolve(distDir, 'server', 'server', 'client');
  if (!fs.existsSync(nestedDir)) {
    fs.mkdirSync(nestedDir, { recursive: true });
  }
  fs.writeFileSync(path.resolve(nestedDir, 'index.html'), indexHtmlContent);
}

/**
 * Run the production server
 */
function runServer() {
  // Ensure we're in production mode
  process.env.NODE_ENV = 'production';
  
  // Verify index.html exists (emergency fix if needed)
  const indexHtmlPath = path.resolve(serverClientDir, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.log('Emergency fix: Copying index.html');
    fixIndexHtml();
  }
  
  console.log('Starting production server...');
  
  // Start the server
  const server = spawn('node', ['dist/server/index.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  server.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    server.kill('SIGTERM');
  });
}

// Main execution
if (isRunMode) {
  runServer();
} else {
  buildApp();
}
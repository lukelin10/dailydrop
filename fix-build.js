/**
 * Simple script to ensure client/index.html gets copied to the server directory in production builds
 */

const fs = require('fs');
const path = require('path');

// Paths
const clientIndexHtmlPath = path.resolve('client', 'index.html');
const distDir = path.resolve('dist');
const serverClientDir = path.resolve(distDir, 'server', 'client');
const serverServerClientDir = path.resolve(distDir, 'server', 'server', 'client');

// Make sure directories exist
if (!fs.existsSync(serverClientDir)) {
  fs.mkdirSync(serverClientDir, { recursive: true });
  console.log('Created directory:', serverClientDir);
}

if (!fs.existsSync(serverServerClientDir)) {
  fs.mkdirSync(serverServerClientDir, { recursive: true });
  console.log('Created directory:', serverServerClientDir);
}

// Get the content of built index.html from public
const builtIndexHtmlPath = path.resolve(distDir, 'public', 'index.html');
let indexHtmlContent;

if (fs.existsSync(builtIndexHtmlPath)) {
  indexHtmlContent = fs.readFileSync(builtIndexHtmlPath, 'utf8');
  console.log('Using production index.html from dist/public');
} else {
  console.error('Warning: Could not find built index.html. Using original client/index.html as fallback.');
  indexHtmlContent = fs.readFileSync(clientIndexHtmlPath, 'utf8');
}

// Copy to server/client directory
fs.writeFileSync(path.resolve(serverClientDir, 'index.html'), indexHtmlContent);
console.log('Copied index.html to dist/server/client');

// Copy to server/server/client directory
fs.writeFileSync(path.resolve(serverServerClientDir, 'index.html'), indexHtmlContent);
console.log('Copied index.html to dist/server/server/client');

console.log('Fix completed! The production build should now work correctly.');
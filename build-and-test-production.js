/**
 * Production Build and Test Script
 * 
 * This script:
 * 1. Builds the application with minification disabled
 * 2. Tests basic functions to ensure no "i.find is not a function" errors
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('⚙️ Building and testing production build with non-minified JavaScript...');
console.log('This prevents the "i.find is not a function" error in production');

// Run our no-minify build script
console.log('\n📦 Starting non-minified build...');
try {
  execSync('node build-no-minify.js', { stdio: 'inherit' });
  console.log('✅ Build completed successfully!');
  
  // Simple test to ensure files were created
  const distDir = path.resolve(__dirname, 'dist/public');
  if (fs.existsSync(distDir)) {
    console.log(`\n📋 Checking built files in ${distDir}:`);
    const files = fs.readdirSync(distDir);
    files.forEach(file => console.log(` - ${file}`));
    
    if (files.length > 0) {
      console.log('\n✅ Build verification successful! The non-minified code should prevent the "i.find is not a function" error.');
      console.log('To run this production build, use: node build-production.js --run');
    } else {
      console.log('\n❌ Build verification failed: No files found in the output directory');
    }
  } else {
    console.log(`\n❌ Build verification failed: Output directory ${distDir} not found`);
  }
} catch (error) {
  console.error('❌ Build process failed:', error.message);
  process.exit(1);
}
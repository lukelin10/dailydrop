/**
 * Custom Build Script - No Minification
 * 
 * This script runs the build process with minification disabled
 * to prevent the "i.find is not a function" error in production.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Building with minification disabled to prevent "i.find is not a function" error...');

// Run TypeScript compilation first, just like the normal build process
try {
  console.log('Running TypeScript compilation...');
  execSync('npx tsc', { stdio: 'inherit' });
  
  // Run vite build with our custom config
  console.log('Running Vite build with minification disabled...');
  execSync('npx vite build --config vite.production.config.ts', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully with minification disabled!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
import { execSync } from 'child_process';

console.log('Starting build process...');

try {
  // Run the consolidated production build script
  console.log('Building application for production...');
  execSync('node build-production.js', { stdio: 'inherit' });

  console.log('Build process completed successfully');
  console.log('To run the production server: node build-production.js --run');
} catch (error) {
  console.error('Build process failed:', error);
  process.exit(1);
}
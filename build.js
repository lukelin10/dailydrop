import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting enhanced build process...');

// Ensure the dist/shared directory exists
const distSharedDir = path.join(__dirname, 'dist/shared');
if (!fs.existsSync(distSharedDir)) {
  console.log(`Creating directory: ${distSharedDir}`);
  fs.mkdirSync(distSharedDir, { recursive: true });
}

// Copy shared schema file
const sourceSchemaPath = path.join(__dirname, 'shared/schema.ts');
const destSchemaPath = path.join(distSharedDir, 'schema.js');

console.log(`Processing schema from ${sourceSchemaPath} to ${destSchemaPath}`);

try {
  // Read and transform the schema file
  let schemaContent = fs.readFileSync(sourceSchemaPath, 'utf-8');

  // Convert TypeScript to JavaScript (simple transformations)
  schemaContent = schemaContent
    .replace(/import {(.*?)} from "(.*?)";/g, 'import {$1} from "$2.js";')
    // Handle any imports from shared directory
    .replace(/@shared\//g, '../shared/');

  // Make sure exports are compatible with ESM
  schemaContent = schemaContent.replace(/export type/g, 'export');

  // Write the transformed file
  fs.writeFileSync(destSchemaPath, schemaContent);
  console.log('Schema file transformed successfully');

  // Run tsc-alias to transform path aliases in compiled code
  console.log('Running path alias transformation with tsc-alias...');
  try {
    // Transform server aliases based on server tsconfig
    execSync('npx tsc-alias -p server/tsconfig.json', { stdio: 'inherit' });
    console.log('Server path aliases transformed successfully');
  } catch (aliasError) {
    console.error('Error running tsc-alias for server:', aliasError);
    process.exit(1);
  }

  // Verify critical files have been properly transformed
  const criticalFiles = [
    'dist/server/auth.js',
    'dist/server/db.js',
    'dist/server/storage.js',
    'dist/server/routes.js'
  ];

  console.log('Verifying transformed files...');
  criticalFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Check if file still contains @shared/ imports
      if (content.includes('@shared/')) {
        console.warn(`WARNING: ${filePath} still contains @shared/ imports after transformation!`);
        // Perform additional manual transformation as a fallback
        const fixedContent = content.replace(
          /from ['"]@shared\/(.*?)['"]/g, 
          (match, p1) => `from "../shared/${p1}.js"`
        );
        fs.writeFileSync(fullPath, fixedContent);
        console.log(`Applied manual fix to ${filePath}`);
      } else {
        console.log(`✓ ${filePath} imports look correct`);
      }

      // Also fix relative imports without .js extension
      if (content.includes('from "./') || content.includes("from './")) {
        console.log(`Fixing relative imports in ${filePath}`);
        const fixedContent = content
          .replace(/from ['"]\.\/(.*?)['"](?!\.js)/g, 'from "./$1.js"')
          .replace(/from ['"]\.\.\/(?!shared)(.*?)['"](?!\.js)/g, 'from "../$1.js"');
        fs.writeFileSync(fullPath, fixedContent);
        console.log(`Fixed relative imports in ${filePath}`);
      }
    } else {
      console.warn(`WARNING: Expected file not found: ${filePath}`);
    }
  });

  console.log('Build process completed successfully');
} catch (error) {
  console.error('Build process failed:', error);
  process.exit(1);
}
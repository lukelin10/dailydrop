import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the shared directory exists in dist
const distSharedDir = path.join(__dirname, '../dist/shared');
if (!fs.existsSync(distSharedDir)) {
  fs.mkdirSync(distSharedDir, { recursive: true });
}

// Copy shared schema file
const sourceSchemaPath = path.join(__dirname, '../shared/schema.ts');
const destSchemaPath = path.join(distSharedDir, 'schema.js');

// Read and transform the schema file
let schemaContent = fs.readFileSync(sourceSchemaPath, 'utf-8');

// Convert TypeScript to JavaScript
schemaContent = schemaContent
  .replace(/import {.*?} from "(.+?)";/g, 'import {$1} from "$2.js";')
  // .replace(/@shared\//g, '../shared/');

// Make sure exports are compatible with ESM
schemaContent = schemaContent.replace(/export type/g, 'export');

// Write the transformed file
fs.writeFileSync(destSchemaPath, schemaContent);

// Process server files to update imports
const serverDistDir = path.join(__dirname, '../dist/server');
function updateImports(directory: string) {
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      updateImports(filePath);
      return;
    }

    if (!file.endsWith('.js')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(
      /from ['"]@shared\/(.*?)['"]/g,
      'from "../shared/$1.js"'
    );
    fs.writeFileSync(filePath, content);
  });
}

// Run the import updates after TypeScript compilation
if (fs.existsSync(serverDistDir)) {
  updateImports(serverDistDir);
}

console.log('Shared modules built successfully');
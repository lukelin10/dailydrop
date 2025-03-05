
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting server imports fix...');

// Process server files to update imports
const serverDir = path.join(__dirname, 'dist/server/server');

function updateImports(directory) {
  const files = fs.readdirSync(directory);

  files.forEach(file => {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      updateImports(filePath);
      return;
    }

    if (!file.endsWith('.js')) return;

    console.log(`Processing ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    
    // Fix @shared/ imports based on file location
    const relativeToRoot = path.relative(path.dirname(filePath), path.join(__dirname, 'dist'));
    const pathToShared = path.join(relativeToRoot, 'shared').replace(/\\/g, '/');
    
    // Fix imports without .js extension
    content = content.replace(
      /from ['"](\.\/[^'"]+)['"](?!\.js)/g, 
      (match, p1) => {
        modified = true;
        return `from "${p1}.js"`;
      }
    );
    
    content = content.replace(
      /from ['"](\.\.(?:\/\.\.)*\/[^'"]+)['"](?!\.js)/g, 
      (match, p1) => {
        modified = true;
        return `from "${p1}.js"`;
      }
    );
    
    // Fix @shared imports
    content = content.replace(
      /from ['"]([@\w][^'"]*)['"](?!\.js)/g, 
      (match, p1) => {
        if (p1.startsWith('@shared/')) {
          const importPath = p1.replace('@shared/', '');
          modified = true;
          return `from "${pathToShared}/${importPath}.js"`;
        }
        return match;
      }
    );
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated imports in ${filePath}`);
    }
  });
}

if (fs.existsSync(serverDir)) {
  updateImports(serverDir);
  console.log('Server imports fixed successfully');
} else {
  console.error('Error: Server directory not found at', serverDir);
  process.exit(1);
}

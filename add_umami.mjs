import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directoryPath = path.join(__dirname, 'web/app');

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.vue')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Add v-umami to UButton if not present
    content = content.replace(/<UButton(?!\s+v-umami)([\s>])/g, '<UButton v-umami="\'button_click\'"$1');
    
    // Add v-umami to NuxtLink if not present
    content = content.replace(/<NuxtLink(?!\s+v-umami)([\s>])/g, '<NuxtLink v-umami="\'link_click\'"$1');
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

processDirectory(directoryPath);
console.log('Done adding v-umami directives.');

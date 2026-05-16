const { readFileSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

const ignored = new Set(['.git', 'node_modules', 'miniprogram_npm']);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) {
      continue;
    }
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

for (const file of walk(process.cwd())) {
  JSON.parse(readFileSync(file, 'utf8'));
}

console.log('JSON check passed.');

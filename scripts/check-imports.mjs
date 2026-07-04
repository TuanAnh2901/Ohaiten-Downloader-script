// check-imports.mjs
// Forbids importing heavy/banned dependencies: chalk, picocolors, ffmpeg-static, @ffmpeg-installer/ffmpeg
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const srcDir = join(__dirname, '..', 'src');

const banned = [
  'chalk',
  'picocolors',
  'ffmpeg-static',
  '@ffmpeg-installer/ffmpeg',
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(
  `from\\s+['"](${banned.map(esc).join('|')})['"]`
);

/** Synchronously walk a directory and return all .ts files. */
function walkDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(full));
    } else if (entry.name.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

try {
  const files = walkDir(srcDir);
  let found = false;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const match = content.match(pattern);
    if (match) {
      console.error(`  ✘ ${file}: banned import "${match[0]}"`);
      found = true;
    }
  }

  if (found) {
    console.error('IMPORT CHECK FAILED — banned dependencies found.');
    process.exit(1);
  }

  console.log('Import check passed — no banned dependencies.');
} catch (err) {
  console.error('Import check error:', err.message);
  process.exit(1);
}

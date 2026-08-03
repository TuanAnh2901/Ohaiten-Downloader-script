/**
 * esbuild bundler for FB Saved Videos Downloader CLI.
 *
 * Bundles src/index.ts → dist/index.js as a single ESM file with:
 *   - All src inlined
 *   - commander + playwright left external (runtime deps)
 *   - Node builtins left external
 *   - Node shebang preserved from entry point
 */

import * as esbuild from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname);

await esbuild.build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(root, 'dist/index.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  // Runtime deps + Node builtins stay external
  external: [
    'node:*',
    'commander',
    'playwright',
  ],
  sourcemap: true,
});

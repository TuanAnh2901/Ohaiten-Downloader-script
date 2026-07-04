/**
 * esbuild bundler for Animehay CLI.
 *
 * Bundles src/index.ts → dist/index.js as a single CJS file with:
 *   - All AnimehayCli source inlined
 *   - @animehay/core/* resolved to ../AnimehayDownloader/src/*
 *   - Node builtins left external
 *   - Node shebang preserved from entry point
 */

import * as esbuild from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname);
const coreSrc = resolve(__dirname, '..', 'AnimehayDownloader', 'src');

await esbuild.build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(root, 'dist/index.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  alias: {
    // Prefix-match: @animehay/core/parser.js → ../AnimehayDownloader/src/parser.js
    '@animehay/core': coreSrc,
  },
  // Node builtins stay external
  external: [
    'node:*',
  ],
  // Preserve source map for easier debugging
  sourcemap: true,
});

import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as esbuild from 'esbuild';

const root = resolve(import.meta.dirname);
const source = resolve(root, 'src-tauri', 'frontend');
const output = resolve(root, 'frontend-dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await esbuild.build({
  entryPoints: [resolve(source, 'main.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  outfile: resolve(output, 'main.js'),
  sourcemap: true,
});
await cp(resolve(source, 'index.html'), resolve(output, 'index.html'));
await cp(resolve(source, 'style.css'), resolve(output, 'style.css'));

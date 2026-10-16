// build.mjs — esbuild bundle to dist/index.cjs (CJS, node22) — 0 runtime deps
import { build } from 'esbuild'

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/index.cjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  external: [],
})
console.log('[build] dist/index.cjs OK')

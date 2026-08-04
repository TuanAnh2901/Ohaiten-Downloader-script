// build-sea.mjs — Build fb-saved-dl.exe from a CJS esbuild bundle via Node SEA.
//
// Mirrors AnimehayCLI's build-sea.mjs pipeline (blob -> copy node.exe ->
// postject inject) with one project-specific twist: this CLI bundles
// playwright-core, which resolves browsers.json / package.json through
// COMPUTED require(path.join(packageRoot, ...)) calls (coreBundle.js:11086,
// 33538, 33634, 69332). esbuild cannot inline computed-path requires, and the
// SEA blob has no node_modules — worse, the SEA embedder require throws
// ERR_UNKNOWN_BUILTIN_MODULE for any non-builtin request BEFORE any
// Module._load interception. So instead of a runtime shim, a build plugin
// rewrites those four calls to STATIC requires of a bundled asset path
// (`__sea_assets__/...`) — esbuild inlines the JSON and no runtime file
// require survives. chromium-bidi (BiDi/Firefox-only lazy dep, not shipped by
// playwright-core) and `require(initPage)` (user-config-driven, never set)
// stay as never-executed runtime requires.
import { execSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const coreBundlePath = join(
  __dirname,
  'node_modules',
  'playwright-core',
  'lib',
  'coreBundle.js',
);
const seaAssetsDir = resolve(__dirname, 'dist', '.sea-assets');

console.log('[SEA] Step 0: check prerequisites...');

// Check node version (need >= 20 with --experimental-sea-config)
const nodeVer = process.version.match(/^v(\d+)\./)?.[1];
if (!nodeVer || Number(nodeVer) < 20) {
  console.error(`[SEA] Node >= 20 required, got ${process.version}`);
  process.exit(1);
}
console.log(`[SEA] Node ${process.version} OK`);

// Ensure postject is available
try {
  execSync('npx --yes postject', { stdio: 'pipe', encoding: 'utf-8', timeout: 10000 });
  console.log('[SEA] postject available via npx');
} catch {
  // postject exits with non-zero when run without args, but that's OK — it means it's installed
  console.log('[SEA] postject binary found (expected non-zero exit without args)');
}

console.log('[SEA] Step 1: bundle CJS (commander + playwright inlined, node builtins external)...');

// Stage playwright-core's browsers.json + package.json as bundleable assets.
mkdirSync(seaAssetsDir, { recursive: true });
writeFileSync(
  join(seaAssetsDir, 'browsers.json'),
  readFileSync(join(__dirname, 'node_modules', 'playwright-core', 'browsers.json')),
);
writeFileSync(
  join(seaAssetsDir, 'package.json'),
  readFileSync(join(__dirname, 'node_modules', 'playwright-core', 'package.json')),
);

/** Rewrite playwright-core's computed-path requires to static asset requires. */
const seaAssetsPlugin = {
  name: 'sea-assets',
  setup(build) {
    build.onLoad({ filter: /coreBundle\.js$/ }, async (args) => {
      if (args.path !== coreBundlePath) return;
      const contents = readFileSync(args.path, 'utf-8').replace(
        /require\(import_[a-zA-Z0-9_]+\.default\.join\([^)]*"(browsers|package)\.json"\)\)/g,
        (match, name) => `require("__sea_assets__/${name}.json")`,
      );
      return { contents, loader: 'js' };
    });
  },
};

await esbuild.build({
  // Virtual entry: src/index.ts only EXPORTS run() — the bin launcher invokes
  // it. A SEA blob has no launcher file, so the entry itself calls run().
  stdin: {
    contents: `import { run, defaultServices } from './src/index.ts';
run(process.argv, defaultServices).then(
  (code) => { process.exitCode = code; },
  (err) => {
    console.error('[ERROR] ' + (err instanceof Error ? err.message : String(err)));
    process.exitCode = 1;
  },
);`,
    resolveDir: __dirname,
    sourcefile: 'sea-entry.ts',
  },
  outfile: resolve(__dirname, 'dist/index.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  // Node builtins stay external; commander + playwright are INLINED — the SEA
  // blob has no node_modules to resolve them from. chromium-bidi is a lazy
  // optional dep (BiDi/Firefox path only, never reached for chromium) that
  // playwright-core does not ship — leave its require untouched.
  external: ['node:*', 'chromium-bidi'],
  alias: {
    __sea_assets__: seaAssetsDir,
  },
  plugins: [seaAssetsPlugin],
  sourcemap: false,
  logLevel: 'warning',
});

// Verify bundle exists
const mainEntry = resolve(__dirname, 'dist', 'index.cjs');
if (!existsSync(mainEntry)) {
  console.error(`[SEA] Bundle not found at ${mainEntry}. Did the esbuild step succeed?`);
  process.exit(1);
}

console.log('[SEA] Step 2: generate blob from bundle...');
execSync('node --experimental-sea-config sea-config.json', {
  cwd: __dirname,
  stdio: 'inherit',
});

const blobPath = resolve(__dirname, 'dist', 'index.blob');
if (!existsSync(blobPath)) {
  console.error(`[SEA] Blob not created at ${blobPath}`);
  process.exit(1);
}

console.log('[SEA] Step 3: locate node.exe...');
// Try multiple locations for node.exe
let nodeExePath = '';
const candidates = [
  process.execPath,
  resolve(process.env.LOCALAPPDATA || '', 'Programs', 'Nodejs', 'node.exe'),
  resolve(process.env.ProgramFiles || '', 'nodejs', 'node.exe'),
  resolve(process.env['ProgramFiles(x86)'] || '', 'nodejs', 'node.exe'),
  resolve('C:\\Program Files\\nodejs\\node.exe'),
];
for (const p of candidates) {
  if (existsSync(p)) {
    nodeExePath = p;
    break;
  }
}
if (!nodeExePath) {
  // Fallback: try where node
  try {
    nodeExePath = execSync('where node', { encoding: 'utf-8' }).trim().split('\n')[0];
  } catch {
    console.error('[SEA] Could not find node.exe');
    process.exit(1);
  }
}
console.log(`[SEA] Using node at: ${nodeExePath}`);

const outExe = resolve(__dirname, 'fb-saved-dl.exe');

console.log('[SEA] Step 4: copy node.exe -> fb-saved-dl.exe...');
if (existsSync(outExe)) unlinkSync(outExe);
copyFileSync(nodeExePath, outExe);

console.log('[SEA] Step 5: inject blob into exe...');
execSync(
  `npx --yes postject "${outExe}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
  { cwd: __dirname, stdio: 'inherit' }
);

console.log('[SEA] Done!');
console.log(`[SEA] -> ${outExe}`);
console.log(`[SEA] Run: "${outExe}" --help`);

// build-sea.mjs — Build animehay.exe from dist/index.cjs via Node SEA
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

console.log('[SEA] Step 0: check prerequisites...')

// Check node version (need >= 20 with --experimental-sea-config)
const nodeVer = process.version.match(/^v(\d+)\./)?.[1]
if (!nodeVer || Number(nodeVer) < 20) {
  console.error(`[SEA] Node >= 20 required, got ${process.version}`)
  process.exit(1)
}
console.log(`[SEA] Node ${process.version} OK`)

// Ensure postject is available
try {
  execSync('npx --yes postject', { stdio: 'pipe', encoding: 'utf-8', timeout: 10000 })
  console.log('[SEA] postject available via npx')
} catch {
  // postject exits with non-zero when run without args, but that's OK — it means it's installed
  console.log('[SEA] postject binary found (expected non-zero exit without args)')
}

console.log('[SEA] Step 1: ensure bundle is up to date...')
execSync('npm run build', { cwd: __dirname, stdio: 'inherit' })

// Verify blob config
const seaConfig = resolve(__dirname, 'sea-config.json')
if (!existsSync(seaConfig)) {
  console.error('[SEA] sea-config.json not found')
  process.exit(1)
}

// Verify main entry exists
const mainEntry = resolve(__dirname, 'dist', 'index.cjs')
if (!existsSync(mainEntry)) {
  console.error(`[SEA] Bundle not found at ${mainEntry}. Did 'npm run build' succeed?`)
  process.exit(1)
}

console.log('[SEA] Step 2: generate blob from bundle...')
execSync('node --experimental-sea-config sea-config.json', {
  cwd: __dirname,
  stdio: 'inherit',
})

const blobPath = resolve(__dirname, 'dist', 'index.blob')
if (!existsSync(blobPath)) {
  console.error(`[SEA] Blob not created at ${blobPath}`)
  process.exit(1)
}

console.log('[SEA] Step 3: locate node.exe...')
// Try multiple locations for node.exe
let nodeExePath = ''
const candidates = [
  process.execPath,
  resolve(process.env.LOCALAPPDATA || '', 'Programs', 'Nodejs', 'node.exe'),
  resolve(process.env.ProgramFiles || '', 'nodejs', 'node.exe'),
  resolve(process.env['ProgramFiles(x86)'] || '', 'nodejs', 'node.exe'),
  resolve('C:\\Program Files\\nodejs\\node.exe'),
]
for (const p of candidates) {
  if (existsSync(p)) {
    nodeExePath = p
    break
  }
}
if (!nodeExePath) {
  // Fallback: try where node
  try {
    nodeExePath = execSync('where node', { encoding: 'utf-8' }).trim().split('\n')[0]
  } catch {
    console.error('[SEA] Could not find node.exe')
    process.exit(1)
  }
}
console.log(`[SEA] Using node at: ${nodeExePath}`)

const outExe = resolve(__dirname, 'animehay.exe')

console.log('[SEA] Step 4: copy node.exe -> animehay.exe...')
if (existsSync(outExe)) unlinkSync(outExe)
copyFileSync(nodeExePath, outExe)

console.log('[SEA] Step 5: inject blob into exe...')
execSync(
  `npx --yes postject "${outExe}" NODE_SEA_BLOB "${blobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
  { cwd: __dirname, stdio: 'inherit' }
)

console.log('[SEA] Done!')
console.log(`[SEA] -> ${outExe}`)
console.log(`[SEA] Run: "${outExe}" --help`)

// build-sea.mjs — Node SEA: blob -> copy node.exe -> postject inject -> Pnavhd.exe
// Port tư tưởng từ AnimehayCLI/build-sea.mjs (1:1), Node >=22 (global WebSocket).
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outExe = resolve(__dirname, process.env.SEA_OUT || 'Pnavhd.exe')

console.log('[SEA] Step 0: check Node >=22 (global WebSocket CDP client cần >=22)...')
const mm = process.version.match(/^v(\d+)\./)
if (!mm || Number(mm[1]) < 22) {
  console.error(`[SEA] Node >= 22 required, got ${process.version}`)
  process.exit(1)
}
console.log(`[SEA] Node ${process.version} OK`)

console.log('[SEA] Step 1: build bundle...')
execSync('npm run build', { cwd: __dirname, stdio: 'inherit' })
if (!existsSync(resolve(__dirname, 'dist', 'index.cjs'))) {
  console.error('[SEA] dist/index.cjs không tồn tại — build lỗi')
  process.exit(1)
}

console.log('[SEA] Step 2: generate blob...')
execSync('node --experimental-sea-config sea-config.json', { cwd: __dirname, stdio: 'inherit' })
if (!existsSync(resolve(__dirname, 'dist', 'index.blob'))) {
  console.error('[SEA] blob không được tạo')
  process.exit(1)
}

console.log('[SEA] Step 3: locate node.exe...')
const candidates = new Set([
  process.execPath,
  resolve(process.env['ProgramFiles'] || '', 'nodejs', 'node.exe'),
  resolve(process.env['LOCALAPPDATA'] || '', 'Programs', 'nodejs', 'node.exe'),
  'C:\\Program Files\\nodejs\\node.exe',
])
let nodeExe = [...candidates].find((p) => existsSync(p))
if (!nodeExe) {
  nodeExe = execSync('where node', { encoding: 'utf8' }).trim().split(/\r?\n/)[0]
}
console.log(`[SEA] node tại: ${nodeExe}`)

console.log('[SEA] Step 4: copy node.exe -> Pnavhd.exe...')
rmSync(outExe, { force: true })
copyFileSync(nodeExe, outExe)

console.log('[SEA] Step 5: inject blob (postject)...')
execSync(
  `npx --yes postject "${outExe}" NODE_SEA_BLOB "${resolve(__dirname, 'dist', 'index.blob')}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
  { cwd: __dirname, stdio: 'inherit' },
)
console.log('[SEA] Done!')
console.log(`[SEA] -> ${outExe}`)
console.log('[SEA] Run: Pnavhd.exe --help')

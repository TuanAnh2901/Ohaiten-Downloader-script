// src/args.ts — parse flags + classify target (thân CLI, wiring đầy đủ ở Task 5)
export interface Flags {
  batch: boolean
  outputDir: string
  list: boolean
  jobs: number
  res?: number
  first?: number
  to?: number
  retries: number
  target: string
}

export type TargetKind = 'search' | 'actor' | 'video' | 'unknown'

export function classify(target: string): TargetKind {
  if (/[?&]s=/.test(target)) return 'search'
  if (target.includes('/actor/')) return 'actor'
  if (/\d{4}\/\d{2}\/\d{2}\//.test(target)) return 'video'
  return 'unknown'
}

export function parseArgs(argv: string[]): Flags {
  const flags: Flags = {
    batch: false,
    outputDir: './downloads',
    list: false,
    jobs: 1,
    retries: 2,
    target: '',
  }
  const rest: string[] = []
  const num = (name: string): number => {
    const v = Number(argv[++i])
    if (!Number.isFinite(v)) throw new Error(`thiếu số sau ${name}`)
    return v
  }
  let i = 0
  for (; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--batch') flags.batch = true
    else if (a === '--list') flags.list = true
    else if (a === '--output-dir') flags.outputDir = argv[++i]
    else if (a === '--jobs') flags.jobs = num(a)
    else if (a === '--res') flags.res = num(a)
    else if (a === '--from') flags.first = num(a)
    else if (a === '--to') flags.to = num(a)
    else if (a === '--retries') flags.retries = num(a)
    else if (a === '--help' || a === '-h') printHelp()
    else if (!a.startsWith('--')) rest.push(a)
  }
  if (rest.length !== 1) throw new Error('cần đúng 1 target (URL hoặc file .txt cho --batch)')
  flags.target = rest[0]
  return flags
}

function printHelp() {
  console.log(`pornavhd.exe <URL video | /actor/<slug>/ | "?s=<tu-khoa>" | urls.txt --batch>

flags:
  --batch        target là file .txt (1 URL/dòng, # comment)
  --output-dir   thư mục xuất (default ./downloads)
  --list         chỉ liệt kê, không tải
  --jobs N       số tab/browser tải song song (default 1)
  --res N        giới hạn chiều cao variant, vd 720
  --from N       video bắt đầu (thứ tự listing)
  --to N         video kết thúc
  --retries N    retry mỗi video khi fail (default 2)

yêu cầu: Edge/Chrome + ffmpeg trong PATH`)
}

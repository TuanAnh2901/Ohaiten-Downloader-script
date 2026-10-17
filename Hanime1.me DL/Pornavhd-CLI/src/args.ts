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
  /** số luồng song song tải segment mỗi video (mặc định 96) */
  streams: number
  /** path file log (default <output-dir>/pornavhd.log) */
  logFile?: string
  /** tải lại dù archive đã có */
  redo: boolean
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
    streams: 96,
    redo: false,
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
    else if (a === '--streams') flags.streams = num(a)
    else if (a === '--log-file') flags.logFile = argv[++i]
    else if (a === '--redo') flags.redo = true
    else if (a === '--help' || a === '-h') printHelp()
    else if (!a.startsWith('--')) rest.push(a)
  }
  if (rest.length !== 1) throw new Error('cần đúng 1 target (URL hoặc file .txt cho --batch)')
  flags.target = rest[0]
  return flags
}

import { crawl, Vid, sanitize } from './listing'

export function sliceRange(vids: Vid[], first?: number, to?: number): Vid[] {
  const lo = Math.max(1, first || 1)
  const hi = Math.min(to || vids.length, vids.length)
  return vids.slice(lo - 1, hi)
}

export interface Job {
  vids: Vid[]
  outDir: string
  label: string
}

/**
 * Xây jobs từ target — listing qua fetchPage (browser).
 * fetchPage: (url) => Promise<html string> — được wire lên browser ở runCli.
 */
export async function buildJobs(flags: Flags, fetchPage: (url: string) => Promise<string>): Promise<Job[]> {
  const targets: string[] = flags.batch
    ? (await import('node:fs')).readFileSync(flags.target, 'utf8')
        .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    : [flags.target]
  const jobs: Job[] = []
  for (const t of targets) {
    const kind = classify(t)
    if (kind === 'actor' || kind === 'search') {
      const slug = kind === 'actor'
        ? t.replace(/\/$/, '').split('/actor/')[1]?.split('/')[0] || 'actor'
        : new URL(t).searchParams.get('s')?.trim() || 'search'
      const outDir = [flags.outputDir, sanitize(slug)].join('/')
      console.log(`[${kind}] ${slug}`)
      const vids = await crawl(t, fetchPage, console.log)
      if (!vids.length) throw new Error(`Không lấy được video nào từ ${t}`)
      const n = vids.length
      console.log(`Tổng ${n} video (bị cắt bởi --from/--to nếu có)`)
      jobs.push({ vids: sliceRange(vids, flags.first, flags.to), outDir, label: kind })
    } else if (kind === 'video') {
      const m = t.match(/\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)/)
      const title = m ? m[4] : 'video'
      // gộp các URL video vào 1 job (cùng outDir) — --jobs N mới có tác dụng trong batch
      const last = jobs[jobs.length - 1]
      if (last && last.outDir === flags.outputDir && last.label === 'video') {
        last.vids.push({ id: '', url: t, title, duration: '' })
      } else {
        jobs.push({
          vids: [{ id: '', url: t, title, duration: '' }],
          outDir: flags.outputDir,
          label: 'video',
        })
      }
    } else if (flags.batch) {
      console.log(`[skip] ${t} (không nhận ra URL)`)
    } else {
      throw new Error(`Không nhận ra target: ${t} (video URL /actor/ ?s= hoặc --batch)`)
    }
  }
  return jobs
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
  --streams N    số luồng song song tải segment mỗi video (default 96)
  --log-file P   path file log (default <output-dir>/pornavhd.log)
  --redo         tải lại dù archive đã ghi video này là tải xong

yêu cầu: Edge/Chrome + ffmpeg trong PATH`)
}

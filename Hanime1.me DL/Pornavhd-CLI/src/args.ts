// src/args.ts — classify target + flags (thân CLI, sẽ hoàn thiện Task 5)
import { parseCards, sanitize, buildPageUrl, crawl, Vid } from './listing'

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

export type TargetKind = 'video' | 'actor' | 'search' | 'batch'

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
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const num = () => {
      const v = Number(argv[++i])
      if (!Number.isFinite(v)) throw new Error(`thiếu số sau ${a}`)
      return v
    }
    if (a === '--batch') flags.batch = true
    else if (a === '--list') flags.list = true
    else if (a === '--output-dir') flags.outputDir = argv[++i]
    else if (a === '--jobs') flags.jobs = num()
    else if (a === '--res') flags.res = num()
    else if (a === '--from') flags.first = num()
    else if (a === '--to') flags.to = num()
    else if (a === '--retries') flags.retries = num()
    else if (a === '--help' || a === '-h') console.log('pornavhd.exe <URL|file.txt --batch> [flags]')
    else rest.push(a)
  }
  if (rest.length !== 1) throw new Error('cần đúng 1 target (URL hoặc file .txt cho --batch)')
  flags.target = rest[0]
  return flags
}

// Trả jobs list: { vids, outDir, label } — dùng chung mọi target mode
export interface Job {
  vids: Vid[]
  outDir: string
  label: string
}

export async function buildJobs(flags: Flags): Promise<Job[]> {
  const targets = flags.batch
    ? require('fs').readFileSync(flags.target, 'utf8').split(/\r?\n/)
        .map((l: string) => l.trim()).filter((l: string) => l && !l.startsWith('#'))
    : [flags.target]
  const jobs: Job[] = []
  for (const t of targets) {
    const kind = classify(t)
    if (kind === 'actor' || kind === 'search') {
      const slug = kind === 'actor'
        ? t.replace(/\/$/, '').split('/actor/')[1].split('/')[0]
        : new URL(t).searchParams.get('s')?.trim() || 'search'
      const outDir = [flags.outputDir, sanitize(slug)].join('/')
      const label = kind === 'actor' ? 'actor' : 'search'
      console.log(`[${label}] ${slug}`)
      // placeholder fetch tới Task 5 (browser); đây là điểm inject fetchPage
      const vids = await crawl(t, () => Promise.reject(new Error('fetch not wired yet')))
      if (!vids.length) throw new Error(`Không lấy được video nào từ ${t}`)
      const lo = Math.max(1, flags.first || 1)
      const hi = Math.min(flags.to || vids.length, vids.length)
      console.log(`Tổng ${vids.length} video (${lo}..${hi})`)
      jobs.push({ vids: vids.slice(lo - 1, hi), outDir, label })
    } else if (kind === 'video') {
      const m = t.match(/\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)/)
      const title = m ? m[4] : 'video'
      jobs.push({
        vids: [{ id: '', url: t, title, duration: '' }],
        outDir: flags.outputDir,
        label: 'video',
      })
    } else {
      throw new Error(`Không nhận ra target: ${t} (video URL /actor/ ?s= hoặc --batch)`)
    }
  }
  return jobs
}

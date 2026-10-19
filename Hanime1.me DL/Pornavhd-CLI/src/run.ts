// src/run.ts — runCli: listing browser + download worker pool (event loop)
import { mkdirSync, appendFileSync, readFileSync } from 'node:fs'
import { statSync, unlinkSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { parseArgs, buildJobs, Flags } from './args'
import { crawl, parseCards, isCfChallenge, Vid, sanitize } from './listing'
import { Browser, Page } from './cdp'
import { downloadVideo } from './dl'
import { stat } from 'node:fs/promises'
import { MultiProgress } from './progress'
import { Logger } from './log'

const EXE_DIR = process.execPath.split(/[\\/]/).pop()!.toLowerCase() === 'node.exe'
  ? process.cwd() // chạy bằng node (dev): relative cwd như bản Python
  : join(process.execPath, '..') // exe: file/profile cạnh exe

const PROFILE_DIR = join(EXE_DIR, '.pw-profile')

/** fetchPage qua browser thật (Cloudflare tự giải/client-side tồn tại nhờ browser thật) */
async function fetchPageHtml(browser: Browser, url: string, log = console.log): Promise<string> {
  const page = await browser.newPage('about:blank')
  try {
    await page.goto(url, 45_000)
    // chờ card hoặc CF; tối đa 90s
    for (let i = 0; i < 90; i++) {
      const html = await page.html()
      if (parseCards(html).length) return html
      if (isCfChallenge(html)) {
        log('  ! Cloudflare listing — hãy click cửa sổ browser để giải')
      }
      await new Promise((r) => setTimeout(r, 1000))
    }
    return await page.html()
  } finally {
    await browser.closeTarget(page.targetId).catch(() => {})
  }
}

interface Row {
  title: string
  status: string
  mb: string
  mbn: number
  secs: string
  secn: number
  note: string
}

async function downloadOne(
  browser: Browser,
  v: Vid,
  flags: Flags,
  outDir: string,
  logger: Logger,
  mp: MultiProgress,
  rows: Row[],
  failedUrls: string[],
): Promise<'ok' | 'fail' | 'skip'> {
  const fname = sanitize(v.title) + '.mp4'
  const dest = join(outDir, fname)
  const slot = mp.createSlot(fname)
  let rowKind: 'ok' | 'fail' | 'skip' = 'fail'
  const end = (endKind: 'ok' | 'fail' | 'skip', msg: string, mb = 0, secs = 0, note = '') => {
    mp.finish(slot, { end: endKind, msg, mb, secs })
    rowKind = endKind
    const old = rows.findIndex((r) => r.title === fname)
    const row: Row = { title: fname, status: endKind, mb: mb ? `${mb}MB` : '', mbn: mb, secs: secs ? `${secs}s` : '', secn: secs, note }
    if (old >= 0) rows[old] = row
    else rows.push(row)
    logger.log(fname, `${endKind.toUpperCase()} ${msg}${note ? ' | ' + note : ''}`)
  }
  const st = await stat(dest).catch(() => null)
  if (st && st.size >= 1024 * 1024) {
    if (flags.redo) {
      // --redo: xoá file + .tmp variant cũ để tải lại thật (file-exist check không nuốt --redo)
      await unlinkAny(dest)
      rmSync(`${dirname(dest)}/.tmp-${sanitize(v.title)}`, { recursive: true, force: true })
    } else {
      end('skip', 'đã có file')
      return rowKind
    }
  }
  // archive chống tải lại
  const arch = join(outDir, '.pornavhd-archive')
  const seen = readArchive(arch)
  if (seen.has(v.url) && !flags.redo) {
    end('skip', 'đã tải xong trước đó (archive) — dùng --redo để tải lại')
    return rowKind
  }

  const t0 = Date.now()
  // mốc [s] từ start job — đo pha fetching vs tải
  const fileLog = (s: string) => logger.log(fname, `[+${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`)
  const page = await browser.newPage('about:blank')
  try {
    const ok = await downloadVideo(page, v.url, dest, {
      res: flags.res,
      title: v.title,
      log: (s) => logger.key(fname, s.trim()),
      fileLog,
      streams: flags.streams,
      onProgress: (done, total, bytes) => mp.update(slot, done, total, bytes),
      onPhase: (p) => mp.phase(slot, p),
    })
    if (ok) {
      const secs = Math.round((Date.now() - t0) / 1000)
      appendFileSync(arch, `${v.url}\t${fname}\n`)
      const fi = failedUrls.indexOf(v.url)
      if (fi >= 0) failedUrls.splice(fi, 1)
      end('ok', '', Math.round((await stat(dest)).size / 1048576), secs)
      return rowKind
    }
    // downloadVideo tự log lý do; remove file rác nếu có
    await unlinkAny(dest)
    failedUrls.push(v.url)
    end('fail', 'tải thất bại (xem log để biết lý do + biện pháp đã thử)')
    return rowKind
  } catch (e: any) {
    const why = String(e).slice(0, 180)
    fileLog(`EXCEPTION: ${why}`)
    await unlinkAny(dest)
    failedUrls.push(v.url)
    end('fail', why)
    return rowKind
  } finally {
    await page.close().catch(() => {})
  }
}

function readArchive(arch: string): Set<string> {
  try {
    return new Set(
      readFileSync(arch, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => l.split('\t')[0]),
    )
  } catch {
    return new Set()
  }
}

async function unlinkAny(p: string) {
  try {
    if (statSync(p)) unlinkSync(p)
  } catch {}
}

export async function runCli(argv: string[]): Promise<number> {
  const flags = parseArgs(argv)
  // listing browser tạo LẶT (chỉ khi cần crawl /actor/?s= — target video/batch video không cần)
  let listingBrowser: Browser | null = null
  const fetchPage = async (url: string): Promise<string> => {
    if (!listingBrowser) listingBrowser = await Browser.launch(join(EXE_DIR, '.pw-profile-list'), console.log)
    return fetchPageHtml(listingBrowser, url, console.log)
  }
  // worker-0 browser đặt sẵn SONG SONG lúc buildJobs (tiết kiệm ~3-5s spawn serial)
  const worker0P = Browser.launch(PROFILE_DIR, console.log).catch(() => null as unknown)
  try {
    const jobs = await buildJobs(flags, fetchPage)
    if (flags.list) {
      let n = 0
      for (const job of jobs) {
        for (const v of job.vids) {
          n++
          console.log(`${String(n).padStart(4)}. ${v.duration.padStart(9)}  ${v.title.slice(0, 70).padEnd(70)}  ${v.url}`)
        }
      }
      console.log(`\n${n} video`)
      return 0
    }
    console.log(`pornavhd ▸ ${flags.target} | jobs=${flags.jobs} streams=${flags.streams} res=${flags.res || 'max'}`)
    if (jobs.length === 1 && jobs[0].vids.length) console.log(`          ▸ ${jobs[0].vids.length} video → ${jobs[0].outDir}${flags.logFile ? ` | log: ${flags.logFile}` : ''}`)
    const mp = new MultiProgress()
    const rows: Row[] = []
    const failedUrls: string[] = []
    const jobT0 = Date.now()
    for (const job of jobs) {
      mkdirSync(job.outDir, { recursive: true })
      const logger = new Logger(flags.logFile ? flags.logFile : join(job.outDir, 'pornavhd.log'))
      logger.consoleOut = (l) => mp.log(l)
      logger.log('run', `pornavhd ▸ ${flags.target} | jobs=${flags.jobs} streams=${flags.streams} res=${flags.res || 'max'}`)
      const idx = { i: 0 }
      const workers = Math.max(1, Math.min(flags.jobs, job.vids.length))
      // listing browser không dùng cho download → mỗi worker một browser riêng (profile -wN)
      await Promise.all(
        Array.from({ length: workers }, (_, w) => (async () => {
          let browser: Browser
          if (w === 0 && workers === 1) {
            browser = (await worker0P) || (await Browser.launch(PROFILE_DIR, console.log))
          } else {
            browser = await Browser.launch(workers === 1 ? PROFILE_DIR : `${PROFILE_DIR}-w${w}`, console.log)
          }
          try {
            while (true) {
              const i = idx.i
              if (i >= job.vids.length) break
              idx.i++
              const v = job.vids[i]
              logger.log(v.title, `start ${v.url}`)
              let res: 'ok' | 'fail' | 'skip' = 'fail'
              for (let attempt = 1; attempt <= flags.retries; attempt++) {
                res = await downloadOne(browser, v, flags, job.outDir, logger, mp, rows, failedUrls)
                if (res !== 'fail') break
                if (attempt < flags.retries) {
                  logger.key(v.title, `retry ${attempt}/${flags.retries} — tải lại từ segment đã có (resume)`)
                }
              }
            }
          } finally {
            await browser.close().catch(() => {})
          }
        })()),
      )
      // file fail để chạy lại: pornavhd --batch pornavhd-failed.txt
      if (failedUrls.length) {
        const ffail = join(job.outDir, 'pornavhd-failed.txt')
        // merge với nội dung cũ → không dồn chồng sau mỗi run; URL story mới dòng trước
        let prev: string[] = []
        try { prev = readFileSync(ffail, 'utf8').split(/\r?\n/).filter((u) => u.startsWith('http')) } catch {}
        const failSet = new Set([...failedUrls, ...prev])
        appendFileSync(ffail, [...failSet].join('\n') + '\n')
        console.log(`\n${failSet.size} video lỗi → ghi vào ${ffail} (chạy lại: pornavhd --batch pornavhd-failed.txt)`)
      }
      // summary bảng
      console.log('\n== TỔNG KẾT ==')
      console.log('trạng thái  file                                     dung lượng  thời gian      tốc độ   ghi chú')
      for (const r of rows) {
        const sp = r.secn && r.mbn ? `${(r.mbn / r.secn).toFixed(1)}MB/s` : ''
        console.log(`${r.status.padEnd(10)} ${r.title.padEnd(40)} ${r.mb.padStart(9)} ${r.secs.padStart(8)} ${sp.padStart(10)}  ${r.note.slice(0, 60)}`)
      }
      const okN = rows.filter((r) => r.status === 'ok').length
      const skipN = rows.filter((r) => r.status === 'skip').length
      const failN = rows.filter((r) => r.status === 'fail').length
      const ttlMb = rows.filter((r) => r.status === 'ok').reduce((a, r) => a + r.mbn, 0)
      const durS = Math.max(1, Math.round((Date.now() - jobT0) / 1000))
      console.log(`Xong: ${okN} ok, ${skipN} skip, ${failN} fail | ${Math.round(ttlMb)}MB trong ${durS}s${okN ? ` (${(ttlMb / durS).toFixed(1)}MB/s)` : ''} — log: ${flags.logFile || join(job.outDir, 'pornavhd.log')}`)
      if (failN) return 1
    }
    return 0
  } finally {
    await listingBrowser?.close().catch(() => {})
    let wb = null
    try { wb = await worker0P } catch {}
    if (wb && wb.close) await wb.close().catch(() => {})
  }
}

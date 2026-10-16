// src/run.ts — runCli: listing browser + download worker pool (event loop)
import { mkdirSync } from 'node:fs'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs, buildJobs, Flags } from './args'
import { crawl, parseCards, isCfChallenge, Vid, sanitize } from './listing'
import { Browser, Page } from './cdp'
import { downloadVideo } from './dl'
import { stat } from 'node:fs/promises'

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

async function downloadOne(
  browser: Browser,
  v: Vid,
  flags: Flags,
  outDir: string,
): Promise<boolean> {
  const fname = sanitize(v.title) + '.mp4'
  const dest = join(outDir, fname)
  try {
    const st = await stat(dest).catch(() => null)
    if (st && st.size >= 1024 * 1024) {
      console.log(`[skip] ${fname} (đã có)`)
      return true
    }
  } catch {}
  const page = await browser.newPage('about:blank')
  try {
    const ok = await downloadVideo(page, v.url, dest, { res: flags.res, title: v.title, log: console.log })
    console.log(`[${ok ? 'ok' : 'FAIL'}] ${fname}`)
    return ok && (await stat(dest).then((s) => s.size > 1024, () => false))
  } catch (e: any) {
    console.log(`  ! ${String(e).slice(0, 180)}`)
    console.log(`[FAIL] ${fname}`)
    await unlinkAny(dest)
    return false
  } finally {
    await page.close().catch(() => {})
  }
}

async function unlinkAny(p: string) {
  await stat(p).then(
    () => (import('node:fs')).then((f) => f.unlinkSync(p)),
    () => {},
  ).catch(() => {})
}

export async function runCli(argv: string[]): Promise<number> {
  const flags = parseArgs(argv)
  // 1 listing browser dùng chung cho mọi target (fetch list qua browser)
  const listingBrowser = await Browser.launch(join(EXE_DIR, '.pw-profile-list'), console.log)
  try {
    const jobs = await buildJobs(flags, (u) => fetchPageHtml(listingBrowser, u, console.log))
    if (flags.list) {
      let n = 0
      for (const job of jobs) {
        for (const v of job.vids) {
          n++
          console.log(`${String(n).padStart(4)}. [${v.duration.padStart(7)}] ${v.title}  ${v.url}`)
        }
      }
      return 0
    }
    let total = 0
    let done = 0
    let failed = 0
    for (const job of jobs) {
      mkdirSync(job.outDir, { recursive: true })
      const idx = { i: 0 }
      const workers = Math.max(1, Math.min(flags.jobs, job.vids.length))
      // listing browser không dùng cho download → mỗi worker một browser riêng (profile -wN)
      await Promise.all(
        Array.from({ length: workers }, (_, w) => (async () => {
          const browser = await Browser.launch(
            workers === 1 ? PROFILE_DIR : `${PROFILE_DIR}-w${w}`,
            console.log,
          )
          try {
            while (true) {
              const i = idx.i
              if (i >= job.vids.length) break
              idx.i++
              const v = job.vids[i]
              let ok = false
              for (let attempt = 1; attempt <= flags.retries; attempt++) {
                ok = await downloadOne(browser, v, flags, job.outDir)
                if (ok) break
                if (attempt < flags.retries) console.log(`  retry ${attempt}/${flags.retries}: ${v.title}`)
              }
              total++
              if (ok) done++
              else failed++
            }
          } finally {
            await browser.close().catch(() => {})
          }
        })()),
      )
    }
    if (total) console.log(`\nXong: ${done}/${total} ok, ${failed} fail`)
    return failed ? 1 : 0
  } finally {
    await listingBrowser.close().catch(() => {})
  }
}

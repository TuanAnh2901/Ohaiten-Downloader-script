// src/dl.ts — flow tải 1 video: browser chỉ để đọc window.links.hls2 (StreamHG/recordplay),
// toàn bộ segment tải NATIVE bằng Node fetch pool (mặc định 64 luồng) → ffmpeg remux.
import { execFileSync } from 'node:child_process'
import { unlinkSync, writeFileSync } from 'node:fs'
import type { Page } from './cdp'
import { vidUrlJoin } from './urljoin'

const AD_STREAM_HOSTS = ['growcdnssedge', 'whitetrafsa', 'tiktokcdn']
const PLAYER_FRAME_RE = /\/e\/|recordplay/
// UA khớp Edge thật — cdn-centaurus từ chối UA lạ
const DL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0'
const DL_HEADERS: Record<string, string> = { 'User-Agent': DL_UA, Referer: 'https://recordplay.biz/' }

export function isAdHost(url: string): boolean {
  return AD_STREAM_HOSTS.some((h) => url.includes(h))
}

export function isPlaylist(url: string): boolean {
  const u = url.toLowerCase()
  return u.includes('.m3u8') && !isAdHost(u)
}

/** resolve URI EXT-X-MAP & segments từ variant m3u8 (support fMP4 + TS) */
export function parseVariant(text: string, baseUrl: string): { segs: string[]; init: string | null } {  let init: string | null = null
  const segs: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const ln = raw.trim()
    if (ln.startsWith('#EXT-X-MAP:')) {
      const m = ln.match(/URI="([^"]+)"/)
      if (m) init = vidUrlJoin(baseUrl, m[1])
    } else if (ln && !ln.startsWith('#')) {
      segs.push(vidUrlJoin(baseUrl, ln))
    }
  }
  return { segs, init }
}

export interface HlsVariant { url: string; w: number; h: number }

/** master.m3u8 → danh sách variant kèm RESOLUTION (chỉ lấy line sau STREAM-INF là URL) */
export function parseMaster(text: string, baseUrl: string): HlsVariant[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim())
  const out: HlsVariant[] = []
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('#EXT-X-STREAM-INF')) continue
    const m = lines[i].match(/RESOLUTION=(\d+)x(\d+)/)
    const raw = lines[i + 1]
    if (m && raw && !raw.startsWith('#')) out.push({ url: vidUrlJoin(baseUrl, raw), w: Number(m[1]), h: Number(m[2]) })
  }
  return out
}

/** chọn variant theo --res: cao nhất ≤ res;若无 variant hợp → thấp nhất còn lại */
export function chooseVariant(vs: HlsVariant[], res?: number): HlsVariant | null {
  if (!vs.length) return null
  const ok = vs.filter((v) => !res || v.h <= res)
  if (!ok.length) return vs.reduce((a, b) => (b.h < a.h ? b : a))
  return ok.reduce((a, b) => (b.h > a.h ? b : a))
}

function fetchText(url: string): Promise<string> {
  return fetch(url, { headers: DL_HEADERS }).then(async (r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status} ${url.slice(0, 90)}`)
    return r.text()
  })
}

/** run pool: n worker kéo lần lượt chuỗi url, mỗi url retry 3 lần; transform áp cho từng buffer */
async function pooledDownload(
  urls: string[],
  streams: number,
  buf: Map<string, Buffer>,
  onProgress?: () => void,
  transform?: (b: Buffer) => Buffer,
): Promise<void> {
  let i = 0
  const next = async (): Promise<void> => {
    while (i < urls.length) {
      const u = urls[i++]
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(u, { headers: DL_HEADERS })
          if (r.ok) {
            const b = Buffer.from(await r.arrayBuffer())
            buf.set(u, transform ? transform(b) : b)
            onProgress?.()
            break
          }
        } catch {}
        if (attempt === 2) throw new Error(`tải fail: ${u.slice(0, 90)}`)
        await new Promise((r2) => setTimeout(r2, 800 * (attempt + 1)))
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(streams, urls.length)) }, () => next()))
}

function ffmpegConcat(parts: Buffer[], dest: string): void {
  const ts = dest.replace(/\.mp4$/, '.mp4.tmp')
  writeFileSync(ts, Buffer.concat(parts))
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', ts, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-movflags', '+faststart', dest], {
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  try {
    unlinkSync(ts)
  } catch {}
}

export interface DlOpts {
  res?: number
  title: string
  log?: (s: string) => void
  /** số luồng song song tải segment (default 64) */
  streams?: number
}

/** Giải Dean-Edwards packer: eval(function(p,a,c,k,e,d){...}('P',radix,count,'k|k|...'.split('|'))) */
export function unpackPacked(src: string): string | null {
  const m = src.match(/\}\('((?:\\.|[^'\\])*)',(\d+),(\d+),'((?:\\.|[^'\\])*)'\.split\('\|'\)/)
  if (!m) return null
  const [, pRaw, aRaw, , kRaw] = m
  const a = parseInt(aRaw)
  const enc = (n: number): string => {
    let s = ''
    let nn = n
    while (nn > 0) {
      const d = nn % a
      s = (d > 35 ? String.fromCharCode(d + 29) : d.toString(36)) + s
      nn = Math.floor(nn / a)
    }
    return s
  }
  const dict: Record<string, string> = {}
  kRaw.split('|').forEach((w, i) => { dict[enc(i)] = w })
  const p = pRaw.replace(/\\'/g, "'")
  return p.replace(/[0-9a-zA-Z_-]+/g, (w) => (w in dict ? dict[w] : w))
}

/** Đọc links (hls2...) từ HTML trang /e/<code> — fetch thuần, không cần iframe */
export function extractLinks(unpacked: string): Record<string, string> | null {
  const m = unpacked.match(/var links=({.*?});/)
  if (!m) return null
  try {
    return JSON.parse(m[1].replace(/\\'/g, "'"))
  } catch {
    return null
  }
}

/** embed page recordplay/playrecord (`/e|/embed`) → toàn bộ links (native) */
export async function resolveLinks(embedUrl: string, log: (s: string) => void): Promise<{ links: Record<string, string>; base: string } | null> {
  try {
    const r = await fetch(embedUrl, {
      headers: { 'User-Agent': DL_UA, Referer: 'https://pornavhd.com/' },
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const html = await r.text()
    const unpacked = unpackPacked(html)
    const links = unpacked && extractLinks(unpacked)
    if (links) {
      const base = new URL(embedUrl).origin
      return { links, base }
    }
    log('  ! embed page không có links (source chết?)')
    return null
  } catch (e: any) {
    log(`  ! resolveLinks: ${String(e.message).slice(0, 120)}`)
    return null
  }
}

/** Bait recordplay: segment "PNG" 1×1 của tiktokcdn — fragment TS thật nối SAU IEND chunk (58-62 byte đầu là PNG shell) */
export function stripPngPayload(buf: Buffer): Buffer {
  const i = buf.indexOf(Buffer.from('49454e44ae426082', 'hex'))
  if (i < 0) return buf // không phải PNG → nguyên bản
  return buf.subarray(i + 8)
}


export async function downloadVideo(
  page: Page,
  videoUrl: string,
  destPath: string,
  opts: DlOpts,
): Promise<boolean> {
  const log = opts.log || (() => {})
  const streams = Math.max(1, opts.streams ?? 64)

  // 1) navigate + chờ CF, chỉ cần LẤY embed recordplay/playrecord (code) từ HTML
  await page.goto(videoUrl, 45_000)
  let cfWarned = false
  let embedUrl = ''
  let links2 = '' // fallback cũ: window.links.hls2 đọc thẳng từ iframe
  const start = Date.now()
  while (Date.now() - start < 240_000 && !embedUrl && !links2) {
    const html = await page.html()
    if (!cfWarned && html.includes('Just a moment')) {
      log('  ! Cloudflare challenge — hãy click cửa sổ browser để giải')
      cfWarned = true
    }
    embedUrl = html.match(/https:\/\/(?:recordplay|playrecord)\.biz\/(?:e|embed)\/[a-z0-9]+/)?.[0] || ''
    if (!embedUrl) {
      const hits = await page.evalInFrames(PLAYER_FRAME_RE, `
        (typeof links !== 'undefined' && links && links.hls2) ? links.hls2 : ''`)
      links2 = hits.find((x) => typeof x === 'string' && x.startsWith('http')) || ''
    }
    if (Date.now() - start > 45_000 && html.length < 100) {
      throw new Error('trang không load được (network hay chặn?)')
    }
    if (!embedUrl && !links2) await new Promise((r2) => setTimeout(r2, 1000))
  }

  const nat = embedUrl ? await downloadNative(embedUrl, destPath, opts, log, streams) : false
  if (nat) return true

  // 2) FALLBACK đường hls2 cũ (chỉ chạy khi native path chết)
  if (!links2) {
    log('  ! Không đọc được links (source recordplay có thể đã chết)')
    return false
  }
  return downloadHls2(links2, destPath, opts, log, streams)
}

/** ✅ ĐƯỜNG CHÍNH: bản thu cho người xem nằm trong "PNG" tiktokcdn —
 *  mỗi segment = 58-62 byte PNG shell + TS thật nối sau IEND. Cả chuỗi fetch được native:
 *  /e/<code> → links.hls4 (recordplay /stream/) → master → variant → index → tiktok PNG. */
async function downloadNative(
  embedUrl: string,
  destPath: string,
  opts: DlOpts,
  log: (s: string) => void,
  streams: number,
): Promise<boolean> {
  const res = await resolveLinks(embedUrl, log)
  if (!res) return false
  const { links, base } = res
  const hls4 = links.hls4
  if (!hls4) {
    log('  ! embed không có links.hls4')
    return false
  }
  const hls4Abs = hls4.startsWith('http') ? hls4 : `${base}${hls4}`

  let master: string
  try {
    master = await fetchText(hls4Abs)
  } catch (e: any) {
    log(`  ! hls4 master: ${String(e.message).slice(0, 140)}`)
    return false
  }
  const variants = parseMaster(master, hls4Abs)
  const best = chooseVariant(variants, opts.res)
  if (!best) {
    log('  ! master không có variant nào')
    return false
  }
  log(`  $ ${best.w}x${best.h} ${streams} luồng`)

  let indexText: string
  try {
    indexText = await fetchText(best.url)
  } catch (e: any) {
    log(`  ! index m3u8: ${String(e.message).slice(0, 140)}`)
    return false
  }
  const { segs, init } = parseVariant(indexText, best.url)
  if (!segs.length) {
    log('  ! index không có segment nào')
    return false
  }
  const ordered = (init ? [init] : []).concat(segs)

  const buf = new Map<string, Buffer>()
  let done = 0
  let lastPrint = 0
  const t0 = Date.now()
  try {
    await pooledDownload(ordered, streams, buf, () => {
      done++
      const pct = (done * 100) / ordered.length
      if (pct - lastPrint >= 10 || done === ordered.length) {
        lastPrint = pct
        console.log(`  ${Math.floor(pct)}% (${done}/${ordered.length})`)
      }
    }, stripPngPayload)
  } catch (e: any) {
    log(`  ! ${String(e.message).slice(0, 160)}`)
    return false
  }
  log(`  $ ${Math.round([...buf.values()].reduce((s, b) => s + b.length, 0) / 1048576)}MB / ${Math.round((Date.now() - t0) / 1000)}s | ${ordered.length} segment`)

  const parts = ordered.map((u) => buf.get(u)).filter(Boolean) as Buffer[]
  if (!parts.length) {
    log('  ! Không có dữ liệu segment nào')
    return false
  }
  ffmpegConcat(parts, destPath)
  return true
}

/** FALLBACK cũ: hls2 (cdn-centaurus) — một số video host sống thì dùng */
async function downloadHls2(
  hls2: string,
  destPath: string,
  opts: DlOpts,
  log: (s: string) => void,
  streams: number,
): Promise<boolean> {
  let master: string
  try {
    master = await fetchText(hls2)
  } catch (e: any) {
    log(`  ! master.m3u8: ${String(e.message).slice(0, 140)}`)
    return false
  }
  const variants = parseMaster(master, hls2)
  const best = chooseVariant(variants, opts.res)
  if (!best) {
    log('  ! master không có variant nào')
    return false
  }
  log(`  $ ${best.w}x${best.h} ${streams} luồng`)

  let indexText: string
  try {
    indexText = await fetchText(best.url)
  } catch (e: any) {
    log(`  ! index m3u8: ${String(e.message).slice(0, 140)}`)
    return false
  }
  const { segs, init } = parseVariant(indexText, best.url)
  if (!segs.length) {
    log('  ! index không có segment nào')
    return false
  }
  const ordered = (init ? [init] : []).concat(segs)

  const buf = new Map<string, Buffer>()
  let done = 0
  let lastPrint = 0
  const t0 = Date.now()
  try {
    await pooledDownload(ordered, streams, buf, () => {
      done++
      const pct = (done * 100) / ordered.length
      if (pct - lastPrint >= 10 || done === ordered.length) {
        lastPrint = pct
        console.log(`  ${Math.floor(pct)}% (${done}/${ordered.length})`)
      }
    })
  } catch (e: any) {
    log(`  ! ${String(e.message).slice(0, 160)}`)
    return false
  }
  log(`  $ ${Math.round([...buf.values()].reduce((s, b) => s + b.length, 0) / 1048576)}MB / ${Math.round((Date.now() - t0) / 1000)}s | ${ordered.length} segment`)

  const parts = ordered.map((u) => buf.get(u)).filter(Boolean) as Buffer[]
  if (!parts.length) {
    log('  ! Không có dữ liệu segment nào')
    return false
  }
  ffmpegConcat(parts, destPath)
  return true
}

export { vidUrlJoin }

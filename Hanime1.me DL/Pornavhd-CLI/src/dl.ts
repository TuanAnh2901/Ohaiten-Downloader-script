// src/dl.ts — flow tải 1 video: browser chỉ để đọc window.links.hls2 (StreamHG/recordplay),
// toàn bộ segment tải NATIVE bằng Node fetch pool (mặc định 64 luồng) → ffmpeg remux.
import { execFileSync } from 'node:child_process'
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import type { Page } from './cdp'
import { vidUrlJoin } from './urljoin'
import { parseFfprobeDuration } from './log'

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

/** run pool: n worker kéo lần lượt chuỗi url, mỗi url retry 3 lần.
 *  Segment ghi RA DISK (tmpDir/NNNN.bin) — crash/kill lần sau tự resume (file có sẵn size>0 được giữ). */
async function pooledDownload(
  urls: string[],
  streams: number,
  tmpDir: string,
  onProgress?: (done: number, total: number, bytes: number) => void,
  transform?: (b: Buffer) => Buffer,
): Promise<string[]> {
  mkdirSync(tmpDir, { recursive: true })
  const paths = urls.map((_, i) => join(tmpDir, `${String(i).padStart(4, '0')}.bin`))
  let done = 0
  let bytes = 0
  const report = () => onProgress?.(done, urls.length, bytes)
  for (let k = 0; k < urls.length; k++) {
    try {
      const st = statSync(paths[k])
      if (st.size > 0) {
        done++
        bytes += st.size
      }
    } catch {}
  }
  if (done) report()
  let i = 0
  const next = async (): Promise<void> => {
    while (i < urls.length) {
      const k = i++
      try {
        if (statSync(paths[k]).size > 0) continue // resume từ lần chạy trước
      } catch {}
      const u = urls[k]
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(u, { headers: DL_HEADERS })
          if (r.ok) {
            const raw = Buffer.from(await r.arrayBuffer())
            const b = transform ? transform(raw) : raw
            writeFileSync(paths[k], b)
            done++
            bytes += b.length
            report()
            break
          }
        } catch {}
        if (attempt === 2) throw new Error(`tải fail: ${u.slice(0, 90)}`)
        await new Promise((r2) => setTimeout(r2, 800 * (attempt + 1)))
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(streams, urls.length)) }, () => next()))
  return paths
}

/** ghép các file segment theo thứ tự → .ts tạm → ffmpeg remux → xoá tmp */
function ffmpegConcatFiles(paths: string[], dest: string): void {
  const ts = dest.replace(/\.mp4$/, '.mp4.tmp')
  const out = openSync(ts, 'w')
  try {
    for (const p of paths) writeSync(out, readFileSync(p))
  } finally {
    closeSync(out)
  }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', ts, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-movflags', '+faststart', dest], {
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  try {
    rmSync(ts)
  } catch {}
}

/** verify sau tải: size ≥ 1MB + ffprobe đọc được duration */
export function verifyVideo(dest: string): { ok: boolean; mb: number; dur: number | null; why?: string } {
  try {
    const size = statSync(dest).size
    if (size < 1048576) return { ok: false, mb: 0, dur: null, why: `file quá nhỏ (${size}B)` }
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', dest], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString()
    const dur = parseFfprobeDuration('duration=' + out.trim())
    if (!dur) return { ok: false, mb: Math.round(size / 1048576), dur: null, why: 'ffprobe không đọc được duration' }
    return { ok: true, mb: Math.round(size / 1048576), dur }
  } catch (e: any) {
    return { ok: false, mb: 0, dur: null, why: `ffprobe: ${String(e.message).slice(0, 80)}` }
  }
}

/** tmpDir cho 1 video + variant: <thư mục dest>/.tmp-<tên file>/<h>/ */
function tmpDirFor(dest: string, h: number): string {
  return join(dirname(dest), `.tmp-${basename(dest).replace(/\.mp4$/, '')}`, String(h))
}

export interface DlOpts {
  res?: number
  title: string
  log?: (s: string) => void
  /** log verbose ra file (mỗi retry/HTTP lỗi/biện pháp) */
  fileLog?: (s: string) => void
  /** số luồng song song tải segment (default 64) */
  streams?: number
  /** progress: (done, total, bytes) — wired vào progress bar */
  onProgress?: (done: number, total: number, bytes: number) => void
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

      harvestMirrorDomains(links)
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

/** Pool domain mirror recordplay: 1 file id phục vụ được qua nhiều domain thay nhau.
 *  Một số domain bị CF chặn bot (403 Website Access Blocked) — swap sang domain cùng family là thông. */
const MIRROR_DOMAINS: string[] = ['modernfitnessguru.cyou']

function harvestMirrorDomains(links: { hls2?: string; hls3?: string }) {
  for (const u of [links.hls3, links.hls2]) {
    try {
      if (!u?.startsWith('http')) continue
      const host = new URL(u).hostname
      const labels = host.split('.')
      if (labels.length < 3 || /[0-9a-f]{8,}/.test(host) || host.includes('centaurus') || host.includes('tiktokcdn')) continue
      const d = labels.slice(1).join('.')
      if (!MIRROR_DOMAINS.includes(d) && MIRROR_DOMAINS.length < 8) MIRROR_DOMAINS.push(d)
    } catch { /* ignore */ }
  }
}

function swapMirrorDomain(u: string, domain: string): string {
  const m = u.match(/^(https:\/\/)([^/]+)/)
  if (!m) return u
  const labels = m[2].split('.')
  if (labels.length < 3) return u
  return u.replace(m[2], labels[0] + '.' + domain)
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

  const nat = embedUrl ? await downloadNative(embedUrl, destPath, opts) : false
  if (nat) return true

  // 2) FALLBACK đường hls2 cũ (chỉ chạy khi native path chết)
  if (!links2) {
    log('  ! Không đọc được links (source recordplay có thể đã chết)')
    return false
  }
  return downloadFromMaster(links2, destPath, opts, 'hls2', undefined)
}

/** Mirror recordplay rỗng placeholder `_,,,,,.urlset` → bộ variant đầy `_,l,n,h,` (chuẩn của họ) */
export function fixMirrorUrl(u: string): string {
  return u.replace(/_[,]+(?=\.urlset)/, '_,l,n,h,')
}

/** Chuỗi tải 1 master m3u8: chọn variant (cao nhất ≤ res) → tải → ghép → verify.
 *  Biện pháp: variant lỗi → rơi chất lượng thấp hơn còn sống; hết variant → fail (giữ tmp để resume). */
async function downloadFromMaster(
  masterUrl: string,
  destPath: string,
  opts: DlOpts,
  sourceLabel: string,
  transform?: (b: Buffer) => Buffer,
): Promise<boolean> {
  const log = opts.log || (() => {})
  const fileLog = opts.fileLog || (() => {})
  const streams = Math.max(1, opts.streams ?? 64)
  let master = ''
  let masterErr = ''
  // nguyên bản trước, hết thì swap sang domain mirror khác trong pool (chỉ hls3/hls2 — hls4 là host riêng)
  const candidates = [masterUrl]
  if (sourceLabel !== 'hls4') {
    for (const d of MIRROR_DOMAINS) {
      const s = swapMirrorDomain(masterUrl, d)
      if (s !== masterUrl && !candidates.includes(s)) candidates.push(s)
    }
  }
  outer: for (const cu of candidates) {
    const tries = cu === candidates[0] ? 2 : 1
    for (let attempt = 0; attempt < tries; attempt++) {
      try {
        master = await fetchText(cu)
        masterErr = ''
        masterUrl = cu
        fileLog(`master OK qua ${cu}`)
        break outer
      } catch (e: any) {
        masterErr = String(e.message)
        if (attempt < tries - 1) await new Promise((r) => setTimeout(r, 2000))
      }
    }
  }
  if (masterErr) {
    log(`  ! ${sourceLabel} master: ${masterErr.slice(0, 140)}`)
    fileLog(`${sourceLabel} master fail (tất cả candidate domain): ${masterErr}`)
    return false
  }
  let variants = parseMaster(master, masterUrl)
  variants = variants.filter((v) => !opts.res || v.h <= opts.res)
  variants.sort((a, b) => b.h - a.h) // cao trước, fail thì rơi xuống thấp
  if (!variants.length) {
    log('  ! không còn variant nào phù hợp --res')
    return false
  }
  const t0 = Date.now()
  for (const v of variants) {
    log(`  $ ${v.w}x${v.h} (${sourceLabel}) ${streams} luồng`)
    fileLog(`${sourceLabel}: variant ${v.w}x${v.h} url=${v.url.slice(0, 160)}`)
    try {
      const indexText = await fetchText(v.url)
      const { segs, init } = parseVariant(indexText, v.url)
      if (!segs.length) throw new Error('index không có segment nào')
      const ordered = (init ? [init] : []).concat(segs)
      const tmpDir = tmpDirFor(destPath, v.h)
      const paths = await pooledDownload(ordered, streams, tmpDir, opts.onProgress, transform)
      ffmpegConcatFiles(paths, destPath)
      const vr = verifyVideo(destPath)
      if (!vr.ok) throw new Error(vr.why || 'verify fail')
      const secs = Math.round((Date.now() - t0) / 1000)
      log(`  $ ${vr.mb}MB / ${secs}s | ${ordered.length} segment | dài ${Math.round(vr.dur!)}s — OK`)
      fileLog(`${sourceLabel} ${v.h}p OK: ${vr.mb}MB ${secs}s dur=${Math.round(vr.dur!)}s segs=${ordered.length}`)
      rmSync(join(dirname(destPath), `.tmp-${basename(destPath).replace(/\.mp4$/, '')}`), { recursive: true, force: true })
      return true
    } catch (e: any) {
      const why = String(e.message || e).slice(0, 140)
      fileLog(`${sourceLabel} ${v.h}p FAIL: ${why} → biện pháp: rơi variant thấp hơn`)
      log(`  ! ${v.h}p lỗi (${why.slice(0, 80)}) → thử chất lượng thấp hơn`)
    }
  }
  log(`  ! hết variant — ${sourceLabel} coi như chết (giữ .tmp để resume lần sau)`)
  return false
}

/** ✅ ĐƯỜNG CHÍNH: bản thu cho người xem nằm trong "PNG" tiktokcdn —
 *  mỗi segment = 58-62 byte PNG shell + TS thật nối sau IEND. Cả chuỗi fetch được native:
 *  /e|/embed/<code> → links.hls4 (recordplay/playrecord /stream/) → master → variant → index → tiktok PNG. */
async function downloadNative(embedUrl: string, destPath: string, opts: DlOpts): Promise<boolean> {
  const log = opts.log || (() => {})
  const fileLog = opts.fileLog || (() => {})
  // chuỗi nguồn: hls4 (segment "PNG" tiktok → strip shell) → hls3 (mirror .txt, TS thật đuôi .woff2) → hls2
  const sources: { key: 'hls4' | 'hls3' | 'hls2'; label: string; transform?: (b: Buffer) => Buffer }[] = [
    { key: 'hls4', label: 'hls4', transform: stripPngPayload },
    { key: 'hls3', label: 'hls3' },
    { key: 'hls2', label: 'hls2' },
  ]
  for (const s of sources) {
    // mirror host xoay vòng mỗi lần fetch /e/ — thử 2 lần, lần 2 refetch lấy host sống mới
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await resolveLinks(embedUrl, log)
      if (!res || !res.links[s.key]) break // nguồn không tồn tại với video này → nguồn kế
      const raw = res.links[s.key]!
      const fixed = raw.startsWith('http') ? raw : res.base + raw
      if (await downloadFromMaster(fixMirrorUrl(fixed), destPath, opts, s.label, s.transform)) return true
      log(`  ! ${s.label} ${attempt ? '(host xoay mới)' : ''} vẫn chết`)
      fileLog(`${s.label} attempt ${attempt + 1} fail → ${attempt ? 'sang nguồn kế' : 'refetch /e/ lấy host mới'}`)
    }
  }
  fileLog('hết đường: cả hls4/hls3/hls2 đều chết')
  return false
}

export { vidUrlJoin }

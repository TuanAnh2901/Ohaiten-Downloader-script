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

/** chọn variant theo --res: cao nhất ≤ res (tie: chọn width lớn hơn);无 hợp → nhỏ nhất */
export function chooseVariant(vs: HlsVariant[], res?: number): HlsVariant | null {
  if (!vs.length) return null
  const better = (a: HlsVariant, b: HlsVariant) => (b.h > a.h || (b.h === a.h && b.w > a.w) ? b : a)
  const ok = vs.filter((v) => !res || v.h <= res)
  if (!ok.length) return vs.reduce((a, b) => (b.h < a.h ? b : a))
  return ok.reduce(better)
}

/** Host mirror CF trả "Access Blocked" — quên cả run (retry lại chỉ tốn request, càng bị chặn chặt hơn) */
const CF_BANNED = new Set<string>()

function fetchText(url: string): Promise<string> {
  return fetch(url, { headers: DL_HEADERS, signal: AbortSignal.timeout(15_000) }).then(async (r) => {
    if (!r.ok) {
      if (r.status === 403) {
        const body = await r.text().catch(() => '')
        if (body.includes('Access Blocked') || body.includes('Just a moment')) {
          try { CF_BANNED.add(new URL(url).hostname) } catch {}
        }
      }
      throw new Error(`HTTP ${r.status} ${url.slice(0, 90)}`)
    }
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
          const r = await fetch(u, { headers: DL_HEADERS, signal: AbortSignal.timeout(60_000) })
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
  /** phase của slot: 'master' | 'seg' | 'ghép' | 'kiểm tra' — status line hiển thị đang làm gì */
  onPhase?: (p: string) => void
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
      for (const d of harvestMirrorDomains(links)) if (!MIRROR_DOMAINS.includes(d)) MIRROR_DOMAINS.push(d)
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
const MIRROR_DOMAINS: string[] = ['modernfitnessguru.cyou', 'cdn-centaurus.com', 'babycareproducts.shop']

/** Pure: tiền tố subdomain per-code là hex 12 ký tự — bỏ filter hex cũ (đã từng khiến hàm này chết hoàn toàn).
 *  Skip family dummy `dX-dX.com` (NXDOMAIN — quay liên tục từ /e/); domain = host trừ tiền tố.
 *  Trả pool mới (cap 8) — orig pool giữ vị trí ưu tiên đầu. */
export function harvestMirrorDomains(links: { hls2?: string; hls3?: string }, pool: string[] = MIRROR_DOMAINS): string[] {
  const out = [...pool]
  for (const ref of [links.hls3, links.hls2]) {
    try {
      if (!ref?.startsWith('http') || ref.includes('tiktokcdn')) continue
      const labels = new URL(ref).hostname.split('.')
      if (labels.length < 3) continue
      const d = labels.slice(1).join('.')
      // family dummy: subdomain chính dạng ab-cd (dp-do/ds-dr/do-dn...) — NXDOMAIN toàn cầu đã kiểm chứng
      if (!d || /^[a-z]{2}-[a-z]{2}\./.test(d) || out.includes(d) || out.length >= 8) continue
      out.push(d)
    } catch { /* ignore */ }
  }
  return out
}

function swapMirrorDomain(u: string, domain: string): string {
  const m = u.match(/^(https:\/\/)([^/]+)/)
  if (!m) return u
  const labels = m[2].split('.')
  if (labels.length < 3) return u
  return u.replace(m[2], labels[0] + '.' + domain)
}

/** Ma trận master đầy đủ: domain swap × mọi slot placeholder (file chỉ có 1 bảng chất lượng —
 *  slot h trên domain khác thường 404, phải thử h→n→l riêng từng domain). Đã lọc trùng. */
export function masterSwapCandidates(masterUrl: string, domains: string[]): string[] {
  const out = [masterUrl]
  for (const d of domains) {
    const s = swapMirrorDomain(masterUrl, d)
    if (s === masterUrl) continue
    for (const c of [s, ...masterCandidates(s)]) if (!out.includes(c)) out.push(c)
  }
  return out
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
  opts.onPhase?.('trang')
  await page.goto(videoUrl, 45_000)
  let cfWarned = false
  let embedUrls: string[] = []
  let links2 = '' // fallback cũ: window.links.hls2 đọc thẳng từ iframe
  const start = Date.now()
  while (Date.now() - start < 240_000 && !embedUrls.length && !links2) {
    const html = await page.html()
    if (!cfWarned && html.includes('Just a moment')) {
      log('  ! Cloudflare challenge — hãy click cửa sổ browser để giải')
      cfWarned = true
    }
    // nhiều URL embed (code cũ chết được thay bằng mới trong trang) — thử lần lượt hết
    embedUrls = [...new Set(html.match(/https:\/\/(?:recordplay|playrecord)\.biz\/(?:e|embed)\/[a-z0-9]+/g) || [])]
    if (!embedUrls.length) {
      const hits = await page.evalInFrames(PLAYER_FRAME_RE, `
        (typeof links !== 'undefined' && links && links.hls2) ? links.hls2 : ''`)
      links2 = hits.find((x) => typeof x === 'string' && x.startsWith('http')) || ''
    }
    if (Date.now() - start > 45_000 && html.length < 100) {
      throw new Error('trang không load được (network hay chặn?)')
    }
    if (!embedUrls.length && !links2) await new Promise((r2) => setTimeout(r2, 500))
  }

  const nat = embedUrls.length ? await downloadNative(embedUrls, destPath, opts) : false
  if (nat) return true

  // 2) FALLBACK đường hls2 cũ (chỉ chạy khi native path chết)
  if (!links2) {
    log('  ! Không đọc được links (source recordplay có thể đã chết)')
    return false
  }
  return downloadFromMaster(links2, destPath, opts, 'hls2', undefined)
}

/** Mirror recordplay: placeholder `_,…,.urlset` là DANH SÁCH chất lượng phản ánh nội dung thật —
 * mỗi file có tập variants riêng (02: l,n,h; 09: chỉ n,h; 03: dạng rút gọn `_n/`).
 * Expand thành các candidate đơn lẻ cao→thấp, server trả 404 cho combo không có. */
export function masterCandidates(u: string): string[] {
  const m = u.match(/^(.*)_([^/?]*),([^/?]*)\.urlset\/(master\.(?:txt|m3u8))(\?.*)?$/)
  if (!m) return [u]
  // server chỉ có 1 subset chất lượng mỗi file: thử slot đơn cao→thấp, rồi combo đầy đủ, rồi dạng rút gọn _n/
  const tail = `${m[4]}${m[5] || ''}`
  return [
    ...['h', 'n', 'l'].map((q) => `${m[1]}_,${q},.urlset/${tail}`),
    `${m[1]}_,l,n,h,.urlset/${tail}`,
    `${m[1]}_n/${tail}`,
  ]
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
  // 1) nguyên bản; 2) placeholder đơn (h→n→l, mỗi file có chất lượng riêng); 3) swap domain pool (CF chặn)
  const isBanned = (u: string) => { try { return CF_BANNED.has(new URL(u).hostname) } catch { return false } }
  const candidates = [masterUrl]
  if (sourceLabel !== 'hls4') {
    for (const c of masterCandidates(masterUrl)) if (!candidates.includes(c) && !isBanned(c)) candidates.push(c)
    for (const c of masterSwapCandidates(masterUrl, MIRROR_DOMAINS)) {
      if (!candidates.includes(c) && !isBanned(c)) candidates.push(c)
    }
  }
  // RACE: dò song song toàn bộ candidate (thay vì tuần tự — DNS chết từng cái mất 2-4s → 2 phút tổng).
  // Chọn kết quả 200 OK Ưu tiên theo thứ tự; pass 2 chỉ thử các lỗi tạm thời (không phải 404), đã lọc ban.
  type RaceRes = { url: string; text?: string; err?: string }
  let failLogged = 0
  const race = async (pool: string[]): Promise<RaceRes[]> =>
    Promise.all(pool.map(async (u): Promise<RaceRes> => {
      try { return { url: u, text: await fetchText(u) } } catch (e: any) {
        const err = String(e.cause?.code || e.cause?.message || e.message)
        if (failLogged++ < 6) fileLog(`   ! candidate fail: ${err} :: ${u.slice(24, 110)}`) // spam-guard: 6 dòng đầu, còn lại tổng cuối pass
        return { url: u, err }
      }
    }))
  let pool = candidates
  let raceRes: RaceRes[] = []
  for (let pass = 0; pass < 2 && pool.length; pass++) {
    raceRes = await race(pool)
    if (failLogged > 6) fileLog(`   ! (+${failLogged - 6} candidate fail nữa trong pass ${pass})`)
    failLogged = 0
    const pick = raceRes.find((r2) => r2.text)
    if (pick) {
      master = pick.text!
      masterUrl = pick.url
      fileLog(`master OK qua ${pick.url}`)
    }
    pool = pass === 0 && !raceRes.find((r2) => r2.text)
      ? raceRes.filter((r2) => r2.err && !r2.err.includes('404') && !isBanned(r2.url)).map((r2) => r2.url)
      : []
    if (pool.length === raceRes.length && pass === 0) await new Promise((r) => setTimeout(r, 2000))
  }
  if (!master) {
    masterErr = raceRes.find((r2) => r2.err)?.err || 'fetch failed'
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
  opts.onPhase?.('master')
  const tMs: number[] = []
  for (const v of variants) {
    log(`  $ ${v.w}x${v.h} (${sourceLabel}) ${streams} luồng`)
    fileLog(`${sourceLabel}: variant ${v.w}x${v.h} url=${v.url.slice(0, 160)}`)
    try {
      tMs[0] = Date.now() // master race xong
      const indexText = await fetchText(v.url)
      const { segs, init } = parseVariant(indexText, v.url)
      if (!segs.length) throw new Error('index không có segment nào')
      const ordered = (init ? [init] : []).concat(segs)
      const tmpDir = tmpDirFor(destPath, v.h)
      opts.onPhase?.('seg')
      tMs[1] = Date.now() // variant index xong
      const paths = await pooledDownload(ordered, streams, tmpDir, opts.onProgress, transform)
      opts.onPhase?.('ghép')
      tMs[2] = Date.now() // segment pool xong
      ffmpegConcatFiles(paths, destPath)
      opts.onPhase?.('kiểm tra')
      tMs[3] = Date.now() // ffmpeg xong
      const vr = verifyVideo(destPath)
      tMs[4] = Date.now() // verify xong
      if (!vr.ok) throw new Error(vr.why || 'verify fail')
      const secs = Math.round((Date.now() - t0) / 1000)
      log(`  $ ${vr.mb}MB / ${secs}s | ${ordered.length} segment | dài ${Math.round(vr.dur!)}s — OK`)
      fileLog(`${sourceLabel} ${v.h}p OK: ${vr.mb}MB ${secs}s dur=${Math.round(vr.dur!)}s segs=${ordered.length}`)
      // số liệu sâu từng phase (s) — đo кабинет hiệu năng mỗi lần chạy
      fileLog(`phases| master=${(tMs[0] - t0) / 1000} index=${(tMs[1] - tMs[0]) / 1000} seg=${(tMs[2] - tMs[1]) / 1000} ffmpeg=${(tMs[3] - tMs[2]) / 1000} verify=${(tMs[4] - tMs[3]) / 1000}`)
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
/** HLS query mangled: m3u8?=tok&=ts&e=f&srv=i → chèn lại tên key t,s,e,f,i theo vị trí. */
export function fixHls2Query(u: string): string {
  const i = u.indexOf('.m3u8?')
  if (i < 0) return u
  const base = u.slice(0, i + 5)
  const pairs = u.slice(i + 5).split('&').map(kv => kv.replace(/^\?=/, '='))
  const keyByIdx: Record<number, string> = { 0: 't', 1: 's', 2: 'e', 3: 'f', 5: 'i' }
  const fixed = pairs.map((kv, idx) => (kv.startsWith('=') ? keyByIdx[idx] + kv : kv)).join('&')
  return `${base}?${fixed}`
}

async function downloadNative(embedUrls: string[], destPath: string, opts: DlOpts): Promise<boolean> {
  const log = opts.log || (() => {})
  const fileLog = opts.fileLog || (() => {})
  // cache 1 fetch /e/ mỗi code — trước đây hls4/hls3/hls2 mỗi nguồn fetch lại trang (3× chậm)
  const cache = new Map<string, Awaited<ReturnType<typeof resolveLinks>>>()
  const getLinks = async (eu: string) => {
    if (!cache.has(eu)) cache.set(eu, await resolveLinks(eu, log))
    return cache.get(eu) || null
  }
  // token hls2 dummy "dm-dk/dp-do" (server trả giả ngẫu nhiên ~50%) → refetch /e/ tới khi được token thật
  const getLinksRealTok = async (eu: string) => {
    for (let i = 0; i < 5; i++) {
      const res = await getLinks(eu)
      const tok = res?.links.hls2 ? new URL(res.links.hls2).search.split('&')[0].replace(/^\??=/, '') : ''
      if (!res || !res.links.hls2 || tok.length >= 20) return res
      cache.delete(eu)
      fileLog(`   ! token hls2 dummy (${tok.slice(0, 14)}) → refetch /e/ (${i + 1}/5)`)
    }
    return null
  }
  // chuỗi nguồn: hls4 (segment "PNG" tiktok → strip shell) → hls3 (mirror .txt, TS thật đuôi .woff2) → hls2
  const sources: { key: 'hls4' | 'hls3' | 'hls2'; label: string; transform?: (b: Buffer) => Buffer }[] = [
    { key: 'hls4', label: 'hls4', transform: stripPngPayload },
    { key: 'hls3', label: 'hls3' },
    { key: 'hls2', label: 'hls2' },
  ]
  for (const s of sources) {
    // pass 0: cache; pass 1: refetch /e/ thay token/signed (hls4 403 vì token chết hồi sinh — quan sát thực tế)
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 1) for (const eu of embedUrls) cache.delete(eu)
      for (const eu of embedUrls) {
        const res = s.key === 'hls2' ? await getLinksRealTok(eu) : await getLinks(eu)
        if (!res || !res.links[s.key]) continue // nguồn không tồn tại với code này → code kế
        const raw = res.links[s.key]!
        const fixed0 = raw.startsWith('http') ? raw : res.base + raw
        const fixed = s.key === 'hls2' ? fixHls2Query(fixed0) : fixed0
        if (await downloadFromMaster(fixed, destPath, opts, s.label, s.transform)) return true
        log(`  ! ${s.label} chết`)
        fileLog(`${s.label} (code ${eu.slice(-14)}) chết${pass ? ' (sau refetch)' : ''} → nguồn kế`)
      }
    }
  }
  fileLog('hết đường: cả hls4/hls3/hls2 đều chết')
  return false
}

export { vidUrlJoin }

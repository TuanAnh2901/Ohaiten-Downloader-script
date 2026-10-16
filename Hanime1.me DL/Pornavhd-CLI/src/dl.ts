// src/dl.ts — flow tải 1 video: response listener -> play 16x -> gom fMP4 segment -> ffmpeg
// Port pornavhd.py:97-345.
import { execFileSync } from 'node:child_process'
import { unlinkSync, writeFileSync } from 'node:fs'
import type { Page, CdpResponse } from './cdp'
import { vidUrlJoin } from './urljoin'

const AD_STREAM_HOSTS = ['growcdnssedge', 'whitetrafsa', 'tiktokcdn']
const PLAYER_FRAME_RE = /\/e\/|recordplay/

export function isAdHost(url: string): boolean {
  return AD_STREAM_HOSTS.some((h) => url.includes(h))
}

export function isPlaylist(url: string): boolean {
  const u = url.toLowerCase()
  return u.includes('.m3u8') && !isAdHost(u)
}

/**_resolve URI EXT-X-MAP & segments, urljoin với base m3u8 */
export function parseVariant(text: string, baseUrl: string): { segs: string[]; init: string | null } {
  let init: string | null = null
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

function ffmpegConcat(parts: Buffer[], dest: string): void {
  const ts = dest.replace(/\.mp4$/, '.mp4.tmp')
  writeFileSync(ts, Buffer.concat(parts))
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', ts, '-c', 'copy', '-movflags', '+faststart', dest], {
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
  stallMs?: number
}

/** (variant chọn theo res, cao nhất có thể dưới res) */
function chooseVariant(
  variants: Map<string, string>,
  res?: number,
): { segs: string[]; init: string | null } | null {
  let best: { segs: string[]; init: string | null } | null = null
  let bestH = -1
  for (const [vurl, vtext] of variants) {
    const { segs, init } = parseVariant(vtext, vurl)
    const hs = [...vtext.matchAll(/RESOLUTION=(\d+)x(\d+)/g)].map((m) => Number(m[2]))
    const h = hs.length ? Math.min(...hs) : segs.length
    const okH = res ? h <= res : true
    if (okH && h >= bestH && segs.length) {
      best = { segs, init }
      bestH = h
    }
  }
  return best
}

export async function downloadVideo(
  page: Page,
  videoUrl: string,
  destPath: string,
  opts: DlOpts,
): Promise<boolean> {
  const log = opts.log || (() => {})
  const stallMs = opts.stallMs || 180_000
  const variants = new Map<string, string>() // url -> body m3u8
  const segs = new Map<string, Buffer>() // url -> body
  let respCount = 0

  page.on('response', (r: CdpResponse) => {
    respCount++
    if (r.status !== 200) return
    if (isPlaylist(r.url)) {
      page.getResponseBody(r.requestId).then((b) => {
        if (b) variants.set(r.url, b.toString('utf8'))
      }, () => {})
      return
    }
    const ct = r.contentType.toLowerCase()
    if (
      ct.includes('video') ||
      ct.includes('mp4') ||
      r.url.toLowerCase().endsWith('.mp4') ||
      ct.includes('octet-stream')
    ) {
      page.getResponseBody(r.requestId).then(
        (b) => {
          if (b) segs.set(r.url, b)
        },
        () => {},
      )
    }
  })

  // navigate + chờ player render (Cloudflare có thể cần click tay)
  await page.goto(videoUrl, 45_000)
  const cfWarn = ((s: string) => log(`  ! ${s}`)).bind(null)
  let cfWarned = false
  let variantsReady = false
  const start = Date.now()
  while (Date.now() - start < 240_000 && !variantsReady) {
    const html = await page.html()
    if (!cfWarned && html.includes('Just a moment')) {
      cfWarn('Cloudflare challenge — hãy click cửa sổ browser để giải')
      cfWarned = true
    }
    if (html.includes('<iframe') || html.includes('responsive-player')) {
      // gọi play & tăng tốc trong frame player
      for (const r of await page.evalInFrames(PLAYER_FRAME_RE, `
        try {
          if (typeof jwplayer !== 'undefined') { jwplayer().play(); const p = jwplayer(); p.setMute(true); p.setPlaybackRate(16); }
        } catch (e) {}`)) {}
      await new Promise((r2) => setTimeout(r2, 500))
      if (variants.size) {
        variantsReady = true
        break
      }
    }
    if (Date.now() - start > 45_000 && html.length < 100) {
      throw new Error('trang không load được (network hay chặn?)')
    }
    await new Promise((r2) => setTimeout(r2, 1000))
  }
  if (!variantsReady && !variants.size) {
    log('  ! Player không play / không bắt được playlist')
    return false
  }

  const best = chooseVariant(variants, opts.res)
  if (!best) {
    log('  ! Playlist không có segment nào')
    return false
  }
  const needed = best.segs
  log(`  $ variant ${needed.length} segment`)

  // đợi player tải đủ (16x nên nhanh), kẹt quá stallMs thì dừng
  let stale = Date.now()
  let lastGot = -1
  while (true) {
    const got = needed.filter((u) => segs.has(u)).length
    if (got !== lastGot) {
      stale = Date.now()
      lastGot = got
    }
    if (Date.now() - stale > stallMs) {
      log(`  ! Kẹt ở ${got}/${needed.length} segment (stall > ${Math.round(stallMs / 1000)}s)`)
      break
    }
    if (got >= needed.length) break
    await new Promise((r) => setTimeout(r, 1000))
  }
  // progress + mỗi 25% in ra stdout
  const got = needed.filter((u) => segs.has(u)).length
  if (got !== needed.length) log(`  ! Thiếu ${needed.length - got} segment nhưng file vẫn được ghép`)

  const parts: Buffer[] = []
  if (best.init) {
    const ib = segs.get(best.init)
    if (ib) parts.push(ib)
  }
  let missing = 0
  for (const u of needed) {
    const d = segs.get(u)
    if (!d) {
      missing++
      continue
    }
    parts.push(d)
  }
  if (!parts.length) {
    log('  ! Không có dữ liệu segment nào')
    return false
  }
  try {
    ffmpegConcat(parts, destPath)
  } catch (e: any) {
    log(`  ! ffmpeg: ${String(e).slice(0, 160)}`)
    return false
  }
  return true
}

export { vidUrlJoin }

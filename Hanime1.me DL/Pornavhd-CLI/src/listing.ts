// src/listing.ts — port listing logic từ pornavhd.py (parse_cards/sanitize/crawl URL)
const ARTICLE_RE = /(<article[^>]*class="[^"]*thumb-block[^"]*"[^>]*>.*?<\/article>)/gs
const HREF_RE = /<a[^>]*href="(https:\/\/pornavhd\.com\/[^"]+\/)"[^>]*title="([^"]*)"/
const POSTID_RE = /data-post-id="(\d+)"/
const DUR_RE = /<span class="duration">([^<]*)<\/span>/

export function isCfChallenge(html: string): boolean {
  return html.includes('Just a moment')
}

export interface Vid {
  id: string
  url: string
  title: string
  duration: string
}

export function parseCards(html: string): Vid[] {
  const vids: Vid[] = []
  const seen = new Set<string>()
  for (const body of html.match(ARTICLE_RE) || []) {
    const a = body.match(HREF_RE)
    const pid = body.match(POSTID_RE)
    if (!a || !pid || seen.has(pid[1])) continue
    seen.add(pid[1])
    const dur = body.match(DUR_RE)
    vids.push({
      id: pid[1],
      url: a[1],
      title: a[2].trim() || pid[1],
      duration: dur ? dur[1].trim() : '',
    })
  }
  return vids
}

export function sanitize(name: string): string {
  const s = name.replace(/[\\/:*?"<>|]+/g, '_').replace(/[. ]+$/g, '').replace(/^[ .]+/g, '') // mirror strip(" .")
  return (s || 'video').slice(0, 120)
}

// trang 1 = url gốc; N > 1 = {origin}{path}/page/N/ (query ?s= được giữ lại)
export function buildPageUrl(listUrl: string, page: number): string {
  const u = new URL(listUrl)
  if (page <= 1) return listUrl
  return `${u.origin}${u.pathname.replace(/\/$/, '')}/page/${page}/${u.search}`
}

// Crawl listing (search/actor) qua hàm fetchPage được inject (browser/curl).
// Dừng khi hết card mới hoặc lỗi 404; dedup theo post-id; cap 500 trang.
export async function crawl(
  listUrl: string,
  fetchPage: (url: string) => Promise<string>,
  log: (s: string) => void = () => {},
): Promise<Vid[]> {
  const seen = new Set<string>()
  const out: Vid[] = []
  for (let page = 1; page <= 500; page++) {
    let html: string
    try {
      html = await fetchPage(buildPageUrl(listUrl, page))
    } catch (e: any) {
      if (!String(e).includes('404')) log(`  ! Lỗi trang ${page}: ${String(e).slice(0, 100)}`)
      break
    }
    if (isCfChallenge(html)) {
      log('  ! Cloudflare chặn listing (không lấy được card)')
      break
    }
    const cards = parseCards(html)
    const fresh = cards.filter((v) => !seen.has(v.id))
    if (!fresh.length) break
    for (const v of fresh) seen.add(v.id)
    out.push(...fresh)
    log(`  Trang ${page}: +${fresh.length} video`)
  }
  return out
}

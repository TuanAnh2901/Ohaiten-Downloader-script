// Animehay watch-page parser.
//
// Parses HTML from a /xem-phim/... page and extracts:
//   - page metadata (title, poster, canonical URL)
//   - breadcrumb link to the series info page
//   - inline $info_data { movie_id, id, no_ep }
//   - inline $wp_servers { 'AHS': '...', 'HY': '...' }
//   - active server (.wp-svtab.active button id, defaults to 'AHS')
//   - all episodes from .wp-eplist .wp-ep anchors
//   - the current episode (.wp-ep.current)
//
// In a browser/userscript context this uses the global DOMParser. In a Node
// test context DOMParser is not available as a global, so parseWatchPage
// transparently falls back to a regex-based extraction against the raw HTML.
// Both paths produce the same AnimehayWatchData shape and never throw.

export interface AnimehayEpisode {
    title: string
    url: string
    /** Episode number, taken from data-no="" or the link's text content. */
    no: string
    /** Numeric episode id parsed from id="wp-ep-NNNN". */
    episodeId: number
}

export interface AnimehayWatchData {
    title: string
    poster: string
    canonicalUrl: string
    breadcrumbSeriesUrl: string
    breadcrumbSeriesTitle: string
    movie_id: number
    episode_id: number
    episode_no: string
    serverMap: Record<string, string>
    activeServer: string
    currentEpisode: AnimehayEpisode
    episodes: AnimehayEpisode[]
    warnings: string[]
}

export interface SeriesEpisodeLink {
    title: string
    url: string
    id: number
}

export interface AnimehaySeriesData {
    title: string
    poster: string
    episodeLinks: SeriesEpisodeLink[]
    warnings: string[]
}

const EMPTY_EPISODE: AnimehayEpisode = { title: '', url: '', no: '', episodeId: 0 }

// ─────────────────────────────────────────────────────────────────────────────
// Public entry points
// ─────────────────────────────────────────────────────────────────────────────

export function parseWatchPage(html: string): AnimehayWatchData {
    if (hasDOMParser()) {
        try {
            const doc = new DOMParser().parseFromString(html, 'text/html')
            return parseWatchPageFromDoc(doc)
        } catch {
            // DOM path failed; fall through to regex.
        }
    }
    return parseWatchPageWithRegex(html)
}

export function parseWatchPageFromDoc(doc: Document): AnimehayWatchData {
    const warnings: string[] = []
    const htmlText = doc.documentElement.outerHTML

    const title = collapseSpaces(doc.querySelector('title')?.textContent ?? '')
    if (!title) warnings.push('title missing')

    const poster = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() ?? ''
    if (!poster) warnings.push('poster missing')

    let canonicalUrl = doc.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() ?? ''
    if (!canonicalUrl) {
        const og = doc.querySelector('meta[property="og:url"]')?.getAttribute('content')?.trim() ?? ''
        if (og) canonicalUrl = og
    }
    if (!canonicalUrl) warnings.push('canonicalUrl missing')

    const crumb = doc.querySelector('nav.wp-bc a[href*="/thong-tin-phim/"]')
    const breadcrumbSeriesUrl = crumb?.getAttribute('href')?.trim() ?? ''
    const breadcrumbSeriesTitle = collapseSpaces(crumb?.textContent ?? '')
    if (!breadcrumbSeriesUrl) warnings.push('breadcrumbSeriesUrl missing')
    if (!breadcrumbSeriesTitle) warnings.push('breadcrumbSeriesTitle missing')

    const info = extractInfoData(htmlText)
    if (info.movie_id === 0) warnings.push('movie_id missing')
    if (info.episode_id === 0) warnings.push('episode_id missing')
    if (!info.episode_no) warnings.push('episode_no missing')

    const serverMap = extractServerMap(htmlText)
    if (Object.keys(serverMap).length === 0) warnings.push('serverMap missing')

    const activeServer = detectActiveServer(doc) ?? 'AHS'

    const episodes = collectEpisodesFromDoc(doc)
    if (episodes.length === 0) warnings.push('episodes missing')

    const currentEpisode = readCurrentEpisodeFromDoc(doc)
    if (!currentEpisode.url) warnings.push('currentEpisode missing')

    return {
        title,
        poster,
        canonicalUrl,
        breadcrumbSeriesUrl,
        breadcrumbSeriesTitle,
        movie_id: info.movie_id,
        episode_id: info.episode_id,
        episode_no: info.episode_no,
        serverMap,
        activeServer,
        currentEpisode,
        episodes,
        warnings,
    }
}

export function parseSeriesPage(html: string): AnimehaySeriesData {
    if (hasDOMParser()) {
        try {
            const doc = new DOMParser().parseFromString(html, 'text/html')
            return parseSeriesPageFromDoc(doc)
        } catch {
            // fall through
        }
    }
    return parseSeriesPageWithRegex(html)
}

function parseSeriesPageFromDoc(doc: Document): AnimehaySeriesData {
    const warnings: string[] = []

    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim()
    const titleEl = collapseSpaces(doc.querySelector('title')?.textContent ?? '')
    const title = collapseSpaces(ogTitle || titleEl)
    if (!title) warnings.push('title missing')

    const poster = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() ?? ''
    if (!poster) warnings.push('poster missing')

    const episodeLinks: SeriesEpisodeLink[] = []
    const seen = new Set<number>()
    doc.querySelectorAll('a[href*="/xem-phim/"]').forEach(a => {
        const href = a.getAttribute('href')?.trim() || ''
        const idMatch = href.match(/-(\d+)\.html$/)
        if (!idMatch) return
        const id = parseInt(idMatch[1], 10)
        if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return
        seen.add(id)
        const linkTitle = collapseSpaces(a.textContent ?? '') || a.getAttribute('title')?.trim() || ''
        episodeLinks.push({ title: linkTitle, url: href, id })
    })
    if (episodeLinks.length === 0) warnings.push('episodeLinks missing')

    return { title, poster, episodeLinks, warnings }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM-based extraction helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractInfoData(html: string): { movie_id: number; episode_id: number; episode_no: string } {
    const result = { movie_id: 0, episode_id: 0, episode_no: '' }
    const match = html.match(/var\s+\$info_data\s*=\s*\{([\s\S]*?)\}/)
    if (!match) return result
    const body = match[1]

    const movieIdMatch = body.match(/movie_id\s*:\s*(\d+)/)
    if (movieIdMatch) result.movie_id = parseInt(movieIdMatch[1], 10)

    // The bare `id: N` field. Use a non-greedy boundary so `movie_id:` and
    // other field names containing `id` are not matched.
    const idMatch = body.match(/(?:^|[\s,])id\s*:\s*(\d+)/)
    if (idMatch) result.episode_id = parseInt(idMatch[1], 10)

    const noEpMatch = body.match(/no_ep\s*:\s*['"]([^'"]+)['"]/)
    if (noEpMatch) result.episode_no = noEpMatch[1]

    return result
}

function extractServerMap(html: string): Record<string, string> {
    const map: Record<string, string> = {}
    const match = html.match(/var\s+\$wp_servers\s*=\s*\{([\s\S]*?)\}/)
    if (!match) return map
    const body = match[1]
    const entryRegex = /['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g
    let m: RegExpExecArray | null
    while ((m = entryRegex.exec(body)) !== null) {
        map[m[1]] = m[2]
    }
    return map
}

function detectActiveServer(doc: Document): string | null {
    const tab = doc.querySelector('.wp-svtab.active')
    if (!tab) return null
    const idAttr = tab.id || ''
    if (idAttr.startsWith('wp-sv-')) return idAttr.slice('wp-sv-'.length)
    const onclick = tab.getAttribute('onclick') || ''
    const ocMatch = onclick.match(/wpSrv\(['"]([^'"]+)['"]\)/)
    return ocMatch ? ocMatch[1] : null
}

function readEpisodeFromElement(ep: Element): AnimehayEpisode | null {
    const url = ep.getAttribute('href')?.trim() || ''
    if (!url) return null
    const no = ep.getAttribute('data-no')?.trim() || collapseSpaces(ep.textContent ?? '')
    const idMatch = (ep.id || '').match(/^wp-ep-(\d+)$/)
    const episodeId = idMatch ? parseInt(idMatch[1], 10) : 0
    const titleAttr = ep.getAttribute('title')?.trim() || (no ? `Tập ${no}` : '')
    return { title: titleAttr, url, no, episodeId }
}

function collectEpisodesFromDoc(doc: Document): AnimehayEpisode[] {
    const out: AnimehayEpisode[] = []
    const seen = new Set<string>()
    doc.querySelectorAll('.wp-eplist .wp-ep').forEach(ep => {
        const item = readEpisodeFromElement(ep)
        if (!item || seen.has(item.url)) return
        seen.add(item.url)
        out.push(item)
    })
    return out
}

function readCurrentEpisodeFromDoc(doc: Document): AnimehayEpisode {
    const current = doc.querySelector('.wp-ep.current')
    if (!current) return { ...EMPTY_EPISODE }
    return readEpisodeFromElement(current) ?? { ...EMPTY_EPISODE }
}

// ─────────────────────────────────────────────────────────────────────────────
// Regex fallback (Node test context where DOMParser is not a global)
// ─────────────────────────────────────────────────────────────────────────────

function parseWatchPageWithRegex(html: string): AnimehayWatchData {
    const warnings: string[] = []

    // Title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? collapseSpaces(titleMatch[1]) : ''
    if (!title) warnings.push('title missing')

    // Poster
    let poster = ''
    const ogImgTag = html.match(/<meta\b[^>]*property=["']og:image["'][^>]*>/i)
    if (ogImgTag) {
        const contentMatch = ogImgTag[0].match(/content=["']([^"']+)["']/i)
        if (contentMatch) poster = contentMatch[1].trim()
    }
    if (!poster) warnings.push('poster missing')

    // Canonical URL
    let canonicalUrl = ''
    const canonicalTag = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)
    if (canonicalTag) {
        const hrefMatch = canonicalTag[0].match(/href=["']([^"']+)["']/i)
        if (hrefMatch) canonicalUrl = hrefMatch[1].trim()
    }
    if (!canonicalUrl) {
        const ogUrlTag = html.match(/<meta\b[^>]*property=["']og:url["'][^>]*>/i)
        if (ogUrlTag) {
            const contentMatch = ogUrlTag[0].match(/content=["']([^"']+)["']/i)
            if (contentMatch) canonicalUrl = contentMatch[1].trim()
        }
    }
    if (!canonicalUrl) warnings.push('canonicalUrl missing')

    // Breadcrumb
    let breadcrumbSeriesUrl = ''
    let breadcrumbSeriesTitle = ''
    const navMatch = html.match(/<nav\b[^>]*class=["'][^"']*\bwp-bc\b[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i)
    if (navMatch) {
        const inner = navMatch[1]
        const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
        let am: RegExpExecArray | null
        while ((am = anchorRegex.exec(inner)) !== null) {
            const hrefMatch = am[1].match(/href=["']([^"']+)["']/i)
            if (!hrefMatch) continue
            if (!hrefMatch[1].includes('/thong-tin-phim/')) continue
            breadcrumbSeriesUrl = hrefMatch[1].trim()
            breadcrumbSeriesTitle = stripTags(am[2])
            break
        }
    }
    if (!breadcrumbSeriesUrl) warnings.push('breadcrumbSeriesUrl missing')
    if (!breadcrumbSeriesTitle) warnings.push('breadcrumbSeriesTitle missing')

    // $info_data
    const info = extractInfoData(html)
    if (info.movie_id === 0) warnings.push('movie_id missing')
    if (info.episode_id === 0) warnings.push('episode_id missing')
    if (!info.episode_no) warnings.push('episode_no missing')

    // $wp_servers
    const serverMap = extractServerMap(html)
    if (Object.keys(serverMap).length === 0) warnings.push('serverMap missing')

    // Active server: first <button> with both `wp-svtab` and `active` classes.
    let activeServer = ''
    const buttonRegex = /<button\b[^>]*>/gi
    let bm: RegExpExecArray | null
    while ((bm = buttonRegex.exec(html)) !== null) {
        const tag = bm[0]
        const classMatch = tag.match(/class=["']([^"']+)["']/i)
        if (!classMatch) continue
        if (!/\bwp-svtab\b/.test(classMatch[1]) || !/\bactive\b/.test(classMatch[1])) continue
        const idMatch = tag.match(/id=["']([^"']+)["']/i)
        if (idMatch) {
            const id = idMatch[1]
            if (id.startsWith('wp-sv-')) {
                activeServer = id.slice('wp-sv-'.length)
                break
            }
        }
        const ocMatch = tag.match(/onclick=["'][^"']*wpSrv\(['"]([^'"]+)['"]\)/i)
        if (ocMatch) {
            activeServer = ocMatch[1]
            break
        }
    }
    if (!activeServer) activeServer = 'AHS'

    // Episodes: every <a> with class containing `wp-ep`.
    const episodes: AnimehayEpisode[] = []
    const seenEp = new Set<string>()
    const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
    let am: RegExpExecArray | null
    while ((am = anchorRegex.exec(html)) !== null) {
        const attrs = am[1]
        const classMatch = attrs.match(/class=["']([^"']+)["']/i)
        if (!classMatch || !/\bwp-ep\b/.test(classMatch[1])) continue
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/i)
        if (!hrefMatch) continue
        const url = hrefMatch[1]
        if (seenEp.has(url)) continue
        seenEp.add(url)
        const dataNoMatch = attrs.match(/data-no=["']([^"']+)["']/i)
        const text = stripTags(am[2])
        const no = dataNoMatch ? dataNoMatch[1] : text
        const idMatch = attrs.match(/id=["']wp-ep-(\d+)["']/i)
        const episodeId = idMatch ? parseInt(idMatch[1], 10) : 0
        const titleMatch = attrs.match(/title=["']([^"']+)["']/i)
        const titleAttr = titleMatch ? titleMatch[1] : (no ? `Tập ${no}` : '')
        episodes.push({ title: titleAttr, url, no, episodeId })
    }
    if (episodes.length === 0) warnings.push('episodes missing')

    // Current episode
    let currentEpisode: AnimehayEpisode = { ...EMPTY_EPISODE }
    const currentRegex = /<a\b([^>]*class=["'][^"']*\bwp-ep\b[^"']*\bcurrent\b[^"']*["'][^>]*)>([\s\S]*?)<\/a>/i
    const currentMatch = html.match(currentRegex)
    if (currentMatch) {
        const attrs = currentMatch[1]
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/i)
        const url = hrefMatch ? hrefMatch[1] : ''
        const dataNoMatch = attrs.match(/data-no=["']([^"']+)["']/i)
        const text = stripTags(currentMatch[2])
        const no = dataNoMatch ? dataNoMatch[1] : text
        const idMatch = attrs.match(/id=["']wp-ep-(\d+)["']/i)
        const episodeId = idMatch ? parseInt(idMatch[1], 10) : 0
        const titleMatch = attrs.match(/title=["']([^"']+)["']/i)
        const titleAttr = titleMatch ? titleMatch[1] : (no ? `Tập ${no}` : '')
        currentEpisode = { title: titleAttr, url, no, episodeId }
    } else {
        warnings.push('currentEpisode missing')
    }

    return {
        title,
        poster,
        canonicalUrl,
        breadcrumbSeriesUrl,
        breadcrumbSeriesTitle,
        movie_id: info.movie_id,
        episode_id: info.episode_id,
        episode_no: info.episode_no,
        serverMap,
        activeServer,
        currentEpisode,
        episodes,
        warnings,
    }
}

function parseSeriesPageWithRegex(html: string): AnimehaySeriesData {
    const warnings: string[] = []

    let title = ''
    const ogTitleTag = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*>/i)
    if (ogTitleTag) {
        const contentMatch = ogTitleTag[0].match(/content=["']([^"']+)["']/i)
        if (contentMatch) title = contentMatch[1].trim()
    }
    if (!title) {
        const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
        if (titleTag) title = collapseSpaces(titleTag[1])
    }
    if (!title) warnings.push('title missing')

    let poster = ''
    const ogImgTag = html.match(/<meta\b[^>]*property=["']og:image["'][^>]*>/i)
    if (ogImgTag) {
        const contentMatch = ogImgTag[0].match(/content=["']([^"']+)["']/i)
        if (contentMatch) poster = contentMatch[1].trim()
    }
    if (!poster) warnings.push('poster missing')

    const episodeLinks: SeriesEpisodeLink[] = []
    const seenIds = new Set<number>()
    const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
    let am: RegExpExecArray | null
    while ((am = anchorRegex.exec(html)) !== null) {
        const attrs = am[1]
        const hrefMatch = attrs.match(/href=["']([^"']+)["']/i)
        if (!hrefMatch) continue
        if (!hrefMatch[1].includes('/xem-phim/')) continue
        const idMatch = hrefMatch[1].match(/-(\d+)\.html$/)
        if (!idMatch) continue
        const id = parseInt(idMatch[1], 10)
        if (!Number.isFinite(id) || id <= 0 || seenIds.has(id)) continue
        seenIds.add(id)
        const text = stripTags(am[2])
        const titleAttr = attrs.match(/title=["']([^"']+)["']/i)
        const linkTitle = text || (titleAttr ? titleAttr[1] : '')
        episodeLinks.push({ title: linkTitle, url: hrefMatch[1], id })
    }
    if (episodeLinks.length === 0) warnings.push('episodeLinks missing')

    return { title, poster, episodeLinks, warnings }
}

// ─────────────────────────────────────────────────────────────────────────────
// Small string utilities
// ─────────────────────────────────────────────────────────────────────────────

function hasDOMParser(): boolean {
    try {
        return typeof (globalThis as { DOMParser?: unknown }).DOMParser !== 'undefined'
    } catch {
        return false
    }
}

function collapseSpaces(s: string): string {
    return s.replace(/\s+/g, ' ').trim()
}

function stripTags(s: string): string {
    return collapseSpaces(s.replace(/<[^>]+>/g, ''))
}

// Animehay series/info-page resolver and episode collection.
//
// Public surface:
//   - collectEpisodes(watchHtmlOrUrl):  for a watch-page HTML blob OR a watch-
//     page URL, return the list of AnimehayEpisode entries that the watch
//     page itself exposes via `.wp-eplist .wp-ep`.
//   - collectSeriesEpisodes(infoPageUrl):  for a /thong-tin-phim/ info page
//     URL, fetch it live and try three strategies in order to enumerate the
//     full episode list:
//       1. Current/v3 selectors — `.wp-eplist .wp-ep`
//       2. Legacy selectors     — `.info-movie .list_episode .list-item-episode a`
//       3. Fallback             — follow the first `a[href*="/xem-phim/"]`
//                                  link on the info page to a watch page and
//                                  parse `.wp-ep` from that.
//   - deduplicateEpisodes():  drop episodes that share a URL with an earlier
//     entry (first-seen wins).
//   - sortEpisodesByNumber():  ascending by the numeric `no` field, items
//     without a parseable number are pushed to the end.
//
// Environment handling mirrors parser.ts / domain.ts:
//   - Userscript:  GM_xmlhttpRequest with a Referer to the active Animehay
//                  mirror (resolved via getActiveReferer()).
//   - Node tests:  globalThis.fetch with a Referer derived from the target
//                  URL's origin.
//
// Errors are surfaced as `CrawlerError` instances with a `code` field so
// callers can branch on the failure mode (http_error, fetch_failed,
// unrecognized_structure). The crawler NEVER downloads video bytes — it only
// collects episode metadata for the rest of the pipeline.

import { AnimehayEpisode, parseWatchPage } from './parser'
import { getCachedDomains } from './domain'

// ─────────────────────────────────────────────────────────────────────────────
// Typed errors
// ─────────────────────────────────────────────────────────────────────────────

export type CrawlerErrorCode =
    | 'http_error'
    | 'fetch_failed'
    | 'unrecognized_structure'
    | 'invalid_argument'

export class CrawlerError extends Error {
    public readonly code: CrawlerErrorCode
    public readonly status?: number
    public readonly url?: string

    constructor(message: string, code: CrawlerErrorCode, opts?: { status?: number; url?: string }) {
        super(message)
        this.name = 'CrawlerError'
        this.code = code
        if (opts?.status !== undefined) this.status = opts.status
        if (opts?.url !== undefined) this.url = opts.url
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the episode list for a watch page. The argument can be:
 *   - raw HTML of a `/xem-phim/...` page, or
 *   - an absolute (or protocol-relative) URL to such a page.
 *
 * HTML detection is intentionally cheap: if the trimmed input starts with `<`
 * we treat it as HTML. Anything else is treated as a URL and fetched.
 *
 * The function reuses `parseWatchPage` from parser.ts so the extraction logic
 * stays in lockstep with the watch-page parser (and the same DOMParser vs.
 * regex fallback applies).
 */
export async function collectEpisodes(watchHtmlOrUrl: string): Promise<AnimehayEpisode[]> {
    if (!watchHtmlOrUrl || !watchHtmlOrUrl.trim()) {
        throw new CrawlerError('collectEpisodes: empty input', 'invalid_argument')
    }
    const input = watchHtmlOrUrl.trim()
    const html = looksLikeHtml(input)
        ? input
        : (await fetchPage(toAbsoluteUrl(input))).body
    return parseWatchPage(html).episodes
}

/**
 * Resolve the full episode list for a series given its info-page URL
 * (`/thong-tin-phim/{slug}-{movie_id}.html`).
 *
 * Tries three strategies in order and returns the first non-empty result.
 * The matched strategy is logged via console for debugging.
 *
 * Throws a `CrawlerError` with code `unrecognized_structure` when all three
 * strategies yield zero episodes, and `http_error` / `fetch_failed` if the
 * initial GET itself fails.
 */
export async function collectSeriesEpisodes(infoPageUrl: string): Promise<AnimehayEpisode[]> {
    if (!infoPageUrl || !infoPageUrl.trim()) {
        throw new CrawlerError('collectSeriesEpisodes: empty infoPageUrl', 'invalid_argument')
    }
    const targetUrl = toAbsoluteUrl(infoPageUrl.trim())

    let infoHtml: string
    let finalUrl: string
    try {
        const resp = await fetchPage(targetUrl)
        infoHtml = resp.body
        finalUrl = resp.finalUrl
    } catch (err) {
        if (err instanceof CrawlerError) throw err
        throw new CrawlerError(
            `collectSeriesEpisodes: failed to fetch info page: ${(err as Error).message}`,
            'fetch_failed',
            { url: targetUrl },
        )
    }

    // Strategy 1 — current/v3 selectors. The info page renders the same
    // `.wp-eplist__grid` of `.wp-ep` anchors that the watch page does, so we
    // can reuse the watch-page parser here (missing `$info_data` / `$wp_servers`
    // only generate warnings, not a failure).
    const s1 = parseWatchPage(infoHtml).episodes
    if (s1.length > 0) {
        logStrategy('1', '.wp-eplist .wp-ep', s1.length, finalUrl)
        return s1
    }

    // Strategy 2 — legacy `.info-movie .list_episode .list-item-episode a`
    // structure. Older Animehay templates ship a flat list of episode links
    // without the wp-ep class, so the watch-page parser picks up nothing.
    const s2 = parseLegacyInfoPageEpisodes(infoHtml)
    if (s2.length > 0) {
        logStrategy('2', '.info-movie .list_episode .list-item-episode a', s2.length, finalUrl)
        return s2
    }

    // Strategy 3 — follow the first `/xem-phim/` link we can find on the info
    // page. The watch page that link lands on has a complete `.wp-eplist` grid.
    const firstWatch = findFirstWatchLink(infoHtml, finalUrl)
    if (firstWatch) {
        try {
            const watchResp = await fetchPage(firstWatch)
            const s3 = parseWatchPage(watchResp.body).episodes
            if (s3.length > 0) {
                logStrategy('3', `followed first /xem-phim/ link (${firstWatch})`, s3.length, watchResp.finalUrl)
                return s3
            }
        } catch (err) {
            // Surface follow-up errors only as warnings; the next cascade
            // branch is the unified "all strategies failed" throw below.
            // eslint-disable-next-line no-console
            console.warn(`[AnimehayDL] collectSeriesEpisodes: strategy-3 follow-up fetch failed: ${(err as Error).message}`)
        }
    }

    throw new CrawlerError(
        'collectSeriesEpisodes: all 3 strategies failed to find episodes on info page',
        'unrecognized_structure',
        { url: finalUrl },
    )
}

/**
 * Return a copy of `episodes` with the first occurrence of each unique URL
 * preserved. Episodes with an empty URL are dropped.
 */
export function deduplicateEpisodes(episodes: AnimehayEpisode[]): AnimehayEpisode[] {
    const seen = new Set<string>()
    const out: AnimehayEpisode[] = []
    for (const ep of episodes) {
        if (!ep || !ep.url) continue
        if (seen.has(ep.url)) continue
        seen.add(ep.url)
        out.push(ep)
    }
    return out
}

/**
 * Return a copy of `episodes` sorted ascending by the numeric value of
 * `ep.no`. Episodes with a non-numeric `no` (e.g. OVA / specials labelled
 * "0" or "") are pushed to the end in their original order.
 */
export function sortEpisodesByNumber(episodes: AnimehayEpisode[]): AnimehayEpisode[] {
    const indexed = episodes.map((ep, originalIndex) => ({ ep, originalIndex }))
    indexed.sort((a, b) => {
        const na = parseEpisodeNo(a.ep.no)
        const nb = parseEpisodeNo(b.ep.no)
        if (na === nb) return a.originalIndex - b.originalIndex
        // Items that failed to parse sort to the end.
        if (na === null) return 1
        if (nb === null) return -1
        return na - nb
    })
    return indexed.map(item => item.ep)
}

// ─────────────────────────────────────────────────────────────────────────────
// Page fetcher (userscript GM_xmlhttpRequest + Node fetch fallback)
// ─────────────────────────────────────────────────────────────────────────────

interface FetchResult {
    status: number
    finalUrl: string
    body: string
}

type Requester = (url: string, opts?: { referer?: string; timeoutMs?: number }) => Promise<FetchResult>
let testRequester: Requester | null = null

/** Test hook — override the page fetcher. Pass null to restore auto-detection. */
export function __setRequesterForTesting(fn: Requester | null): void {
    testRequester = fn
}

async function fetchPage(url: string): Promise<FetchResult> {
    const result = await fetchPageRaw(url)
    // Uniform HTTP status guard — applies to GM_xmlhttpRequest, fetch, AND
    // the test-injected requester. Without this, a 4xx/5xx would slip into
    // the parser and surface as `unrecognized_structure` instead of the
    // correctly-typed `http_error`.
    if (result.status < 200 || result.status >= 300) {
        throw new CrawlerError(
            `HTTP ${result.status} fetching ${url}`,
            'http_error',
            { status: result.status, url: result.finalUrl },
        )
    }
    return result
}

async function fetchPageRaw(url: string): Promise<FetchResult> {
    if (testRequester) {
        return testRequester(url, { referer: pickReferer(url) })
    }
    const gmRequest = (globalThis as { GM_xmlhttpRequest?: unknown }).GM_xmlhttpRequest
    if (typeof gmRequest === 'function') {
        return fetchViaGM(url, pickReferer(url), gmRequest as GMRequestFn)
    }
    return fetchViaFetch(url, pickReferer(url))
}

function pickReferer(url: string): string {
    // The "active referer" is the cached primary mirror (or current page
    // origin). For relative cross-mirror paths we also fall back to the URL's
    // own origin so the request still has a same-site Referer header.
    const active = safeGetActiveReferer()
    if (active) return active
    try {
        const u = new URL(url)
        return u.origin + '/'
    } catch {
        return 'https://animehay.tv/'
    }
}

function safeGetActiveReferer(): string {
    try {
        const cached = getCachedDomains()
        if (cached?.primary) return cached.primary
        if (cached?.secondary) return cached.secondary
    } catch {
        // Cache read can fail if GM_getValue throws; fall through.
    }
    // If the page is currently on an Animehay mirror, advertise that host.
    try {
        const loc = (globalThis as { location?: { origin?: string; href?: string } }).location
        if (loc) {
            const origin = loc.origin || (loc.href ? new URL(loc.href).origin : '')
            if (origin) return origin
        }
    } catch {
        // ignore
    }
    return ''
}

type GMRequestFn = (opts: {
    method: string
    url: string
    timeout: number
    headers: Record<string, string>
    onload: (resp: GMResponse) => void
    onerror: (err: GMError) => void
    ontimeout: () => void
}) => void

interface GMResponse {
    status: number
    finalUrl?: string
    responseText?: string
}

interface GMError {
    error?: string
}

const FETCH_TIMEOUT_MS = 20_000

function fetchViaGM(url: string, referer: string, gm: GMRequestFn): Promise<FetchResult> {
    return new Promise<FetchResult>((resolve, reject) => {
        let settled = false
        const settle = (fn: () => void): void => {
            if (settled) return
            settled = true
            fn()
        }
        const timer = setTimeout(() => {
            settle(() => reject(new CrawlerError(`timeout fetching ${url}`, 'fetch_failed', { url })))
        }, FETCH_TIMEOUT_MS)
        try {
            gm({
                method: 'GET',
                url,
                timeout: FETCH_TIMEOUT_MS,
                headers: { Referer: referer },
                onload: (resp) => {
                    clearTimeout(timer)
                    settle(() => resolve({
                        status: resp.status,
                        finalUrl: resp.finalUrl ?? url,
                        body: typeof resp.responseText === 'string' ? resp.responseText : '',
                    }))
                },
                onerror: (err) => {
                    clearTimeout(timer)
                    settle(() => reject(new CrawlerError(
                        `network error fetching ${url}: ${err?.error || 'unknown'}`,
                        'fetch_failed',
                        { url },
                    )))
                },
                ontimeout: () => {
                    clearTimeout(timer)
                    settle(() => reject(new CrawlerError(`timeout fetching ${url}`, 'fetch_failed', { url })))
                },
            })
        } catch (err) {
            clearTimeout(timer)
            settle(() => reject(new CrawlerError(
                `GM_xmlhttpRequest threw: ${(err as Error).message}`,
                'fetch_failed',
                { url },
            )))
        }
    })
}

async function fetchViaFetch(url: string, referer: string): Promise<FetchResult> {
    const fetchImpl = (globalThis as { fetch?: typeof fetch }).fetch
    if (typeof fetchImpl !== 'function') {
        throw new CrawlerError('no fetch implementation available', 'fetch_failed', { url })
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    try {
        const resp = await fetchImpl(url, {
            method: 'GET',
            redirect: 'follow',
            headers: { Referer: referer },
            signal: ctrl.signal,
        })
        const body = await resp.text()
        return { status: resp.status, finalUrl: resp.url || url, body }
    } catch (err) {
        throw new CrawlerError(
            `fetch failed for ${url}: ${(err as Error).message}`,
            'fetch_failed',
            { url },
        )
    } finally {
        clearTimeout(timer)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy info-page episode extraction (Strategy 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract AnimehayEpisode entries from a legacy `.info-movie .list_episode
 * .list-item-episode a[href*="/xem-phim/"]` block. Falls back to a regex
 * scan when DOMParser is unavailable (Node test context).
 */
function parseLegacyInfoPageEpisodes(html: string): AnimehayEpisode[] {
    if (hasDOMParser()) {
        try {
            const doc = new DOMParser().parseFromString(html, 'text/html')
            return parseLegacyInfoPageEpisodesFromDoc(doc)
        } catch {
            // fall through
        }
    }
    return parseLegacyInfoPageEpisodesWithRegex(html)
}

function parseLegacyInfoPageEpisodesFromDoc(doc: Document): AnimehayEpisode[] {
    const out: AnimehayEpisode[] = []
    const seen = new Set<string>()
    // Strict to the legacy structure: anchors must be nested inside
    // `.info-movie .list_episode .list-item-episode` and point at /xem-phim/.
    // Deliberately NOT widening to "any /xem-phim/ anchor" — that is the job
    // of Strategy 3 (follow first /xem-phim/ link), and widening here would
    // cause it to swallow the follow link before Strategy 3 ever runs.
    const candidates = doc.querySelectorAll(
        '.info-movie .list_episode .list-item-episode a[href*="/xem-phim/"]',
    )
    candidates.forEach(a => {
        const item = readEpisodeFromAnchor(a)
        if (!item || seen.has(item.url)) return
        seen.add(item.url)
        out.push(item)
    })
    return out
}

function parseLegacyInfoPageEpisodesWithRegex(html: string): AnimehayEpisode[] {
    const out: AnimehayEpisode[] = []
    const seen = new Set<string>()
    // Mirror the strict DOM selector: scan <li class="list-item-episode">
    // blocks (allowing other classes on the same element) and only collect
    // anchors inside them that point at /xem-phim/. Anchors outside such
    // blocks are deliberately ignored — that's Strategy 3's territory.
    const liRegex = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi
    let lm: RegExpExecArray | null
    while ((lm = liRegex.exec(html)) !== null) {
        const liAttrs = lm[1]
        const classMatch = liAttrs.match(/class=["']([^"']+)["']/i)
        if (!classMatch || !/\blist-item-episode\b/.test(classMatch[1])) continue
        const inner = lm[2]
        const anchorRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
        let am: RegExpExecArray | null
        while ((am = anchorRegex.exec(inner)) !== null) {
            const attrs = am[1]
            const hrefMatch = attrs.match(/href=["']([^"']+)["']/i)
            if (!hrefMatch) continue
            const href = hrefMatch[1]
            if (!/\/xem-phim\//.test(href)) continue
            if (seen.has(href)) continue
            const dataNoMatch = attrs.match(/data-no=["']([^"']+)["']/i)
            const text = stripTags(am[2])
            const no = dataNoMatch ? dataNoMatch[1] : text
            const idFromAttr = attrs.match(/id=["']wp-ep-(\d+)["']/i)
            const idFromUrl = href.match(/-(\d+)\.html$/)
            const episodeId = idFromAttr
                ? parseInt(idFromAttr[1], 10)
                : (idFromUrl ? parseInt(idFromUrl[1], 10) : 0)
            const titleMatch = attrs.match(/title=["']([^"']+)["']/i)
            const titleAttr = titleMatch ? titleMatch[1] : (no ? `Tập ${no}` : '')
            seen.add(href)
            out.push({ title: titleAttr, url: href, no, episodeId })
        }
    }
    return out
}

function readEpisodeFromAnchor(a: Element): AnimehayEpisode | null {
    const url = a.getAttribute('href')?.trim() || ''
    if (!url) return null
    if (!url.includes('/xem-phim/')) return null
    const no = a.getAttribute('data-no')?.trim() || collapseSpaces(a.textContent ?? '')
    const idFromAttr = (a.id || '').match(/^wp-ep-(\d+)$/)
    const idFromUrl = url.match(/-(\d+)\.html$/)
    const episodeId = idFromAttr
        ? parseInt(idFromAttr[1], 10)
        : (idFromUrl ? parseInt(idFromUrl[1], 10) : 0)
    const titleAttr = a.getAttribute('title')?.trim() || (no ? `Tập ${no}` : '')
    return { title: titleAttr, url, no, episodeId }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** First `a[href*="/xem-phim/"]` link found in the info page, resolved
 *  against the page's final URL so the returned URL is always absolute. */
function findFirstWatchLink(html: string, baseUrl: string): string | null {
    const resolve = (raw: string): string | null => {
        if (!raw) return null
        try {
            return new URL(raw, baseUrl).toString()
        } catch {
            return null
        }
    }

    if (hasDOMParser()) {
        try {
            const doc = new DOMParser().parseFromString(html, 'text/html')
            const a = doc.querySelector('a[href*="/xem-phim/"]')
            const href = a?.getAttribute('href')?.trim() ?? ''
            return resolve(href)
        } catch {
            // fall through
        }
    }

    const anchorRegex = /<a\b([^>]*)>/gi
    let am: RegExpExecArray | null
    while ((am = anchorRegex.exec(html)) !== null) {
        const hrefMatch = am[1].match(/href=["']([^"']+)["']/i)
        if (!hrefMatch) continue
        if (!/\/xem-phim\//.test(hrefMatch[1])) continue
        return resolve(hrefMatch[1])
    }
    return null
}

function looksLikeHtml(s: string): boolean {
    const t = s.trim()
    if (!t) return false
    return t.charCodeAt(0) === 60 /* '<' */
}

function toAbsoluteUrl(url: string): string {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    if (trimmed.startsWith('//')) {
        try {
            const loc = (globalThis as { location?: { protocol?: string } }).location
            const scheme = loc?.protocol && /^https:$/i.test(loc.protocol) ? 'https:' : 'http:'
            return scheme + trimmed
        } catch {
            return 'https:' + trimmed
        }
    }
    // Path-relative — resolve against the current page origin, the cached
    // primary mirror, or the trusted source as a last resort.
    const base = currentOriginOrMirror() || 'https://animehay.tv/'
    try {
        return new URL(trimmed, base).toString()
    } catch {
        return trimmed
    }
}

function currentOriginOrMirror(): string | null {
    try {
        const loc = (globalThis as { location?: { origin?: string; href?: string } }).location
        if (loc) {
            if (loc.origin) return loc.origin
            if (loc.href) return new URL(loc.href).origin
        }
    } catch {
        // ignore
    }
    return safeGetActiveReferer() || null
}

function logStrategy(idx: string, detail: string, count: number, url: string): void {
    // eslint-disable-next-line no-console
    console.log(`[AnimehayDL] collectSeriesEpisodes: strategy ${idx} matched (${count} episodes) — ${detail} [${url}]`)
}

function parseEpisodeNo(no: string | undefined | null): number | null {
    if (!no) return null
    const n = Number.parseFloat(no)
    if (!Number.isFinite(n)) return null
    return n
}

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

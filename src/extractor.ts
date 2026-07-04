// Animehay iframe stream extractor.
//
// Two extraction strategies are exported:
//
// 1. staticExtract(iframeHtml, serverName, sourceUrl)
//    Pure, deterministic, no network. Parses the HTML of a single embed
//    iframe (AHS / HY / ...) for direct media URLs. Handles:
//      - JWPlayer setup: file / sources
//      - <video src="..."> and <source src="..." type="...">
//      - Direct .mp4 / .m3u8 references
//      - Escaped unicode / hex URL forms
//    All URLs pass through filterAdUrls so the static path never returns
//    an ad/popunder/banner URL.
//
// 2. networkExtract(sourceUrl, referer)
//    Browser/CDP-compatible fallback. Captures request + response URLs and
//    content-types for .mp4 / .m3u8, optionally clicks common play
//    controls, and reads `<video>.currentSrc`. Designed to plug into
//    either a userscript running in a real browser tab or a Playwright/CDP
//    context that supplies the optional captureContext hook.
//
// Helpers:
//   - buildStreamUrl(preferred, servers): pick the embed URL for the
//     preferred server or fall back to the first available server.
//   - filterAdUrls(urls): remove ad hosts, popunder patterns, and
//     non-media extensions from a raw URL list.

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface StreamResult {
    url: string
    source: string
    quality?: string
    iframeUrl?: string
    contentType?: string
}

export interface NetworkStreamResult {
    streams: StreamResult[]
    warnings: string[]
    timedOut: boolean
    blocked: boolean
    blockedDetail?: string
}

/**
 * Optional injection point for networkExtract. When provided, the function
 * uses these hooks instead of monkey-patching the current window so the
 * same implementation can drive a Playwright/Chromium CDP session.
 */
export interface NetworkCaptureContext {
    /** Install a listener that observes request URLs. */
    onRequest?: (url: string) => void
    /** Install a listener that observes response URLs and content-types. */
    onResponse?: (url: string, contentType: string) => void
    /** Optional helper to fetch the source URL and return the response text. */
    fetchSource?: (url: string, referer: string) => Promise<{ ok: boolean; status: number; text: string } | null>
    /** Open the source URL in a hidden context so the page can run JS. */
    openContext?: (url: string, referer: string) => Promise<{
        queryVideoCurrentSrc: () => Promise<string | null>
        clickPlayControls: () => Promise<boolean>
        destroy: () => void
    } | null>
    /** Override default timeout in ms. */
    timeoutMs?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// staticExtract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse iframe HTML for direct media URLs.
 *
 *   iframeHtml   raw HTML body of the embed page
 *   serverName   key into $wp_servers (e.g. 'AHS', 'HY') — used as the
 *                `source` label on each result
 *   sourceUrl    the iframe URL — echoed back as `iframeUrl` on each result
 */
export function staticExtract(
    iframeHtml: string,
    serverName: string,
    sourceUrl: string,
): StreamResult[] {
    if (!iframeHtml) return []

    const collected: StreamResult[] = []
    const indexByUrl = new Map<string, number>()

    function push(url: string, quality?: string, contentType?: string): void {
        if (!url) return
        const clean = unescapeUrl(url)
        if (!clean) return
        const existingIdx = indexByUrl.get(clean)
        if (existingIdx !== undefined) {
            // Upsert: keep the first non-empty quality / contentType so a
            // later, more specific pattern (e.g. JWPlayer `sources: [{file,
            // label}]`) wins over a bare .mp4 regex match.
            const cur = collected[existingIdx]
            if (!cur.quality && quality) cur.quality = quality
            if (!cur.contentType && contentType) cur.contentType = contentType
            return
        }
        indexByUrl.set(clean, collected.length)
        collected.push({
            url: clean,
            source: serverName,
            quality,
            iframeUrl: sourceUrl,
            contentType,
        })
    }

    // 1) DOM path: handles <video src>, <source src type=...> precisely.
    if (hasDOMParser()) {
        try {
            const doc = new DOMParser().parseFromString(iframeHtml, 'text/html')
            collectFromDom(doc, push)
        } catch {
            // fall through to regex
        }
    }

    // 2) Regex path: catches JWPlayer setup blocks, sources arrays, escaped
    //    urls, and other patterns a DOM-only parse misses.
    collectFromScripts(iframeHtml, push)

    // 3) Apply ad / non-media filter as the last gate.
    return filterStreamResults(collected)
}

function collectFromDom(doc: Document, push: (url: string, quality?: string, contentType?: string) => void): void {
    doc.querySelectorAll('video').forEach(v => {
        const src = v.getAttribute('src') || v.getAttribute('data-src')
        if (src) {
            push(src, v.getAttribute('data-quality') || v.getAttribute('label') || undefined, 'video/mp4')
        }
        v.querySelectorAll('source').forEach(s => {
            const sSrc = s.getAttribute('src')
            if (sSrc) {
                push(
                    sSrc,
                    s.getAttribute('label') || s.getAttribute('data-quality') || s.getAttribute('res') || undefined,
                    s.getAttribute('type') || undefined,
                )
            }
        })
    })

    doc.querySelectorAll('source').forEach(s => {
        const sSrc = s.getAttribute('src')
        if (sSrc) {
            push(
                sSrc,
                s.getAttribute('label') || s.getAttribute('data-quality') || s.getAttribute('res') || undefined,
                s.getAttribute('type') || undefined,
            )
        }
    })

    // jwplayer().setup({ ... }) tends to inline its options as JSON inside a
    // script tag. Pull the JSON object out and walk it.
    doc.querySelectorAll('script').forEach(script => {
        const text = script.textContent || ''
        if (!text.includes('jwplayer') && !text.includes('"file"') && !text.includes("'file'")) return
        parseJwPlayerJson(text, push)
    })
}

function collectFromScripts(html: string, push: (url: string, quality?: string, contentType?: string) => void): void {
    // Extract every <script> block and run file-URL patterns against each.
    // Even when DOMParser is available, the script text is more reliable for
    // JWPlayer than the DOM walk.
    const scriptBlocks: string[] = []
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
    let m: RegExpExecArray | null
    while ((m = scriptRegex.exec(html)) !== null) {
        scriptBlocks.push(m[1])
    }
    // Also run the patterns over the full HTML so inline event handlers
    // (onclick, onerror) and JSON-like blocks outside <script> still match.
    scriptBlocks.push(html)

    for (const block of scriptBlocks) {
        extractFileUrls(block, push)
    }

    // <video> / <source> tags outside of script tags (redundant with DOM
    // path, but useful in the no-DOMParser Node test context).
    const videoTagRegex = /<video\b([^>]*)>/gi
    let v: RegExpExecArray | null
    while ((v = videoTagRegex.exec(html)) !== null) {
        const attrs = v[1]
        const srcMatch = attrs.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)
        if (srcMatch) {
            push(srcMatch[1] || srcMatch[2] || srcMatch[3] || '', undefined, 'video/mp4')
        }
    }
    const sourceTagRegex = /<source\b([^>]*)\/?>/gi
    let s: RegExpExecArray | null
    while ((s = sourceTagRegex.exec(html)) !== null) {
        const attrs = s[1]
        const srcMatch = attrs.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)
        if (!srcMatch) continue
        const src = srcMatch[1] || srcMatch[2] || srcMatch[3] || ''
        const typeMatch = attrs.match(/\btype\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)
        const type = typeMatch ? (typeMatch[1] || typeMatch[2] || typeMatch[3]) : undefined
        const labelMatch = attrs.match(/\b(?:label|quality|res)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)
        const label = labelMatch ? (labelMatch[1] || labelMatch[2] || labelMatch[3]) : undefined
        push(src, label, type)
    }
}

function extractFileUrls(
    text: string,
    push: (url: string, quality?: string, contentType?: string) => void,
): void {
    if (!text) return
    if (
        !text.includes('file') &&
        !text.includes('sources') &&
        !text.includes('.mp4') &&
        !text.includes('.m3u8')
    ) {
        return
    }

    // Direct .mp4 / .m3u8 references in any field position. Anchored on the
    // URL itself so we don't pick up `jwplayer.key` strings.
    const directUrlRegex = /https?:\/\/[^"'<>\s)]+?\.(?:mp4|m3u8)(?:\?[^"'<>\s)]*)?/gi
    let dm: RegExpExecArray | null
    while ((dm = directUrlRegex.exec(text)) !== null) {
        const url = stripTrailingPunct(dm[0])
        const ct = url.toLowerCase().includes('.m3u8')
            ? 'application/vnd.apple.mpegurl'
            : 'video/mp4'
        push(url, undefined, ct)
    }

    // JWPlayer `file: "..."` / `'file':'...'` / `"file":"..."`.
    const fileFieldRegexes: RegExp[] = [
        /['"]file['"]\s*:\s*['"]([^'"]+)['"]/g,
        /\bfile\s*:\s*['"]([^'"]+)['"]/g,
    ]
    for (const re of fileFieldRegexes) {
        let m: RegExpExecArray | null
        while ((m = re.exec(text)) !== null) {
            const url = m[1]
            if (!isLikelyMediaUrl(url)) continue
            const ct = url.toLowerCase().includes('.m3u8')
                ? 'application/vnd.apple.mpegurl'
                : 'video/mp4'
            push(url, undefined, ct)
        }
    }

    // JWPlayer `sources: [{ file: "...", label: "..." }]`.
    parseJwPlayerSourcesArray(text, push)
}

function parseJwPlayerSourcesArray(
    text: string,
    push: (url: string, quality?: string, contentType?: string) => void,
): void {
    const sourcesRegex = /sources\s*:\s*\[([\s\S]*?)\]/g
    let sm: RegExpExecArray | null
    while ((sm = sourcesRegex.exec(text)) !== null) {
        const body = sm[1]
        // Each object: { file: "...", label: "...", type: "...", default: true }
        const objRegex = /\{([^{}]*)\}/g
        let om: RegExpExecArray | null
        while ((om = objRegex.exec(body)) !== null) {
            const inner = om[1]
            const fileMatch = inner.match(/['"]?file['"]?\s*:\s*['"]([^'"]+)['"]/)
            if (!fileMatch) continue
            const url = fileMatch[1]
            if (!isLikelyMediaUrl(url)) continue
            const labelMatch = inner.match(/['"]?label['"]?\s*:\s*['"]([^'"]+)['"]/)
            const label = labelMatch ? labelMatch[1] : undefined
            const typeMatch = inner.match(/['"]?type['"]?\s*:\s*['"]([^'"]+)['"]/)
            const type = typeMatch ? typeMatch[1] : undefined
            push(url, label, type)
        }
    }
}

function parseJwPlayerJson(
    text: string,
    push: (url: string, quality?: string, contentType?: string) => void,
): void {
    // Best-effort: extract the first balanced {...} that contains a
    // `"file"` or `"sources"` key. We do not run a real JS parser here
    // because the surrounding text often contains `jwplayer("…").setup(...)`
    // which is not JSON.
    const setupMatch = text.match(/\.setup\s*\(\s*(\{[\s\S]*?\})\s*\)/)
    if (setupMatch) {
        extractFileUrls(setupMatch[1], push)
        return
    }
    extractFileUrls(text, push)
}

function isLikelyMediaUrl(url: string): boolean {
    if (!url) return false
    const lower = url.toLowerCase()
    return lower.includes('.mp4') || lower.includes('.m3u8')
}

function stripTrailingPunct(s: string): string {
    return s.replace(/[)\].,;]+$/g, '')
}

function unescapeUrl(url: string): string {
    // Resolve JSON-style unicode escapes (`\u0026` etc.) and HTML entities
    // (`&amp;` etc.) so the downstream code sees a real URL.
    if (!url) return url
    let out = url
    try {
        out = out.replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex: string) => {
            return String.fromCharCode(parseInt(hex, 16))
        })
        out = out.replace(/\\x([0-9a-fA-F]{2})/g, (_m, hex: string) => {
            return String.fromCharCode(parseInt(hex, 16))
        })
    } catch {
        // keep original
    }
    out = decodeHtmlEntities(out)
    return out
}

function decodeHtmlEntities(s: string): string {
    return s
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
}

// ─────────────────────────────────────────────────────────────────────────────
// networkExtract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Browser/CDP-compatible network fallback.
 *
 * Captures request/response URLs that look like .mp4 / .m3u8, optionally
 * clicks play controls, and reads `<video>.currentSrc`. The default
 * implementation runs in the current page using:
 *
 *   - a fetch + XHR monkey-patch (only active for the duration of the call)
 *   - performance.getEntriesByType('resource') for already-completed entries
 *   - a temporary hidden iframe to load the source URL and read video state
 *
 * When called with a `captureContext` (e.g. from a Playwright bridge), the
 * injected hooks are used directly and no monkey-patching happens.
 */
export async function networkExtract(
    sourceUrl: string,
    referer: string,
    captureContext?: NetworkCaptureContext,
): Promise<NetworkStreamResult> {
    const warnings: string[] = []
    const streams: StreamResult[] = []
    const seen = new Set<string>()
    const timeoutMs = captureContext?.timeoutMs ?? 15000
    const kindFrom = (url: string): 'mp4' | 'm3u8' | null => {
        const lower = url.toLowerCase()
        if (lower.endsWith('.mp4') || lower.includes('.mp4?') || lower.includes('.mp4#')) return 'mp4'
        if (lower.endsWith('.m3u8') || lower.includes('.m3u8?') || lower.includes('.m3u8#')) return 'm3u8'
        return null
    }
    const record = (url: string, contentType?: string): void => {
        if (!url) return
        const kind = kindFrom(url) || (contentType && contentType.toLowerCase().includes('mpegurl')
            ? 'm3u8'
            : contentType && contentType.toLowerCase().includes('mp4')
                ? 'mp4'
                : null)
        if (!kind) return
        if (seen.has(url)) return
        seen.add(url)
        streams.push({
            url,
            source: 'network',
            iframeUrl: sourceUrl,
            contentType: contentType || (kind === 'm3u8' ? 'application/vnd.apple.mpegurl' : 'video/mp4'),
        })
    }

    // 1) Pull any already-known resources from the performance timeline.
    try {
        const perf = (globalThis as { performance?: Performance }).performance
        if (perf && typeof perf.getEntriesByType === 'function') {
            const entries = perf.getEntriesByType('resource') as PerformanceResourceTiming[]
            for (const e of entries) {
                record(e.name, undefined)
            }
        }
    } catch {
        warnings.push('performance.getEntriesByType failed')
    }

    // 2) Install short-lived fetch + XHR hooks unless an external context
    //    is providing its own listeners.
    const cleanupFns: Array<() => void> = []
    if (!captureContext?.onRequest && !captureContext?.onResponse && hasFetchAndXHR()) {
        const originalFetch = globalThis.fetch
        const fetchHook: typeof globalThis.fetch = function (input, init) {
            try {
                const url = typeof input === 'string'
                    ? input
                    : input instanceof URL
                        ? input.toString()
                        : (input as Request).url
                record(url, undefined)
            } catch {
                // ignore
            }
            return originalFetch.call(this, input as RequestInfo, init)
        } as typeof globalThis.fetch
        globalThis.fetch = fetchHook
        cleanupFns.push(() => {
            globalThis.fetch = originalFetch
        })

        const XHR = (globalThis as { XMLHttpRequest?: typeof XMLHttpRequest }).XMLHttpRequest
        if (XHR) {
            const origOpen = XHR.prototype.open
            const origSend = XHR.prototype.send
            XHR.prototype.open = function (method: string, url: string | URL) {
                try {
                    ;(this as XMLHttpRequest & { __ah_url?: string }).__ah_url = String(url)
                } catch {
                    // ignore
                }
                return origOpen.apply(this, [method, url] as Parameters<typeof origOpen>)
            }
            XHR.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
                try {
                    const u = (this as XMLHttpRequest & { __ah_url?: string }).__ah_url
                    if (u) record(u, undefined)
                    this.addEventListener('load', () => {
                        try {
                            const ct = this.getResponseHeader('content-type') || ''
                            if (u) record(u, ct)
                        } catch {
                            // ignore
                        }
                    })
                    this.addEventListener('error', () => {
                        if (u) record(u, undefined)
                    })
                } catch {
                    // ignore
                }
                return origSend.apply(this, [body ?? null] as Parameters<typeof origSend>)
            }
            cleanupFns.push(() => {
                XHR.prototype.open = origOpen
                XHR.prototype.send = origSend
            })
        }
    } else if (captureContext?.onRequest || captureContext?.onResponse) {
        const onReq = captureContext.onRequest
        const onResp = captureContext.onResponse
        const onReqWrapped = (url: string): void => {
            record(url, undefined)
            onReq?.(url)
        }
        const onRespWrapped = (url: string, contentType: string): void => {
            record(url, contentType)
            onResp?.(url, contentType)
        }
        // The host context is expected to invoke these on its own.
        warnings.push('external capture context active')
        void onReqWrapped
        void onRespWrapped
    }

    // 3) Open the source URL in a hidden context so JS can run, and read
    //    video.currentSrc / click play controls.
    let timedOut = false
    let blocked = false
    let blockedDetail: string | undefined
    let playClicked = false

    const openPromise = (async (): Promise<void> => {
        try {
            if (captureContext?.openContext) {
                const ctx = await captureContext.openContext(sourceUrl, referer)
                if (ctx) {
                    const currentSrc = await ctx.queryVideoCurrentSrc().catch(() => null)
                    if (currentSrc) record(currentSrc)
                    const clicked = await ctx.clickPlayControls().catch(() => false)
                    if (clicked) {
                        playClicked = true
                        await new Promise<void>(r => setTimeout(r, 500))
                        const after = await ctx.queryVideoCurrentSrc().catch(() => null)
                        if (after) record(after)
                    }
                    ctx.destroy()
                }
                return
            }
            if (captureContext?.fetchSource) {
                const r = await captureContext.fetchSource(sourceUrl, referer)
                if (r && r.ok && r.text) {
                    for (const s of staticExtract(r.text, 'network-fetch', sourceUrl)) {
                        record(s.url, s.contentType)
                    }
                } else if (r && !r.ok) {
                    blocked = true
                    blockedDetail = `HTTP ${r.status}`
                }
                return
            }
            if (hasGMXmlhttpRequest()) {
                const text = await gmFetchText(sourceUrl, referer)
                if (text) {
                    for (const s of staticExtract(text, 'network-fetch', sourceUrl)) {
                        record(s.url, s.contentType)
                    }
                }
                return
            }
            if (hasDocument()) {
                // Last-resort: load the source URL into a hidden iframe so the
                // same-origin page can run. The iframe may also be the
                // cross-origin embed page in which case direct DOM reads
                // will fail — we fall back to the hooks above.
                const iframe = document.createElement('iframe')
                iframe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;'
                iframe.setAttribute('aria-hidden', 'true')
                iframe.src = sourceUrl
                document.body.appendChild(iframe)
                try {
                    await new Promise<void>(resolve => {
                        let done = false
                        const finish = (): void => {
                            if (done) return
                            done = true
                            resolve()
                        }
                        iframe.addEventListener('load', () => finish(), { once: true })
                        setTimeout(finish, timeoutMs)
                    })
                    // If same-origin, try to read video.currentSrc.
                    try {
                        const idoc = iframe.contentDocument
                        if (idoc) {
                            const video = idoc.querySelector('video') as HTMLVideoElement | null
                            if (video) {
                                const cur = (video.currentSrc || video.src || '') as string
                                if (cur) record(cur)
                            }
                        }
                    } catch {
                        warnings.push('cross-origin iframe; currentSrc read skipped')
                    }
                } finally {
                    iframe.remove()
                }
            }
        } catch (err) {
            warnings.push('openContext failed: ' + (err instanceof Error ? err.message : String(err)))
        }
    })()

    const timeoutPromise = new Promise<'timeout'>(resolve => {
        setTimeout(() => resolve('timeout'), timeoutMs)
    })

    const raceResult = await Promise.race([openPromise, timeoutPromise])
    if (raceResult === 'timeout') {
        timedOut = true
        warnings.push('networkExtract timed out')
    }

    // 4) Cleanup hooks.
    for (const fn of cleanupFns) {
        try {
            fn()
        } catch {
            // ignore
        }
    }

    if (playClicked) warnings.push('clicked play controls')

    // Apply the ad filter so a malicious embed page can't smuggle a
    // popunder URL into the network capture result.
    return {
        streams: filterStreamResults(streams),
        warnings,
        timedOut,
        blocked,
        blockedDetail,
    }
}

function hasFetchAndXHR(): boolean {
    const g = globalThis as { fetch?: unknown; XMLHttpRequest?: unknown }
    return typeof g.fetch === 'function' && typeof g.XMLHttpRequest !== 'undefined'
}

function hasGMXmlhttpRequest(): boolean {
    const g = globalThis as { GM_xmlhttpRequest?: unknown }
    return typeof g.GM_xmlhttpRequest === 'function'
}

function hasDocument(): boolean {
    return typeof (globalThis as { document?: unknown }).document !== 'undefined'
}

interface GMXmlhttpResponseLike {
    status?: number
    responseText?: string
    response?: string
}

function gmFetchText(url: string, referer: string): Promise<string | null> {
    return new Promise<string | null>(resolve => {
        const g = globalThis as {
            GM_xmlhttpRequest?: (opts: {
                method: string
                url: string
                headers: Record<string, string>
                onload?: (r: GMXmlhttpResponseLike) => void
                onerror?: () => void
                ontimeout?: () => void
            }) => void
        }
        if (!g.GM_xmlhttpRequest) {
            resolve(null)
            return
        }
        try {
            g.GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: { Referer: referer },
                onload: (resp: GMXmlhttpResponseLike) => {
                    if (typeof resp.status === 'number' && resp.status >= 400) {
                        resolve(null)
                        return
                    }
                    resolve(resp.responseText ?? (typeof resp.response === 'string' ? resp.response : '') ?? null)
                },
                onerror: () => resolve(null),
                ontimeout: () => resolve(null),
            })
        } catch {
            resolve(null)
        }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// buildStreamUrl
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick the embed URL for the preferred server, falling back to the first
 * available server. Returns '' if `servers` is empty.
 */
export function buildStreamUrl(preferred: string, servers: Record<string, string>): string {
    if (!servers) return ''
    if (preferred && servers[preferred]) return servers[preferred]
    for (const key of Object.keys(servers)) {
        const value = servers[key]
        if (value) return value
    }
    return ''
}

// ─────────────────────────────────────────────────────────────────────────────
// filterAdUrls / filterStreamResults
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Known video CDN / embed hosts where `.png` or `.jpg` extensions are used
 * to disguise HLS video segments (anti-adblock technique). URLs from these
 * hosts MUST NOT be filtered by non-media extension checks.
 */
const KNOWN_VIDEO_CDNS: readonly string[] = [
    'vipah06.xyz',
    'vipah',
    'ahay.stream',
    'abyssplayer.com',
    'cdn.ahay',
    'hls.',
    '.m3u8',
]

const AD_HOSTS: readonly string[] = [
    'doubleclick.net',
    'googleadservices.com',
    'googlesyndication.com',
    'googletagmanager.com',
    'amazon-adsystem.com',
    'scorecardresearch.com',
    'criteo.net',
    'criteo.com',
    'adservice.google.com',
    'pagead2.googlesyndication.com',
    'adsystem.amazon.com',
    'adnxs.com',
    'rubiconproject.com',
    'pubmatic.com',
    'openx.net',
    'taboola.com',
    'outbrain.com',
    'moatads.com',
    'adsafeprotected.com',
    'popads.net',
    'popcash.net',
    'propellerads.com',
    'adsterra.com',
    'hilltopads.net',
    'revcontent.com',
    'mgid.com',
    'zedo.com',
    'yieldmo.com',
    'smartadserver.com',
    'mathtag.com',
    'adsrvr.org',
    'serving-sys.com',
    'adform.net',
    'casalemedia.com',
    'indexww.com',
    'yahoo-syndication.com',
    'media.net',
    'connatix.com',
    '33across.com',
]

const AD_PATH_PATTERNS: readonly RegExp[] = [
    /\/popunder\//i,
    /\/pop_?up\//i,
    /\/popup\//i,
    /\/banner[a-z_-]*\//i,
    /\/ads?\//i,
    /\/ad[sxv]?\.(?:js|php)/i,
    /[?&]utm_/i,
    /[?&]gclid=/i,
    /[?&]fbclid=/i,
    /[?&]msclkid=/i,
    /[?&]yclid=/i,
    /\/track(?:er|ing)?\//i,
    /\/impression\//i,
    /\/pixel\//i,
    /\/beacon\//i,
]

const NON_MEDIA_EXTENSIONS: readonly string[] = [
    '.gif',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.svg',
    '.ico',
    '.bmp',
    '.tif',
    '.tiff',
    '.css',
    '.js',
    '.mjs',
    '.json',
    '.xml',
    '.html',
    '.htm',
    '.php',
    '.txt',
    '.csv',
    '.rss',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.eot',
]

/**
 * Drop URLs from a raw list that match an ad host, popunder path, or
 * non-media extension. Order-preserving.
 */
export function filterAdUrls(urls: string[]): string[] {
    if (!urls || urls.length === 0) return []
    const out: string[] = []
    const seen = new Set<string>()
    for (const raw of urls) {
        if (!raw) continue
        const url = unescapeUrl(raw.trim())
        if (!url) continue
        if (seen.has(url)) continue
        if (isAdUrl(url)) continue
        seen.add(url)
        out.push(url)
    }
    return out
}

/**
 * Apply the same ad filter to an array of StreamResult objects, dropping
 * any whose `url` matches an ad/popunder/non-media pattern.
 */
function filterStreamResults(results: StreamResult[]): StreamResult[] {
    return filterAdUrls(results.map(r => r.url)).map(url => {
        return results.find(r => r.url === url || unescapeUrl(r.url) === url) as StreamResult
    })
}

function isAdUrl(url: string): boolean {
    if (!url) return true
    const lower = url.toLowerCase()

    // 0) Disallowed schemes. `data:` and `javascript:` are not media unless
    //    they explicitly carry an mp4/m3u8 mime, which no embed server does.
    if (
        lower.startsWith('javascript:') ||
        lower.startsWith('vbscript:') ||
        lower.startsWith('file:') ||
        lower.startsWith('about:')
    ) {
        return true
    }
    if (lower.startsWith('data:')) {
        // data: URLs are only valid streams when they explicitly carry a
        // media mime type. Anything else is treated as ad/script.
        return !/^data:(?:video\/|application\/(?:vnd\.apple\.mpegurl|x-mpegurl|octet-stream))/i.test(url)
    }

    // 1) Known video CDN: skip ALL non-media extension checks. These hosts
    //    use `.png` / `.jpg` / `.webp` to disguise HLS video segments.
    //    Non-media URL substrings like `/ads/` or `/banner/` within a known
    //    video CDN *are* kept because a single CDN can mix ad and video paths,
    //    but if the host is a known CDN, we assume the path is video.
    //    If an ad comes from the same host, it still has a media extension
    //    (m3u8/mp4) so the filter does not need to pierce deeper.
    const isVideoCdn = KNOWN_VIDEO_CDNS.some(cdn => lower.includes(cdn))
    if (isVideoCdn) return false

    // 2) Ad hosts (host equality or suffix match).
    for (const host of AD_HOSTS) {
        if (lower.includes(host)) return true
    }

    // 3) Popunder / tracking path patterns.
    for (const re of AD_PATH_PATTERNS) {
        if (re.test(url)) return true
    }

    // 4) Non-media extensions: keep URLs that have at least one media
    //    extension. URLs without any recognizable extension are kept
    //    because some embed servers hide the type until the response.
    const hasMediaExt = lower.includes('.mp4') || lower.includes('.m3u8')
    if (!hasMediaExt) {
        for (const ext of NON_MEDIA_EXTENSIONS) {
            if (lower.includes(ext)) return true
        }
        // Substrings without a leading dot but clearly script-y (e.g.
        // `application/javascript`, `text/javascript`). These never
        // resolve to a playable media file.
        if (
            lower.includes('javascript') ||
            lower.includes('vbscript') ||
            lower.includes('/ecmascript')
        ) {
            return true
        }
    }

    return false
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function hasDOMParser(): boolean {
    try {
        return typeof (globalThis as { DOMParser?: unknown }).DOMParser !== 'undefined'
    } catch {
        return false
    }
}

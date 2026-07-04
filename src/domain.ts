// Animehay domain resolver, cache, validation, and URL normalizer.
//
// Animehay constantly rotates its public mirror (e.g. animehay.tv redirects to
// animehay07.site, ahay.in, etc). This module provides the only place that
// knows the current primary/secondary domains so the rest of the downloader
// can stay host-agnostic.
//
// Public surface:
//   - resolveAnimehayDomains(): discover + validate + cache, returns the
//     primary/secondary mirror with a 6h TTL.
//   - normalizeAnimehayUrl(): turn a relative or absolute URL into an absolute
//     URL anchored at the current Animehay origin.
//   - isAnimehayHost(): cheap "does this hostname look like an Animehay mirror"
//     check used everywhere we accept an external URL.
//   - getCachedDomains() / clearDomainCache(): introspection + escape hatches.
//
// Environment handling:
//   - Userscript:  uses globalThis.GM_getValue / GM_setValue for persistence
//     and globalThis.GM_xmlhttpRequest for cross-origin fetches.
//   - Node tests:  falls back to an in-memory cache and globalThis.fetch
//     (with AbortController timeout) automatically when the Tampermonkey
//     globals are not defined. Tests can override the fetch surface by
//     assigning globalThis.fetch before calling the resolver.

export interface AnimehayDomainResult {
    primary: string | null
    secondary: string | null
    /** Epoch milliseconds when this result was produced. */
    validatedAt: number
    /** Set when the resolver had to deviate from the animehay.tv path. */
    fallbackReason?: string
}

const CACHE_KEY = 'animehay_domains'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const VALIDATION_TIMEOUT_MS = 5000
const HOST_MARKER = 'animehay'
const TRUSTED_SOURCE = 'https://animehay.tv/'

// Internal in-memory cache used when GM_getValue / GM_setValue are unavailable
// (Node test environment, or any context where Tampermonkey has not injected
// the storage surface). Cleared via clearDomainCache().
const memoryStore: Record<string, unknown> = {}

// Test-injection handle. Callers can swap the request implementation before
// invoking resolveAnimehayDomains(); null means "auto-detect from globals".
type RequestResult = { status: number; finalUrl: string; body: string }
type Requester = (url: string, opts?: { timeoutMs?: number }) => Promise<RequestResult>
let testRequester: Requester | null = null

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function getCachedDomains(): AnimehayDomainResult | null {
    const raw = gmGet(CACHE_KEY)
    const parsed = parseCached(raw)
    if (parsed && !isExpired(parsed)) {
        return parsed
    }
    return null
}

export function clearDomainCache(): void {
    gmSet(CACHE_KEY, null)
    delete memoryStore[CACHE_KEY]
    // Also drop any in-memory state the resolver kept on this process.
    testRequester = null
}

export async function resolveAnimehayDomains(
    options?: { currentOrigin?: string }
): Promise<AnimehayDomainResult> {
    // 1. Cache short-circuit: if the cached entry is still fresh, return it
    //    verbatim (validation was already done at write time).
    const cached = getCachedDomains()
    if (cached) {
        return cached
    }

    // 2. Try the trusted source (animehay.tv) and harvest animehay links from
    //    its body. Failures here are non-fatal — they just mean we have to
    //    fall back to the current page origin.
    let candidates: string[] = []
    let trustedError: string | null = null
    try {
        const home = await request(TRUSTED_SOURCE, { timeoutMs: VALIDATION_TIMEOUT_MS })
        if (home.status >= 200 && home.status < 400) {
            candidates = extractAnimehayLinks(home.body, home.finalUrl)
        } else {
            trustedError = `animehay.tv returned HTTP ${home.status}`
        }
    } catch (err) {
        trustedError = `animehay.tv unreachable: ${(err as Error).message}`
    }

    // 3. Validate each candidate. First valid one wins as primary, the rest
    //    are reported as secondary (without further validation: their presence
    //    in the trusted source HTML is itself a soft signal).
    const validated: string[] = []
    for (const candidate of candidates) {
        if (validated.includes(candidate)) continue
        if (await validateDomain(candidate)) {
            validated.push(candidate)
            if (validated.length >= 2) break // we only need primary + secondary
        }
    }

    let primary: string | null = validated[0] ?? null
    let secondary: string | null = validated[1] ?? null
    let fallbackReason: string | undefined

    // 4. If the trusted path gave us nothing usable, try the current page
    //    origin — when the script is running inside an animehay tab, that
    //    origin IS the current mirror by definition.
    if (!primary) {
        const origin = options?.currentOrigin ?? detectCurrentOrigin()
        if (origin) {
            const host = extractHost(origin)
            if (host && isAnimehayHost(host)) {
                const normalized = originFromHost(host)
                if (normalized && await validateDomain(origin)) {
                    primary = normalized
                    fallbackReason = trustedError
                        ? `${trustedError}; using current page origin ${normalized}`
                        : `using current page origin ${normalized}`
                } else {
                    fallbackReason = trustedError
                        ? `${trustedError}; current page origin ${origin} failed validation`
                        : `current page origin ${origin} failed validation`
                }
            } else {
                fallbackReason = trustedError
                    ? `${trustedError}; current page origin ${origin} is not an animehay host`
                    : `current page origin ${origin} is not an animehay host`
            }
        } else if (trustedError) {
            fallbackReason = trustedError
        }
    }

    const result: AnimehayDomainResult = {
        primary,
        secondary,
        validatedAt: Date.now(),
    }
    if (fallbackReason) result.fallbackReason = fallbackReason

    // 5. Persist. A null primary still gets cached with fallbackReason so the
    //    next call within 6h can see why we returned empty and the UI can
    //    surface the reason to the user.
    saveDomains(result)
    return result
}

export function normalizeAnimehayUrl(url: string, origin?: string): string {
    if (!url) return url
    // A pure-whitespace input is not a URL — leave it untouched so the caller
    // can decide what to do with it.
    if (url.trim() === '') return url
    const trimmed = url.trim()
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed
    }
    // Protocol-relative: //cdn.example.com/x.mp4 -> {current origin scheme}://...
    if (trimmed.startsWith('//')) {
        const scheme = origin && /^https:/i.test(origin) ? 'https:' : 'http:'
        return scheme + trimmed
    }
    const base = origin || detectCurrentOrigin() || TRUSTED_SOURCE
    try {
        return new URL(trimmed, base).toString()
    } catch {
        return trimmed
    }
}

export function isAnimehayHost(hostname: string): boolean {
    if (!hostname) return false
    return hostname.toLowerCase().includes(HOST_MARKER)
}

// ─────────────────────────────────────────────────────────────────────────────
// Test hooks (not part of the documented surface, but harmless in production)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replace the requester implementation. Pass null to restore auto-detection.
 * Intended for unit tests; production code should not call this.
 */
export function __setRequesterForTesting(fn: Requester | null): void {
    testRequester = fn
}

/**
 * Wipe the in-memory test cache. Distinct from clearDomainCache() so tests
 * can reset the memoryStore backplane without touching the GM storage path.
 */
export function __resetMemoryStoreForTesting(): void {
    for (const key of Object.keys(memoryStore)) {
        delete memoryStore[key]
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Request surface
// ─────────────────────────────────────────────────────────────────────────────

async function request(url: string, opts?: { timeoutMs?: number }): Promise<RequestResult> {
    if (testRequester) {
        return testRequester(url, opts)
    }
    const gmRequest = (globalThis as { GM_xmlhttpRequest?: unknown }).GM_xmlhttpRequest
    if (typeof gmRequest === 'function') {
        return requestViaGM(url, opts?.timeoutMs ?? VALIDATION_TIMEOUT_MS, gmRequest as GMRequestFn)
    }
    return requestViaFetch(url, opts?.timeoutMs ?? VALIDATION_TIMEOUT_MS)
}

type GMRequestFn = (opts: {
    method: string
    url: string
    timeout: number
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

function requestViaGM(url: string, timeoutMs: number, gm: GMRequestFn): Promise<RequestResult> {
    return new Promise<RequestResult>((resolve, reject) => {
        let settled = false
        const settle = (fn: () => void): void => {
            if (settled) return
            settled = true
            fn()
        }
        const timer = setTimeout(() => {
            settle(() => reject(new Error('timeout')))
        }, timeoutMs)
        try {
            gm({
                method: 'GET',
                url,
                timeout: timeoutMs,
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
                    settle(() => reject(new Error(err?.error || 'request failed')))
                },
                ontimeout: () => {
                    clearTimeout(timer)
                    settle(() => reject(new Error('timeout')))
                },
            })
        } catch (err) {
            clearTimeout(timer)
            settle(() => reject(err instanceof Error ? err : new Error(String(err))))
        }
    })
}

async function requestViaFetch(url: string, timeoutMs: number): Promise<RequestResult> {
    const fetchImpl = (globalThis as { fetch?: typeof fetch }).fetch
    if (typeof fetchImpl !== 'function') {
        throw new Error('no fetch implementation available')
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
        const resp = await fetchImpl(url, {
            method: 'GET',
            redirect: 'follow',
            signal: ctrl.signal,
        })
        const body = await resp.text()
        return { status: resp.status, finalUrl: resp.url || url, body }
    } finally {
        clearTimeout(timer)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain discovery + validation
// ─────────────────────────────────────────────────────────────────────────────

const HREF_REGEX = /href\s*=\s*["']([^"']+)["']/gi
const URL_REGEX = /https?:\/\/([a-z0-9._-]+)/gi

function extractAnimehayLinks(html: string, baseFinalUrl: string): string[] {
    if (!html) return []
    const found = new Set<string>()
    const baseHost = extractHost(baseFinalUrl) || ''

    const harvest = (raw: string): void => {
        const host = extractHost(raw)
        if (!host) return
        if (!isAnimehayHost(host)) return
        // Normalise to origin so we don't accidentally promote a deep path
        // into the "domain" field.
        const origin = originFromHost(host)
        if (origin) found.add(origin)
    }

    // First pass: explicit href targets carry the most signal.
    let m: RegExpExecArray | null
    HREF_REGEX.lastIndex = 0
    while ((m = HREF_REGEX.exec(html)) !== null) {
        harvest(m[1])
    }

    // Second pass: any bare URL in the body (CSS/JS comments, og:url, etc).
    URL_REGEX.lastIndex = 0
    while ((m = URL_REGEX.exec(html)) !== null) {
        harvest('https://' + m[1] + '/')
    }

    const out: string[] = []
    for (const origin of found) {
        if (baseHost && extractHost(origin) === baseHost) continue
        out.push(origin)
    }
    return out
}

async function validateDomain(origin: string): Promise<boolean> {
    const host = extractHost(origin)
    if (!host || !isAnimehayHost(host)) return false
    const base = originFromHost(host)
    if (!base) return false

    // Try /token.php first (lightweight and the actual page the site uses
    // for token bootstrapping); fall back to root if it 404s.
    if (await probeStatus(base + '/token.php')) return true
    if (await probeStatus(base + '/')) return true
    return false
}

async function probeStatus(url: string): Promise<boolean> {
    try {
        const resp = await request(url, { timeoutMs: VALIDATION_TIMEOUT_MS })
        return resp.status >= 200 && resp.status < 300
    } catch {
        return false
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache + GM storage backplane
// ─────────────────────────────────────────────────────────────────────────────

function gmGet(key: string): unknown {
    const gmGetFn = (globalThis as { GM_getValue?: (k: string) => unknown }).GM_getValue
    if (typeof gmGetFn === 'function') {
        try {
            return gmGetFn(key)
        } catch {
            return memoryStore[key]
        }
    }
    return memoryStore[key]
}

function gmSet(key: string, value: unknown): void {
    const gmSetFn = (globalThis as { GM_setValue?: (k: string, v: unknown) => void }).GM_setValue
    if (typeof gmSetFn === 'function') {
        try {
            gmSetFn(key, value)
            return
        } catch {
            // fall through to memory
        }
    }
    if (value === null || value === undefined) {
        delete memoryStore[key]
    } else {
        memoryStore[key] = value
    }
}

function saveDomains(result: AnimehayDomainResult): void {
    gmSet(CACHE_KEY, result)
}

function parseCached(raw: unknown): AnimehayDomainResult | null {
    if (raw === null || raw === undefined) return null
    if (typeof raw === 'string') {
        try {
            return parseCached(JSON.parse(raw))
        } catch {
            return null
        }
    }
    if (typeof raw !== 'object') return null
    const obj = raw as Partial<AnimehayDomainResult>
    if (typeof obj.validatedAt !== 'number' || !Number.isFinite(obj.validatedAt)) {
        return null
    }
    return {
        primary: typeof obj.primary === 'string' ? obj.primary : null,
        secondary: typeof obj.secondary === 'string' ? obj.secondary : null,
        validatedAt: obj.validatedAt,
        fallbackReason: typeof obj.fallbackReason === 'string' ? obj.fallbackReason : undefined,
    }
}

function isExpired(result: AnimehayDomainResult): boolean {
    return Date.now() - result.validatedAt > CACHE_TTL_MS
}

// ─────────────────────────────────────────────────────────────────────────────
// URL helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractHost(urlOrHost: string): string | null {
    if (!urlOrHost) return null
    const trimmed = urlOrHost.trim()
    if (!trimmed) return null
    try {
        // If the input is a bare host, URL() will throw. Prepend scheme.
        const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : 'http://' + trimmed
        const u = new URL(withScheme)
        return u.hostname.toLowerCase()
    } catch {
        return null
    }
}

function originFromHost(host: string): string | null {
    if (!host) return null
    return 'https://' + host + '/'
}

function detectCurrentOrigin(): string | null {
    try {
        const loc = (globalThis as { location?: { origin?: string; href?: string } }).location
        if (!loc) return null
        if (loc.origin) return loc.origin
        if (loc.href) {
            const u = new URL(loc.href)
            return u.origin
        }
    } catch {
        // ignore
    }
    return null
}

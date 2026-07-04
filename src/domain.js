"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedDomains = getCachedDomains;
exports.clearDomainCache = clearDomainCache;
exports.resolveAnimehayDomains = resolveAnimehayDomains;
exports.normalizeAnimehayUrl = normalizeAnimehayUrl;
exports.isAnimehayHost = isAnimehayHost;
exports.__setRequesterForTesting = __setRequesterForTesting;
exports.__resetMemoryStoreForTesting = __resetMemoryStoreForTesting;
const CACHE_KEY = 'animehay_domains';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const VALIDATION_TIMEOUT_MS = 5000;
const HOST_MARKER = 'animehay';
const TRUSTED_SOURCE = 'https://animehay.tv/';
// Internal in-memory cache used when GM_getValue / GM_setValue are unavailable
// (Node test environment, or any context where Tampermonkey has not injected
// the storage surface). Cleared via clearDomainCache().
const memoryStore = {};
let testRequester = null;
// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────
function getCachedDomains() {
    const raw = gmGet(CACHE_KEY);
    const parsed = parseCached(raw);
    if (parsed && !isExpired(parsed)) {
        return parsed;
    }
    return null;
}
function clearDomainCache() {
    gmSet(CACHE_KEY, null);
    delete memoryStore[CACHE_KEY];
    // Also drop any in-memory state the resolver kept on this process.
    testRequester = null;
}
async function resolveAnimehayDomains(options) {
    // 1. Cache short-circuit: if the cached entry is still fresh, return it
    //    verbatim (validation was already done at write time).
    const cached = getCachedDomains();
    if (cached) {
        return cached;
    }
    // 2. Try the trusted source (animehay.tv) and harvest animehay links from
    //    its body. Failures here are non-fatal — they just mean we have to
    //    fall back to the current page origin.
    let candidates = [];
    let trustedError = null;
    try {
        const home = await request(TRUSTED_SOURCE, { timeoutMs: VALIDATION_TIMEOUT_MS });
        if (home.status >= 200 && home.status < 400) {
            candidates = extractAnimehayLinks(home.body, home.finalUrl);
        }
        else {
            trustedError = `animehay.tv returned HTTP ${home.status}`;
        }
    }
    catch (err) {
        trustedError = `animehay.tv unreachable: ${err.message}`;
    }
    // 3. Validate each candidate. First valid one wins as primary, the rest
    //    are reported as secondary (without further validation: their presence
    //    in the trusted source HTML is itself a soft signal).
    const validated = [];
    for (const candidate of candidates) {
        if (validated.includes(candidate))
            continue;
        if (await validateDomain(candidate)) {
            validated.push(candidate);
            if (validated.length >= 2)
                break; // we only need primary + secondary
        }
    }
    let primary = validated[0] ?? null;
    let secondary = validated[1] ?? null;
    let fallbackReason;
    // 4. If the trusted path gave us nothing usable, try the current page
    //    origin — when the script is running inside an animehay tab, that
    //    origin IS the current mirror by definition.
    if (!primary) {
        const origin = options?.currentOrigin ?? detectCurrentOrigin();
        if (origin) {
            const host = extractHost(origin);
            if (host && isAnimehayHost(host)) {
                const normalized = originFromHost(host);
                if (normalized && await validateDomain(origin)) {
                    primary = normalized;
                    fallbackReason = trustedError
                        ? `${trustedError}; using current page origin ${normalized}`
                        : `using current page origin ${normalized}`;
                }
                else {
                    fallbackReason = trustedError
                        ? `${trustedError}; current page origin ${origin} failed validation`
                        : `current page origin ${origin} failed validation`;
                }
            }
            else {
                fallbackReason = trustedError
                    ? `${trustedError}; current page origin ${origin} is not an animehay host`
                    : `current page origin ${origin} is not an animehay host`;
            }
        }
        else if (trustedError) {
            fallbackReason = trustedError;
        }
    }
    const result = {
        primary,
        secondary,
        validatedAt: Date.now(),
    };
    if (fallbackReason)
        result.fallbackReason = fallbackReason;
    // 5. Persist. A null primary still gets cached with fallbackReason so the
    //    next call within 6h can see why we returned empty and the UI can
    //    surface the reason to the user.
    saveDomains(result);
    return result;
}
function normalizeAnimehayUrl(url, origin) {
    if (!url)
        return url;
    // A pure-whitespace input is not a URL — leave it untouched so the caller
    // can decide what to do with it.
    if (url.trim() === '')
        return url;
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    // Protocol-relative: //cdn.example.com/x.mp4 -> {current origin scheme}://...
    if (trimmed.startsWith('//')) {
        const scheme = origin && /^https:/i.test(origin) ? 'https:' : 'http:';
        return scheme + trimmed;
    }
    const base = origin || detectCurrentOrigin() || TRUSTED_SOURCE;
    try {
        return new URL(trimmed, base).toString();
    }
    catch {
        return trimmed;
    }
}
function isAnimehayHost(hostname) {
    if (!hostname)
        return false;
    return hostname.toLowerCase().includes(HOST_MARKER);
}
// ─────────────────────────────────────────────────────────────────────────────
// Test hooks (not part of the documented surface, but harmless in production)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Replace the requester implementation. Pass null to restore auto-detection.
 * Intended for unit tests; production code should not call this.
 */
function __setRequesterForTesting(fn) {
    testRequester = fn;
}
/**
 * Wipe the in-memory test cache. Distinct from clearDomainCache() so tests
 * can reset the memoryStore backplane without touching the GM storage path.
 */
function __resetMemoryStoreForTesting() {
    for (const key of Object.keys(memoryStore)) {
        delete memoryStore[key];
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Request surface
// ─────────────────────────────────────────────────────────────────────────────
async function request(url, opts) {
    if (testRequester) {
        return testRequester(url, opts);
    }
    const gmRequest = globalThis.GM_xmlhttpRequest;
    if (typeof gmRequest === 'function') {
        return requestViaGM(url, opts?.timeoutMs ?? VALIDATION_TIMEOUT_MS, gmRequest);
    }
    return requestViaFetch(url, opts?.timeoutMs ?? VALIDATION_TIMEOUT_MS);
}
function requestViaGM(url, timeoutMs, gm) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (fn) => {
            if (settled)
                return;
            settled = true;
            fn();
        };
        const timer = setTimeout(() => {
            settle(() => reject(new Error('timeout')));
        }, timeoutMs);
        try {
            gm({
                method: 'GET',
                url,
                timeout: timeoutMs,
                onload: (resp) => {
                    clearTimeout(timer);
                    settle(() => resolve({
                        status: resp.status,
                        finalUrl: resp.finalUrl ?? url,
                        body: typeof resp.responseText === 'string' ? resp.responseText : '',
                    }));
                },
                onerror: (err) => {
                    clearTimeout(timer);
                    settle(() => reject(new Error(err?.error || 'request failed')));
                },
                ontimeout: () => {
                    clearTimeout(timer);
                    settle(() => reject(new Error('timeout')));
                },
            });
        }
        catch (err) {
            clearTimeout(timer);
            settle(() => reject(err instanceof Error ? err : new Error(String(err))));
        }
    });
}
async function requestViaFetch(url, timeoutMs) {
    const fetchImpl = globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
        throw new Error('no fetch implementation available');
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const resp = await fetchImpl(url, {
            method: 'GET',
            redirect: 'follow',
            signal: ctrl.signal,
        });
        const body = await resp.text();
        return { status: resp.status, finalUrl: resp.url || url, body };
    }
    finally {
        clearTimeout(timer);
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Domain discovery + validation
// ─────────────────────────────────────────────────────────────────────────────
const HREF_REGEX = /href\s*=\s*["']([^"']+)["']/gi;
const URL_REGEX = /https?:\/\/([a-z0-9._-]+)/gi;
function extractAnimehayLinks(html, baseFinalUrl) {
    if (!html)
        return [];
    const found = new Set();
    const baseHost = extractHost(baseFinalUrl) || '';
    const harvest = (raw) => {
        const host = extractHost(raw);
        if (!host)
            return;
        if (!isAnimehayHost(host))
            return;
        // Normalise to origin so we don't accidentally promote a deep path
        // into the "domain" field.
        const origin = originFromHost(host);
        if (origin)
            found.add(origin);
    };
    // First pass: explicit href targets carry the most signal.
    let m;
    HREF_REGEX.lastIndex = 0;
    while ((m = HREF_REGEX.exec(html)) !== null) {
        harvest(m[1]);
    }
    // Second pass: any bare URL in the body (CSS/JS comments, og:url, etc).
    URL_REGEX.lastIndex = 0;
    while ((m = URL_REGEX.exec(html)) !== null) {
        harvest('https://' + m[1] + '/');
    }
    const out = [];
    for (const origin of found) {
        if (baseHost && extractHost(origin) === baseHost)
            continue;
        out.push(origin);
    }
    return out;
}
async function validateDomain(origin) {
    const host = extractHost(origin);
    if (!host || !isAnimehayHost(host))
        return false;
    const base = originFromHost(host);
    if (!base)
        return false;
    // Try /token.php first (lightweight and the actual page the site uses
    // for token bootstrapping); fall back to root if it 404s.
    if (await probeStatus(base + '/token.php'))
        return true;
    if (await probeStatus(base + '/'))
        return true;
    return false;
}
async function probeStatus(url) {
    try {
        const resp = await request(url, { timeoutMs: VALIDATION_TIMEOUT_MS });
        return resp.status >= 200 && resp.status < 300;
    }
    catch {
        return false;
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Cache + GM storage backplane
// ─────────────────────────────────────────────────────────────────────────────
function gmGet(key) {
    const gmGetFn = globalThis.GM_getValue;
    if (typeof gmGetFn === 'function') {
        try {
            return gmGetFn(key);
        }
        catch {
            return memoryStore[key];
        }
    }
    return memoryStore[key];
}
function gmSet(key, value) {
    const gmSetFn = globalThis.GM_setValue;
    if (typeof gmSetFn === 'function') {
        try {
            gmSetFn(key, value);
            return;
        }
        catch {
            // fall through to memory
        }
    }
    if (value === null || value === undefined) {
        delete memoryStore[key];
    }
    else {
        memoryStore[key] = value;
    }
}
function saveDomains(result) {
    gmSet(CACHE_KEY, result);
}
function parseCached(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (typeof raw === 'string') {
        try {
            return parseCached(JSON.parse(raw));
        }
        catch {
            return null;
        }
    }
    if (typeof raw !== 'object')
        return null;
    const obj = raw;
    if (typeof obj.validatedAt !== 'number' || !Number.isFinite(obj.validatedAt)) {
        return null;
    }
    return {
        primary: typeof obj.primary === 'string' ? obj.primary : null,
        secondary: typeof obj.secondary === 'string' ? obj.secondary : null,
        validatedAt: obj.validatedAt,
        fallbackReason: typeof obj.fallbackReason === 'string' ? obj.fallbackReason : undefined,
    };
}
function isExpired(result) {
    return Date.now() - result.validatedAt > CACHE_TTL_MS;
}
// ─────────────────────────────────────────────────────────────────────────────
// URL helpers
// ─────────────────────────────────────────────────────────────────────────────
function extractHost(urlOrHost) {
    if (!urlOrHost)
        return null;
    const trimmed = urlOrHost.trim();
    if (!trimmed)
        return null;
    try {
        // If the input is a bare host, URL() will throw. Prepend scheme.
        const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : 'http://' + trimmed;
        const u = new URL(withScheme);
        return u.hostname.toLowerCase();
    }
    catch {
        return null;
    }
}
function originFromHost(host) {
    if (!host)
        return null;
    return 'https://' + host + '/';
}
function detectCurrentOrigin() {
    try {
        const loc = globalThis.location;
        if (!loc)
            return null;
        if (loc.origin)
            return loc.origin;
        if (loc.href) {
            const u = new URL(loc.href);
            return u.origin;
        }
    }
    catch {
        // ignore
    }
    return null;
}
//# sourceMappingURL=domain.js.map
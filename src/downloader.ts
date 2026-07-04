import { config } from './config'
import { sanitizeFilename, delay, LooseObject, parseCookieJar } from './env'
import { getCachedDomains } from './domain'

interface DownloadOptions {
    url: string
    filename: string
    referer?: string
    onProgress?: (progress: number) => void
    onComplete?: () => void
    onError?: (error: Error) => void
    bulk?: boolean
}

const FALLBACK_REFERER = 'https://animehay.tv/'

/**
 * Resolve the Animehay origin we should advertise as `Referer` for outbound
 * media requests. Prefers the cached primary mirror, then the secondary
 * mirror, and finally the hardcoded `https://animehay.tv/`. We never
 * hardcode a specific mirror because the site rotates hosts (animehay07.site,
 * animehay05.com, ...) frequently and a stale referer makes the embed page
 * reject the media request.
 */
export function getActiveReferer(): string {
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
    return FALLBACK_REFERER
}

/**
 * Pure predicate: should the in-browser blob downloader warn the user that
 * the response is too large to safely hold in memory? Exported for testing.
 *
 *   - `totalBytes` is whatever the server reports (often from the first
 *     `onprogress` event when `e.total` becomes known).
 *   - `maxMb` is the configured ceiling in megabytes.
 *
 * Returns `false` for unknown / non-positive sizes so the absence of a
 * `Content-Length` header is not treated as a giant file.
 */
export function shouldWarnAboutBlobSize(totalBytes: number, maxMb: number): boolean {
    if (!Number.isFinite(totalBytes) || totalBytes <= 0) return false
    if (!Number.isFinite(maxMb) || maxMb <= 0) return false
    return totalBytes > maxMb * 1024 * 1024
}

/**
 * Format a byte count for the size-warning log line.
 * Exported for testing.
 */
export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0
    let value = bytes
    while (value >= 1024 && i < units.length - 1) {
        value /= 1024
        i += 1
    }
    const decimals = i === 0 ? 0 : 1
    return `${value.toFixed(decimals)} ${units[i]}`
}

export function getCookieHeader(): string {
    const custom = config.get('customCookies')
    if (custom) return custom
    return getDocumentCookie()
}

function getDocumentCookie(): string {
    try {
        const doc = (globalThis as { document?: { cookie?: string } }).document
        if (doc && typeof doc.cookie === 'string') return doc.cookie
    } catch {
        // ignore
    }
    return ''
}

export function getHeaders(referer?: string): Record<string, string> {
    const headers: Record<string, string> = {}
    const activeReferer = referer || getActiveReferer()
    if (activeReferer) headers['Referer'] = activeReferer
    const cookies = getCookieHeader()
    if (cookies) headers['Cookie'] = cookies
    return headers
}

function doSingleDownload(
    options: DownloadOptions,
    headers: Record<string, string>,
    resolve: () => void,
    reject: (error: Error) => void
): void {
    const { url, filename, onProgress, onComplete, onError } = options
    const maxMb = config.get('maxBrowserBlobMb')
    let sizeWarned = false

    GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers,
        responseType: 'blob',
        timeout: 30_000,
        onprogress: (e) => {
            if (e.total > 0) {
                if (!sizeWarned && shouldWarnAboutBlobSize(e.total, maxMb)) {
                    sizeWarned = true
                    logBlobSizeWarning(e.total, maxMb, filename)
                }
                onProgress?.((e.loaded / e.total) * 100)
            }
        },
        onload: (response) => {
            if (response.status >= 400) {
                onError?.(new Error(`HTTP ${response.status}`))
                reject(new Error(`HTTP ${response.status}`))
                return
            }
            const blob = response.response as Blob
            if (!blob || blob.size === 0) {
                onError?.(new Error('Empty file'))
                reject(new Error('Empty file'))
                return
            }
            // Last-chance size check: if the server only announced the body
            // size in the response and the user has not been warned yet,
            // warn now (better late than OOM).
            if (!sizeWarned && shouldWarnAboutBlobSize(blob.size, maxMb)) {
                sizeWarned = true
                logBlobSizeWarning(blob.size, maxMb, filename)
            }
            triggerDownload(blob, filename)
            onComplete?.()
            resolve()
        },
        onerror: () => {
            onError?.(new Error('Download failed'))
            reject(new Error('Download failed'))
        },
        ontimeout: () => {
            onError?.(new Error('Timeout'))
            reject(new Error('Timeout'))
        },
    })
}

function logBlobSizeWarning(bytes: number, maxMb: number, filename: string): void {
    const human = formatBytes(bytes)
    const cap = formatBytes(maxMb * 1024 * 1024)
    const safe = sanitizeFilename(filename)
    // Plain console.warn keeps the message in the browser devtools without
    // surfacing a modal that would block the download.
    // eslint-disable-next-line no-console
    console.warn(
        `[AnimehayDL] "${safe}" is ${human}, above the ${cap} blob ceiling. ` +
        'Consider switching to GM_download or aria2 to avoid browser OOM.',
    )
}

function triggerDownload(blob: Blob, filename: string): void {
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = sanitizeFilename(filename)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
}

export function getDownloadUrl(url: string): string {
    const cookies = getCookieHeader()
    const referer = getActiveReferer()
    const params = new URLSearchParams()
    params.set('url', url)
    if (cookies) params.set('cookie', cookies)
    params.set('referer', referer)
    return `data:text/html,${encodeURIComponent(generateDownloadPage(url, cookies))}`
}

function generateDownloadPage(url: string, cookies: string): string {
    return `<!DOCTYPE html>
<html><head><title>Download</title></head>
<body>
<p>Right-click and copy this link, then paste into IDM/FDM:</p>
<a href="${url}" referrerpolicy="no-referrer">${url}</a>
<script>
document.cookie="${cookies}";
window.location.href="${url}";
</script>
</body></html>`
}

export async function browserDownload(options: DownloadOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            doSingleDownload(options, getHeaders(options.referer), resolve, reject)
        } catch (error) {
            options.onError?.(error instanceof Error ? error : new Error(String(error)))
            reject(error)
        }
    })
}

export async function gmDownload(options: DownloadOptions): Promise<void> {
    const { url, filename, referer, onProgress, onComplete, onError } = options

    return new Promise<void>((resolve, reject) => {
        GM_download({
            url,
            name: sanitizeFilename(filename),
            headers: referer ? { Referer: referer } : undefined,
            onprogress: (e) => {
                if (e.total > 0) onProgress?.((e.loaded / e.total) * 100)
            },
            onload: () => { onComplete?.(); resolve() },
            onerror: (err) => {
                const error = new Error(`GM_download: ${err.error || 'unknown'}`)
                onError?.(error); reject(error)
            },
            ontimeout: () => {
                const error = new Error('GM_download timeout')
                onError?.(error); reject(error)
            },
        })
    })
}

export async function aria2Download(options: DownloadOptions): Promise<void> {
    const { url, filename, referer, onComplete, onError } = options
    const rpcUrl = config.get('aria2RpcUrl')
    const secret = config.get('aria2Secret')
    const cookies = config.get('customCookies') || getDocumentCookie()
    const chunks = config.get('chunksPerVideo')

    const headerList: string[] = []
    const activeReferer = referer || getActiveReferer()
    if (activeReferer) headerList.push(`Referer: ${activeReferer}`)
    if (cookies) headerList.push(`Cookie: ${cookies}`)

    const params: unknown[] = secret ? [`token:${secret}`] : []
    params.push([url], {
        out: sanitizeFilename(filename),
        header: headerList,
        split: String(chunks),
        'max-connection-per-server': String(chunks),
        'min-split-size': '1M',
    })

    const body: LooseObject = {
        jsonrpc: '2.0',
        method: 'aria2.addUri',
        id: Date.now().toString(),
        params,
    }

    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        const result = await response.json() as LooseObject
        if (result.error) throw new Error(`Aria2: ${result.error.message}`)
        onComplete?.()
    } catch (error) {
        onError?.(error instanceof Error ? error : new Error(String(error)))
    }
}

export async function directDownload(options: DownloadOptions): Promise<void> {
    const { url, bulk, onComplete } = options

    if (bulk) {
        await delay(config.get('downloadDelay'))
    }

    GM_openInTab(url, { active: !bulk, insert: true, setParent: !bulk })
    onComplete?.()
}

export async function othersDownload(options: DownloadOptions): Promise<void> {
    const { url } = options
    const cookies = getCookieHeader()
    // The data-URI page runs in a same-origin context, so writing the cookie
    // with `domain=.animehay.tv` is what the browser expects when a
    // download manager or a different mirror domain needs the session.
    const html = `<!DOCTYPE html>
<html><head><title>Redirecting...</title></head>
<body>
<script>
document.cookie="${cookies}; path=/; domain=.animehay.tv";
setTimeout(() => { window.location.href = "${url}"; }, 500);
</script>
<p>Redirecting to download... If nothing happens, <a href="${url}">click here</a>.</p>
</body></html>`
    const dataUri = `data:text/html,${encodeURIComponent(html)}`
    GM_openInTab(dataUri, { active: true, insert: true, setParent: true })
}

export async function download(options: DownloadOptions): Promise<void> {
    const method = config.get('downloadMethod')
    try {
        switch (method) {
            case 'browser': return browserDownload(options)
            case 'gm_download': return gmDownload(options)
            case 'aria2': return aria2Download(options)
            case 'direct': return directDownload(options)
            case 'others': return othersDownload(options)
            default: return browserDownload(options)
        }
    } catch (error) {
        if (method !== 'browser' && method !== 'direct') {
            options.onError?.(new Error(method + ' failed, fallback to browser: ' + (error instanceof Error ? error.message : String(error))))
            return browserDownload(options)
        }
        throw error
    }
}

/**
 * Convenience wrapper around `parseCookieJar` that guesses the format from
 * the file name extension. Re-exported here so call sites don't need to
 * import from `env` directly.
 */
export function importCookiesFromText(text: string, fileName: string): string | null {
    const lower = (fileName || '').toLowerCase()
    const format: 'json' | 'txt' = lower.endsWith('.json') ? 'json' : 'txt'
    return parseCookieJar(text, format)
}

// Re-export for downstream consumers that already import from downloader.
export { parseCookieJar }

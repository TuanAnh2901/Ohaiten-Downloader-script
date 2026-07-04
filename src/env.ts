export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null
    return function(this: unknown, ...args: Parameters<T>) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => fn.apply(this, args), ms)
    }
}

export function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
    let last = 0
    return function(this: unknown, ...args: Parameters<T>) {
        const now = Date.now()
        if (now - last >= ms) {
            last = now
            fn.apply(this, args)
        }
    }
}

export function sanitizeFilename(name: string): string {
    return name
        .normalize('NFKC')
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 120)
}

export function base64Decode(str: string): string {
    try {
        return atob(str)
    } catch {
        return str
    }
}

export function base64Encode(str: string): string {
    try {
        return btoa(str)
    } catch {
        return str
    }
}

export interface LooseObject {
    [key: string]: unknown
}

export type DownloadMethod = 'browser' | 'gm_download' | 'aria2' | 'others' | 'direct'

/** Detect whether a URL points to an HLS stream (m3u8 playlist). */
export function isHlsUrl(url: string): boolean {
    if (!url) return false
    return url.toLowerCase().includes('.m3u8')
}

/**
 * Parse a cookie jar text blob into a `name=value; name=value` cookie header.
 *
 * Two input shapes are supported:
 *
 *   - `format: 'json'`
 *       J2Team / Cookie-Editor style. Accepts either an array of
 *       `{ name, value }` objects or a flat `{ name: value, ... }` map.
 *
 *   - `format: 'txt'`
 *       Get Cookies.txt LOCALE / Netscape format. Each cookie is one
 *       tab-separated line; columns 5/6 (0-indexed) are the name and value.
 *       Comment lines (`#…`) and blank lines are skipped. A line that
 *       starts with `#HttpOnly_` is a real HttpOnly cookie (the prefix
 *       is a Get Cookies.txt LOCALE convention) — the prefix is stripped
 *       and the line is parsed normally. A line must have at least 7
 *       tab-separated columns to be considered valid.
 *
 * Returns `null` when no valid cookies can be extracted so the caller can
 * distinguish "no cookies" from "empty cookie string". The output is
 * suitable to be assigned to `customCookies` in `ConfigData` and used
 * directly as a `Cookie:` request header.
 */
export function parseCookieJar(text: string, format: 'json' | 'txt'): string | null {
    if (!text) return null
    try {
        if (format === 'json') {
            const data = JSON.parse(text) as unknown
            const cookies: string[] = []
            if (Array.isArray(data)) {
                for (const item of data) {
                    if (item && typeof item === 'object') {
                        const rec = item as Record<string, unknown>
                        const name = typeof rec.name === 'string' ? rec.name : ''
                        const value = typeof rec.value === 'string' ? rec.value : ''
                        if (name) cookies.push(`${name}=${value}`)
                    }
                }
            } else if (data && typeof data === 'object') {
                for (const [name, value] of Object.entries(data as Record<string, unknown>)) {
                    if (value === undefined || value === null) continue
                    cookies.push(`${name}=${String(value)}`)
                }
            }
            return cookies.length > 0 ? cookies.join('; ') : null
        }

        // Netscape / Get Cookies.txt TXT format.
        const cookies: string[] = []
        for (const rawLine of text.split(/\r?\n/)) {
            let line = rawLine.trim()
            if (!line) continue
            // Get Cookies.txt LOCALE marks HttpOnly cookies with a
            // `#HttpOnly_` prefix on the host field (column 0). Those
            // lines are real cookies, not header comments — strip the
            // prefix and continue with the normal tab-split path.
            if (line.startsWith('#HttpOnly_')) {
                line = line.slice('#HttpOnly_'.length)
            } else if (line.startsWith('#')) {
                continue
            }
            const parts = line.split('\t')
            if (parts.length < 7) continue
            const name = parts[5]
            const value = parts[6]
            if (!name) continue
            cookies.push(`${name}=${value ?? ''}`)
        }
        return cookies.length > 0 ? cookies.join('; ') : null
    } catch {
        return null
    }
}

export interface VideoInfo {
    vid: string
    vidDecoded: string
    title: string
    series: string
    seryid: string | null
    artist: string
    tags: string[]
    uploadDate: string
    releaseDate: string | null
    episodeNumber: number
    totalEpisodes: number
    streamUrl: string
    streamSource: string
    thumbnail: string
    pageUrl: string
}

export interface CrawlResult {
    videos: { vid: string; title: string; pageUrl: string; thumbnail: string }[]
    hasNextPage: boolean
    currentPage: number
    totalPages: number
}

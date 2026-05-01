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

export type DownloadMethod = 'browser' | 'gm_download' | 'aria2' | 'others'

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

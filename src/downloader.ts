import { config } from './config'
import { sanitizeFilename, delay, LooseObject } from './env'

interface DownloadOptions {
    url: string
    filename: string
    referer?: string
    onProgress?: (progress: number) => void
    onComplete?: () => void
    onError?: (error: Error) => void
    bulk?: boolean
}

function getCookieHeader(): string {
    const custom = config.get('customCookies')
    if (custom) return custom
    return document.cookie || ''
}

function getHeaders(referer?: string): Record<string, string> {
    const headers: Record<string, string> = {}
    if (referer) headers['Referer'] = referer
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

    GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers,
        responseType: 'blob',
        onprogress: (e) => {
            if (e.total > 0) onProgress?.((e.loaded / e.total) * 100)
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
            triggerDownload(blob, filename)
            onComplete?.()
            resolve()
        },
        onerror: (err) => {
            onError?.(new Error('Download failed'))
            reject(new Error('Download failed'))
        },
        ontimeout: () => {
            onError?.(new Error('Timeout'))
            reject(new Error('Timeout'))
        },
    })
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
    const params = new URLSearchParams()
    params.set('url', url)
    if (cookies) params.set('cookie', cookies)
    params.set('referer', 'https://ohentai.org/')
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
    const cookies = config.get('customCookies') || document.cookie
    const chunks = config.get('chunksPerVideo')

    const headerList: string[] = []
    if (referer) headerList.push(`Referer: ${referer}`)
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
    const html = `<!DOCTYPE html>
<html><head><title>Redirecting...</title></head>
<body>
<script>
document.cookie="${cookies}; path=/; domain=.ohentai.org";
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

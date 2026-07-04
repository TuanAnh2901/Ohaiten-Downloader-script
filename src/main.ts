import { config } from './config'
import { delay, sanitizeFilename, debounce, isHlsUrl } from './env'
import { download, importCookiesFromText } from './downloader'
import { downloadHlsStream } from './hls'
import { saveHlsAsBlob, saveHlsStreamToDisk } from './hlsSave'
import { parseWatchPage, AnimehayWatchData, AnimehayEpisode } from './parser'
import { staticExtract, StreamResult } from './extractor'
import { collectSeriesEpisodes, CrawlerError } from './crawler'
import { generateFilename, AnimehayMetadata } from './filename'
import { isAnimehayHost, normalizeAnimehayUrl } from './domain'

// ─────────────────────────────────────────────────────────────────────────────
// CSS — prefixed `.animehay-dl-` so it never collides with the host page or
// with a sibling Ohentai userscript running in the same tab.
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
.animehay-dl-btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 8px 16px; margin: 4px; border: none; border-radius: 4px;
    cursor: pointer; font-size: 14px; font-weight: bold; color: #fff;
    transition: opacity 0.2s; text-decoration: none;
}
.animehay-dl-btn:hover { opacity: 0.85; }
.animehay-dl-btn-primary { background-color: #ff6b35; }
.animehay-dl-btn-secondary { background-color: #4a90d9; }
.animehay-dl-btn-success { background-color: #28a745; }
.animehay-dl-btn-danger { background-color: #dc3545; }
.animehay-dl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.animehay-dl-panel {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: #1a1a2e; border: 2px solid #4a90d9; border-radius: 8px;
    padding: 20px; max-width: 800px; width: 90%; max-height: 80vh;
    overflow-y: auto; z-index: 10000; color: #e0e0e0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
.animehay-dl-panel-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #333;
}
.animehay-dl-panel-header h2 { margin: 0; font-size: 20px; color: #4a90d9; }
.animehay-dl-panel-close {
    background: none; border: none; color: #e0e0e0; font-size: 24px; cursor: pointer; padding: 0 4px;
}
.animehay-dl-panel-close:hover { color: #ff6b35; }
.animehay-dl-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.7); z-index: 9999;
}
.animehay-dl-episode-item {
    display: flex; align-items: center; padding: 8px; margin: 4px 0;
    background: #16213e; border-radius: 4px; gap: 12px;
}
.animehay-dl-episode-item:hover { background: #1a2744; }
.animehay-dl-episode-item input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
.animehay-dl-episode-item .episode-title { flex: 1; font-size: 14px; }
.animehay-dl-episode-item .episode-no { font-size: 12px; color: #888; min-width: 40px; text-align: right; }
.animehay-dl-progress-bar {
    width: 100%; height: 24px; background: #16213e; border-radius: 12px;
    overflow: hidden; margin: 12px 0;
}
.animehay-dl-progress-fill {
    height: 100%; background: linear-gradient(90deg, #4a90d9, #ff6b35);
    transition: width 0.3s; display: flex; align-items: center;
    justify-content: center; color: #fff; font-size: 12px; font-weight: bold;
}
.animehay-dl-settings-row {
    display: flex; align-items: center; margin: 12px 0; gap: 12px;
}
.animehay-dl-settings-row label { min-width: 160px; font-size: 14px; color: #b0b0b0; }
.animehay-dl-settings-row input[type="text"],
.animehay-dl-settings-row input[type="number"],
.animehay-dl-settings-row select {
    flex: 1; padding: 6px 10px; background: #16213e; border: 1px solid #333;
    border-radius: 4px; color: #e0e0e0; font-size: 14px;
}
.animehay-dl-settings-row input[type="checkbox"] { width: 18px; height: 18px; }
.animehay-dl-status { padding: 8px 12px; margin: 8px 0; border-radius: 4px; font-size: 14px; }
.animehay-dl-status-info { background: #1a2744; border-left: 4px solid #4a90d9; }
.animehay-dl-status-success { background: #1a3a2a; border-left: 4px solid #28a745; }
.animehay-dl-status-error { background: #3a1a1a; border-left: 4px solid #dc3545; }
.animehay-dl-checkbox-inject {
    width: 18px; height: 18px; cursor: pointer; margin-right: 6px; vertical-align: middle;
}
.animehay-dl-toolbar { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
.animehay-dl-log {
    max-height: 200px; overflow-y: auto; background: #0a0a14; padding: 8px;
    border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 12px;
}
.animehay-dl-log-entry { padding: 2px 0; border-bottom: 1px solid #222; }
.animehay-dl-log-entry.error { color: #ff6b6b; }
.animehay-dl-log-entry.success { color: #6bff6b; }
.animehay-dl-log-entry.info { color: #6bb5ff; }
`

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function debug(...args: unknown[]): void {
    if (config.get('debug')) console.log('[AnimehayDL]', ...args)
}

function debugError(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error('[AnimehayDL]', ...args)
}

function isWatchPage(): boolean {
    try {
        return /\/xem-phim\//.test(window.location.pathname)
    } catch {
        return false
    }
}

function isInfoPage(): boolean {
    try {
        return /\/thong-tin-phim\//.test(window.location.pathname)
    } catch {
        return false
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DownloadQueue — concurrent bulk download with per-item progress callbacks.
// Modeled on Ohentai's queue; the Animehay `download` function already runs
// through `config.get('downloadMethod')` so we just feed it URLs.
// ─────────────────────────────────────────────────────────────────────────────

interface QueueItem {
    url: string
    filename: string
    referer: string
    episodeNumber: number
    queueIndex: number
    isHls?: boolean
}

class DownloadQueue {
    private queue: QueueItem[] = []
    private processing = false
    private progressCallback: ((current: number, total: number, filename: string) => void) | null = null
    private logCallback: ((message: string, type: 'info' | 'success' | 'error') => void) | null = null
    private itemProgressCallbacks = new Map<number, (pct: number) => void>()
    private nextIndex = 0
    private bulkMode = false

    setBulkMode(bulk: boolean): void { this.bulkMode = bulk }

    add(item: { url: string; filename: string; referer: string; episodeNumber: number; isHls?: boolean }): void {
        this.queue.push({ ...item, queueIndex: this.nextIndex++, isHls: !!item.isHls })
    }

    setProgressCallback(cb: (current: number, total: number, filename: string) => void): void {
        this.progressCallback = cb
    }

    setLogCallback(cb: (message: string, type: 'info' | 'success' | 'error') => void): void {
        this.logCallback = cb
    }

    setItemProgressCallback(index: number, cb: (pct: number) => void): void {
        this.itemProgressCallbacks.set(index, cb)
    }

    get length(): number { return this.queue.length }

    clear(): void {
        this.queue = []
        this.processing = false
        this.itemProgressCallbacks.clear()
        this.nextIndex = 0
        this.bulkMode = false
    }

    async process(): Promise<void> {
        if (this.processing || this.queue.length === 0) return
        this.processing = true

        const total = this.queue.length
        const concurrency = Math.min(Math.max(config.get('concurrentVideos'), 1), this.queue.length)
        let completed = 0
        let nextToStart = 0

        const processOne = async (item: QueueItem): Promise<void> => {
            const idx = item.queueIndex
            this.logCallback?.(`[${idx + 1}/${total}] Downloading: ${item.filename}`, 'info')
            debug(`[${idx + 1}]`, item.url.substring(0, 80))

            if (item.isHls) {
                // HLS download — full pipeline: fetch segments, then save via
                // the configured mode (Blob or File System Access stream).
                try {
                    const result = await downloadHlsStream({
                        m3u8Url: item.url,
                        referer: item.referer,
                        concurrency: Math.min(config.get('concurrentVideos'), 6),
                        onProgress: (loaded, total) => {
                            const pct = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0
                            this.itemProgressCallbacks.get(idx)?.(pct)
                        },
                    })
                    const hlsFilename = sanitizeFilename(item.filename.replace(/\.mp4$/, '') + '.ts')
                    const mode = config.get('hlsSaveMode')
                    let usedStream = false
                    if (mode === 'stream') {
                        const r = await saveHlsStreamToDisk(result, hlsFilename)
                        if (r.ok) {
                            usedStream = true
                        } else {
                            this.logCallback?.(
                                `[${idx + 1}/${total}] Stream save ${r.reason} — falling back to Blob`,
                                'info',
                            )
                        }
                    }
                    if (!usedStream) {
                        saveHlsAsBlob(result, hlsFilename)
                    }
                    // Let the browser accept the save-trigger before we mark 100%.
                    await new Promise<void>(resolve => setTimeout(resolve, 0))
                    this.itemProgressCallbacks.get(idx)?.(100)
                    this.logCallback?.(
                        `[${idx + 1}/${total}] HLS saved (${usedStream ? 'stream' : 'blob'}): ${hlsFilename} (${(result.totalBytes / 1024 / 1024).toFixed(1)} MB, ${result.segmentCount} segs)`,
                        'success',
                    )
                } catch (error) {
                    this.logCallback?.(
                        `[${idx + 1}/${total}] HLS failed: ${item.filename} — ${error instanceof Error ? error.message : String(error)}`,
                        'error',
                    )
                }
            } else {
                // Non-HLS download — single-shot blob/aria2/gm_download
                try {
                    await download({
                        url: item.url,
                        filename: item.filename,
                        referer: item.referer,
                        bulk: this.bulkMode,
                        onProgress: (p) => { this.itemProgressCallbacks.get(idx)?.(p) },
                        onComplete: () => {
                            this.logCallback?.(`[${idx + 1}/${total}] Complete: ${item.filename}`, 'success')
                        },
                        onError: (err) => {
                            this.logCallback?.(`[${idx + 1}/${total}] Error: ${err.message}`, 'error')
                        },
                    })
                } catch (error) {
                    this.logCallback?.(
                        `[${idx + 1}/${total}] Failed: ${error instanceof Error ? error.message : String(error)}`,
                        'error',
                    )
                }
            }

            completed++
            this.progressCallback?.(completed, total, item.filename)
            if (this.bulkMode) {
                await delay(config.get('downloadDelay'))
            }
        }

        const runWorker = async (): Promise<void> => {
            while (nextToStart < this.queue.length) {
                const idx = nextToStart++
                await processOne(this.queue[idx])
            }
        }

        const workers = Array.from({ length: concurrency }, () => runWorker())
        await Promise.all(workers)

        this.processing = false
        this.logCallback?.('All downloads complete!', 'success')
    }
}

const downloadQueue = new DownloadQueue()

// ─────────────────────────────────────────────────────────────────────────────
// Persistent selection storage
// ─────────────────────────────────────────────────────────────────────────────

interface SelectedEpisode {
    url: string
    title: string
    no: string
    episodeId: number
}

const selectedEpisodes = new Map<string, SelectedEpisode>()
let bulkPanelOpen = false
let settingsPanelOpen = false
let bulkLoading = false
let bulkEpisodes: AnimehayEpisode[] = []
let bulkCacheKey = ''

const SELECTED_STORAGE_KEY = 'animehay_selectedEpisodes'

function saveSelectedEpisodes(): void {
    try {
        GM_setValue(SELECTED_STORAGE_KEY, Array.from(selectedEpisodes.entries()))
    } catch (e) {
        debugError('Failed to save selections:', e)
    }
}

function loadSelectedEpisodes(): void {
    try {
        const saved = GM_getValue(SELECTED_STORAGE_KEY, []) as unknown
        if (Array.isArray(saved)) {
            for (const entry of saved) {
                if (Array.isArray(entry) && entry.length === 2) {
                    const [key, value] = entry as [string, SelectedEpisode]
                    if (typeof key === 'string' && value && typeof value === 'object' && typeof value.url === 'string') {
                        selectedEpisodes.set(key, value)
                    }
                }
            }
        }
    } catch (e) {
        debugError('Failed to load selections:', e)
    }
    debug('Loaded selections:', selectedEpisodes.size)
}

function clearSelectedEpisodes(): void {
    selectedEpisodes.clear()
    GM_setValue(SELECTED_STORAGE_KEY, [])
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers — styles, overlay, panel, loading panel
// ─────────────────────────────────────────────────────────────────────────────

function injectStyles(): void {
    if (document.getElementById('animehay-dl-styles')) return
    const style = document.createElement('style')
    style.id = 'animehay-dl-styles'
    style.textContent = CSS
    document.head.appendChild(style)
}

function createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'animehay-dl-overlay'
    overlay.addEventListener('click', () => overlay.remove())
    return overlay
}

function createPanel(title: string, content: HTMLElement, onClosed?: () => void): HTMLDivElement {
    const existingOverlay = document.querySelector('.animehay-dl-overlay')
    const existingPanel = document.querySelector('.animehay-dl-panel')
    if (existingOverlay) existingOverlay.remove()
    if (existingPanel) existingPanel.remove()

    const panel = document.createElement('div')
    panel.className = 'animehay-dl-panel'

    const header = document.createElement('div')
    header.className = 'animehay-dl-panel-header'
    const h2 = document.createElement('h2')
    h2.textContent = title
    const closeBtn = document.createElement('button')
    closeBtn.className = 'animehay-dl-panel-close'
    closeBtn.textContent = 'x'
    closeBtn.addEventListener('click', () => { panel.remove(); overlay.remove(); onClosed?.() })

    header.appendChild(h2)
    header.appendChild(closeBtn)
    panel.appendChild(header)
    panel.appendChild(content)

    const overlay = createOverlay()
    overlay.addEventListener('click', () => { panel.remove(); overlay.remove(); onClosed?.() })

    document.body.appendChild(overlay)
    document.body.appendChild(panel)
    debug('Panel created:', title)
    return panel
}

function showLoadingPanel(title: string): Promise<{
    panel: HTMLDivElement
    overlay: HTMLDivElement
    statusText: HTMLDivElement
    closeBtn: HTMLButtonElement
}> {
    const existingOverlay = document.querySelector('.animehay-dl-overlay')
    const existingPanel = document.querySelector('.animehay-dl-panel')
    if (existingOverlay) existingOverlay.remove()
    if (existingPanel) existingPanel.remove()

    const panel = document.createElement('div')
    panel.className = 'animehay-dl-panel'

    const header = document.createElement('div')
    header.className = 'animehay-dl-panel-header'
    const h2 = document.createElement('h2')
    h2.textContent = title
    const closeBtn = document.createElement('button')
    closeBtn.className = 'animehay-dl-panel-close'
    closeBtn.textContent = 'x'
    closeBtn.disabled = true
    closeBtn.style.opacity = '0.3'
    closeBtn.addEventListener('click', () => { panel.remove(); overlay.remove(); bulkLoading = false })

    header.appendChild(h2)
    header.appendChild(closeBtn)
    panel.appendChild(header)

    const spinner = document.createElement('div')
    spinner.style.textAlign = 'center'
    spinner.style.padding = '40px 0'
    spinner.innerHTML = '<div style="width:40px;height:40px;border:4px solid #333;border-top:4px solid #4a90d9;border-radius:50%;animation:animehay-spin 1s linear infinite;margin:0 auto;"></div>'

    if (!document.getElementById('animehay-dl-spinner-style')) {
        const spinStyle = document.createElement('style')
        spinStyle.id = 'animehay-dl-spinner-style'
        spinStyle.textContent = '@keyframes animehay-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'
        document.head.appendChild(spinStyle)
    }

    panel.appendChild(spinner)

    const statusText = document.createElement('div')
    statusText.className = 'animehay-dl-status animehay-dl-status-info'
    statusText.textContent = 'Starting...'
    statusText.style.textAlign = 'center'
    panel.appendChild(statusText)

    const overlay = createOverlay()
    overlay.addEventListener('click', () => { panel.remove(); overlay.remove(); bulkLoading = false })

    document.body.appendChild(overlay)
    document.body.appendChild(panel)

    return Promise.resolve({ panel, overlay, statusText, closeBtn })
}

// ─────────────────────────────────────────────────────────────────────────────
// Iframe / stream fetch — used by both the single DL button and the bulk flow
// ─────────────────────────────────────────────────────────────────────────────

interface GMHtmlResponse {
    status?: number
    finalUrl?: string
    responseText?: string
    response?: string
}

function gmFetchText(url: string, referer: string): Promise<{ status: number; text: string; finalUrl: string } | null> {
    return new Promise((resolve) => {
        const g = globalThis as { GM_xmlhttpRequest?: (opts: {
            method: string
            url: string
            headers: Record<string, string>
            onload?: (r: GMHtmlResponse) => void
            onerror?: () => void
            ontimeout?: () => void
        }) => void }
        if (typeof g.GM_xmlhttpRequest !== 'function') { resolve(null); return }
        try {
            g.GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: { Referer: referer },
                onload: (resp) => {
                    const text = resp.responseText ?? (typeof resp.response === 'string' ? resp.response : '') ?? ''
                    resolve({ status: resp.status ?? 0, text, finalUrl: resp.finalUrl ?? url })
                },
                onerror: () => resolve(null),
                ontimeout: () => resolve(null),
            })
        } catch {
            resolve(null)
        }
    })
}

async function fetchIframeText(iframeUrl: string, referer: string): Promise<{ status: number; text: string; finalUrl: string } | null> {
    // Prefer GM_xmlhttpRequest so we hit the iframe with a Referer that
    // matches the parent page. Fall back to globalThis.fetch in test contexts.
    const gmResult = await gmFetchText(iframeUrl, referer)
    if (gmResult) return gmResult
    const fetchImpl = (globalThis as { fetch?: typeof fetch }).fetch
    if (typeof fetchImpl !== 'function') return null
    try {
        const resp = await fetchImpl(iframeUrl, { method: 'GET', headers: { Referer: referer } })
        const text = await resp.text()
        return { status: resp.status, text, finalUrl: resp.url || iframeUrl }
    } catch {
        return null
    }
}

/**
 * Resolve the iframe URL for the preferred server, then run staticExtract on
 * its HTML. Returns the first viable stream (or null if extraction failed).
 */
async function extractFirstStream(servers: Record<string, string>, preferred: string, activeServer: string): Promise<{
    stream: StreamResult
    server: string
    iframeUrl: string
} | null> {
    const candidates: Array<{ server: string; iframeUrl: string }> = []
    if (preferred && servers[preferred]) candidates.push({ server: preferred, iframeUrl: servers[preferred] })
    if (activeServer && activeServer !== preferred && servers[activeServer]) {
        candidates.push({ server: activeServer, iframeUrl: servers[activeServer] })
    }
    for (const key of Object.keys(servers)) {
        if (key === preferred || key === activeServer) continue
        if (servers[key]) candidates.push({ server: key, iframeUrl: servers[key] })
    }
    if (candidates.length === 0) return null

    const referer = window.location.origin || (window.location.href ? new URL(window.location.href).origin : '') || ''

    for (const c of candidates) {
        const iframeUrl = normalizeAnimehayUrl(c.iframeUrl, referer)
        const resp = await fetchIframeText(iframeUrl, referer)
        if (!resp || resp.status < 200 || resp.status >= 300 || !resp.text) continue
        const streams = staticExtract(resp.text, c.server, resp.finalUrl || iframeUrl)
        if (streams.length > 0) return { stream: streams[0], server: c.server, iframeUrl: resp.finalUrl || iframeUrl }
    }
    return null
}

function watchDataToMetadata(wd: AnimehayWatchData, overrideEpisodeNumber?: number): AnimehayMetadata {
    const num = (overrideEpisodeNumber ?? parseInt(wd.episode_no, 10)) || 0
    return {
        title: wd.title || wd.currentEpisode.title || '',
        series: wd.breadcrumbSeriesTitle || '',
        movie_id: wd.movie_id || 0,
        episode_id: wd.episode_id || 0,
        episode_no: wd.episode_no || '',
        episodeNumber: Number.isFinite(num) ? num : 0,
        poster: wd.poster || '',
        uploadDate: '',
        tags: [],
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-DL button — watch page
// ─────────────────────────────────────────────────────────────────────────────

function ensureSingleDownloadButton(): void {
    if (document.querySelector('.animehay-dl-single-btn')) return

    // Prefer the player control bar, then the server tabs block, then the
    // playlist header. Each `.wp-*` ancestor is the most natural anchor
    // the user expects; we don't mutate the native player.
    const target = document.querySelector('.wp-ctrl, .wp-svtabs')
    if (!target) return

    const btn = document.createElement('button')
    btn.className = 'animehay-dl-btn animehay-dl-btn-primary animehay-dl-single-btn'
    btn.textContent = 'DL'
    btn.style.marginLeft = '8px'
    btn.style.verticalAlign = 'middle'

    btn.addEventListener('click', async () => {
        if (btn.disabled) return
        btn.disabled = true
        btn.textContent = '...'

        try {
            const html = document.documentElement.outerHTML
            const wd = parseWatchPage(html)
            const preferred = config.get('preferredSource') || wd.activeServer || 'AHS'
            if (!wd.serverMap || Object.keys(wd.serverMap).length === 0) {
                throw new Error('No server map found on this page')
            }
            const extracted = await extractFirstStream(wd.serverMap, preferred, wd.activeServer)
            if (!extracted) {
                throw new Error('No stream found in any server iframe')
            }

            const metadata = watchDataToMetadata(wd)
            const streamUrl = extracted.stream.url
            const filename = generateFilename(metadata)

            // HLS streams: download all segments, concatenate, and save as .ts.
            if (isHlsUrl(streamUrl)) {
                debug('Downloading HLS stream:', streamUrl)
                btn.textContent = 'HLS...'
                try {
                    const result = await downloadHlsStream({
                        m3u8Url: streamUrl,
                        referer: extracted.iframeUrl,
                        concurrency: 6,
                        onProgress: (loaded, total) => {
                            const pct = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0
                            btn.textContent = `${pct}%`
                        },
                    })
                    const hlsFilename = sanitizeFilename(filename.replace(/\.mp4$/, '') + '.ts')
                    const mode = config.get('hlsSaveMode')
                    let usedStream = false
                    if (mode === 'stream') {
                        const r = await saveHlsStreamToDisk(result, hlsFilename)
                        if (r.ok) {
                            usedStream = true
                        } else {
                            debug(`Stream save ${r.reason} — falling back to Blob`)
                        }
                    }
                    if (!usedStream) {
                        saveHlsAsBlob(result, hlsFilename)
                    }
                    await new Promise<void>(resolve => setTimeout(resolve, 0))
                    if (result.warnings.length > 0) {
                        debug('HLS warnings:', result.warnings)
                    }
                    btn.textContent = usedStream ? 'Saved' : 'Done'
                } catch (err) {
                    btn.textContent = 'Err'
                    debugError('HLS download failed:', err)
                }
                setTimeout(() => { btn.textContent = 'DL'; btn.disabled = false }, 2500)
                return
            }

            debug('Downloading:', filename, 'from', extracted.server)
            await download({
                url: streamUrl,
                filename,
                referer: extracted.iframeUrl,
                onProgress: (pct) => { btn.textContent = `${Math.round(pct)}%` },
                onComplete: () => { btn.textContent = 'Done' },
                onError: (err) => {
                    btn.textContent = 'Err'
                    debugError('Single download error:', err)
                },
            })
        } catch (err) {
            btn.textContent = 'Err'
            debugError('Single DL failed:', err)
        }

        setTimeout(() => { btn.textContent = 'DL'; btn.disabled = false }, 2500)
    })

    target.appendChild(btn)
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings button (fixed bottom-right)
// ─────────────────────────────────────────────────────────────────────────────

function ensureSettingsButton(): void {
    if (document.querySelector('.animehay-dl-settings-btn')) return

    const btn = document.createElement('button')
    btn.className = 'animehay-dl-btn animehay-dl-btn-success animehay-dl-settings-btn'
    btn.textContent = 'Settings'
    btn.style.position = 'fixed'
    btn.style.bottom = '20px'
    btn.style.right = '20px'
    btn.style.zIndex = '9998'

    btn.addEventListener('click', () => showSettingsPanel())
    document.body.appendChild(btn)
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk button — series info pages
// ─────────────────────────────────────────────────────────────────────────────

function ensureSeriesBulkButton(): void {
    if (document.querySelector('.animehay-dl-series-bulk-btn')) return
    if (!isInfoPage()) return

    const host = window.location.hostname
    if (!isAnimehayHost(host)) return

    const anchor = document.querySelector('.wp-info, .movie-info, .info-movie, .wp-bc, main, body') as HTMLElement | null
    if (!anchor) return

    const btn = document.createElement('button')
    btn.className = 'animehay-dl-btn animehay-dl-btn-secondary animehay-dl-series-bulk-btn'
    btn.textContent = 'Bulk Download'
    btn.style.margin = '12px 0'
    btn.style.display = 'inline-block'

    btn.addEventListener('click', () => {
        if (bulkLoading) return
        bulkLoading = true
        const cacheKey = window.location.href
        if (bulkEpisodes.length > 0 && bulkCacheKey === cacheKey) {
            bulkLoading = false
            showBulkPanel()
            return
        }
        showLoadingPanel('Collecting episodes...').then((panel) => {
            collectSeriesEpisodes(window.location.href)
                .then((eps) => {
                    bulkEpisodes = eps
                    bulkCacheKey = cacheKey
                    panel.statusText.textContent = `Found ${bulkEpisodes.length} episodes. Opening panel...`
                    setTimeout(() => {
                        panel.panel.remove()
                        panel.overlay.remove()
                        bulkLoading = false
                        showBulkPanel()
                    }, 400)
                })
                .catch((err) => {
                    const message = err instanceof CrawlerError ? err.message
                        : (err instanceof Error ? err.message : String(err))
                    panel.statusText.textContent = `Error: ${message}`
                    panel.statusText.style.color = '#ff6b6b'
                    panel.closeBtn.disabled = false
                    panel.closeBtn.style.opacity = '1'
                    bulkLoading = false
                })
        })
    })

    anchor.appendChild(btn)
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk checkbox injection — `.wp-ep` items on watch pages
// ─────────────────────────────────────────────────────────────────────────────

function injectCheckboxesIntoEpisodeList(): void {
    if (document.querySelector('.animehay-dl-checkbox-inject')) return
    if (!isWatchPage()) return

    const items = document.querySelectorAll('.wp-eplist .wp-ep')
    items.forEach((anchor) => {
        const href = anchor.getAttribute('href')?.trim() || ''
        if (!href) return
        const no = anchor.getAttribute('data-no')?.trim() || (anchor.textContent || '').trim()
        const idMatch = (anchor.id || '').match(/^wp-ep-(\d+)$/)
        const episodeId = idMatch ? parseInt(idMatch[1], 10) : 0
        const title = anchor.getAttribute('title')?.trim() || (no ? `Tập ${no}` : 'Tập ?')

        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.className = 'animehay-dl-checkbox-inject'
        checkbox.checked = selectedEpisodes.has(href)
        checkbox.title = 'Select for bulk download'
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedEpisodes.set(href, { url: href, title, no, episodeId })
            } else {
                selectedEpisodes.delete(href)
            }
            saveSelectedEpisodes()
            debug('Selected:', selectedEpisodes.size)
        })
        anchor.insertBefore(checkbox, anchor.firstChild)
    })

    // Inject a "Bulk Download" trigger button next to the playlist header so
    // the user can open the bulk panel with the already-checked selections.
    if (!document.querySelector('.animehay-dl-bulk-btn')) {
        const head = document.querySelector('.wp-eplist__head')
        if (head) {
            const trigger = document.createElement('button')
            trigger.className = 'animehay-dl-btn animehay-dl-btn-secondary animehay-dl-bulk-btn'
            trigger.textContent = `Bulk Download (${selectedEpisodes.size})`
            trigger.style.marginLeft = '8px'
            trigger.style.padding = '4px 10px'
            trigger.style.fontSize = '12px'

            trigger.addEventListener('click', () => {
                // On a watch page the playlist is the episode list, so reuse
                // the watch-page parser's episode list as the bulk set.
                const watchHtml = document.documentElement.outerHTML
                const wd = parseWatchPage(watchHtml)
                if (wd.episodes.length === 0) { alert('No episodes found on this page.'); return }
                bulkEpisodes = wd.episodes
                bulkCacheKey = window.location.pathname
                showBulkPanel()
            })

            head.appendChild(trigger)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk panel
// ─────────────────────────────────────────────────────────────────────────────

function showBulkPanel(): void {
    if (bulkPanelOpen) return
    bulkPanelOpen = true

    debug('Bulk episodes:', bulkEpisodes.length, 'Selected:', selectedEpisodes.size)

    const content = document.createElement('div')

    const toolbar = document.createElement('div')
    toolbar.className = 'animehay-dl-toolbar'

    const selectAllBtn = document.createElement('button')
    selectAllBtn.className = 'animehay-dl-btn animehay-dl-btn-primary'
    selectAllBtn.textContent = `Select All (${bulkEpisodes.length})`
    selectAllBtn.addEventListener('click', () => {
        for (const ep of bulkEpisodes) {
            const key = ep.url
            selectedEpisodes.set(key, { url: key, title: ep.title, no: ep.no, episodeId: ep.episodeId })
        }
        saveSelectedEpisodes()
        content.querySelectorAll('input[type="checkbox"]').forEach(cb => { (cb as HTMLInputElement).checked = true })
        downloadSelectedBtn.textContent = `Download Selected (${selectedEpisodes.size})`
    })

    const deselectAllBtn = document.createElement('button')
    deselectAllBtn.className = 'animehay-dl-btn animehay-dl-btn-danger'
    deselectAllBtn.textContent = 'Deselect All'
    deselectAllBtn.addEventListener('click', () => {
        clearSelectedEpisodes()
        content.querySelectorAll('input[type="checkbox"]').forEach(cb => { (cb as HTMLInputElement).checked = false })
        downloadSelectedBtn.textContent = `Download Selected (${selectedEpisodes.size})`
    })

    const downloadSelectedBtn = document.createElement('button')
    downloadSelectedBtn.className = 'animehay-dl-btn animehay-dl-btn-success'
    downloadSelectedBtn.textContent = `Download Selected (${selectedEpisodes.size})`
    downloadSelectedBtn.addEventListener('click', () => { void startBulkDownload() })

    toolbar.appendChild(selectAllBtn)
    toolbar.appendChild(deselectAllBtn)
    toolbar.appendChild(downloadSelectedBtn)

    const copyAllLinksBtn = document.createElement('button')
    copyAllLinksBtn.className = 'animehay-dl-btn animehay-dl-btn-secondary'
    copyAllLinksBtn.textContent = 'Copy All Download Links'
    copyAllLinksBtn.addEventListener('click', () => { void showCopyLinksPanel() })
    toolbar.appendChild(copyAllLinksBtn)
    content.appendChild(toolbar)

    const episodeList = document.createElement('div')
    episodeList.id = 'animehay-dl-episode-list'
    episodeList.style.maxHeight = '50vh'
    episodeList.style.overflowY = 'auto'

    for (let i = 0; i < bulkEpisodes.length; i++) {
        const ep = bulkEpisodes[i]
        const key = ep.url
        const item = document.createElement('div')
        item.className = 'animehay-dl-episode-item'

        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.checked = selectedEpisodes.has(key)
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedEpisodes.set(key, { url: key, title: ep.title, no: ep.no, episodeId: ep.episodeId })
            } else {
                selectedEpisodes.delete(key)
            }
            saveSelectedEpisodes()
            downloadSelectedBtn.textContent = `Download Selected (${selectedEpisodes.size})`
        })

        const noSpan = document.createElement('span')
        noSpan.className = 'episode-no'
        noSpan.textContent = ep.no ? `#${ep.no}` : `#${i + 1}`

        const titleSpan = document.createElement('span')
        titleSpan.className = 'episode-title'
        titleSpan.textContent = ep.title || (ep.no ? `Tập ${ep.no}` : 'Tập ?')

        item.appendChild(checkbox)
        item.appendChild(noSpan)
        item.appendChild(titleSpan)
        episodeList.appendChild(item)
    }
    content.appendChild(episodeList)

    const status = document.createElement('div')
    status.className = 'animehay-dl-status animehay-dl-status-info'
    status.textContent = `Found ${bulkEpisodes.length} episodes. Select the ones you want, then click "Download Selected".`
    content.appendChild(status)

    createPanel('Bulk Download', content, () => { bulkPanelOpen = false })
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy links panel
// ─────────────────────────────────────────────────────────────────────────────

async function showCopyLinksPanel(): Promise<void> {
    const selected = Array.from(selectedEpisodes.values())
    if (selected.length === 0) { alert('No episodes selected. Select episodes first.'); return }
    const { panel, overlay, statusText, closeBtn } = await showLoadingPanel('Fetching download links...')
    closeBtn.disabled = false
    closeBtn.style.opacity = '1'
    const lines: string[] = []
    let found = 0
    const referer = window.location.origin || (window.location.href ? new URL(window.location.href).origin : '')

    for (let i = 0; i < selected.length; i++) {
        const sel = selected[i]
        statusText.textContent = `Fetching link ${i + 1}/${selected.length}: ${sel.title}`
        try {
            const resp = await fetchIframeText(normalizeAnimehayUrl(sel.url, referer), referer)
            if (!resp || resp.status < 200 || resp.status >= 300) {
                lines.push(`# ${sanitizeFilename(sel.title)} - HTTP ${resp?.status ?? 0}`)
                continue
            }
            const wd = parseWatchPage(resp.text)
            const preferred = config.get('preferredSource') || wd.activeServer || 'AHS'
            const extracted = await extractFirstStream(wd.serverMap || {}, preferred, wd.activeServer)
            if (extracted) {
                const u = extracted.stream.url
                if (isHlsUrl(u)) {
                    lines.push(`# HLS stream — use ffmpeg -i "${u}" -c copy "output.mp4"`)
                }
                lines.push(u)
                found++
            } else {
                lines.push(`# ${sanitizeFilename(sel.title)} - NO STREAM FOUND`)
            }
        } catch (err) {
            lines.push(`# ${sanitizeFilename(sel.title)} - ERROR: ${err instanceof Error ? err.message : String(err)}`)
        }
    }

    panel.remove()
    overlay.remove()

    const linkText = lines.join('\n')
    const content = document.createElement('div')
    const desc = document.createElement('p')
    desc.style.fontSize = '12px'
    desc.style.color = '#888'
    desc.textContent = `Found ${found}/${selected.length} download links. HLS streams (m3u8) need ffmpeg/yt-dlp — paste the URL.`
    content.appendChild(desc)

    const textarea = document.createElement('textarea')
    textarea.value = linkText
    textarea.style.width = '100%'
    textarea.style.height = '400px'
    textarea.style.background = '#0a0a14'
    textarea.style.color = '#6bff6b'
    textarea.style.border = '1px solid #333'
    textarea.style.borderRadius = '4px'
    textarea.style.padding = '10px'
    textarea.style.fontFamily = 'monospace'
    textarea.style.fontSize = '11px'
    textarea.style.resize = 'vertical'
    textarea.readOnly = true
    content.appendChild(textarea)

    const btnRow = document.createElement('div')
    btnRow.style.display = 'flex'
    btnRow.style.gap = '8px'
    btnRow.style.marginTop = '12px'

    const copyBtn = document.createElement('button')
    copyBtn.className = 'animehay-dl-btn animehay-dl-btn-primary'
    copyBtn.textContent = 'Copy All Links'
    copyBtn.addEventListener('click', () => {
        textarea.select()
        try {
            document.execCommand('copy')
        } catch {
            // best-effort
        }
        copyBtn.textContent = 'Copied!'
        setTimeout(() => { copyBtn.textContent = 'Copy All Links' }, 2000)
    })
    btnRow.appendChild(copyBtn)

    const txtBtn = document.createElement('button')
    txtBtn.className = 'animehay-dl-btn animehay-dl-btn-success'
    txtBtn.textContent = 'Download as .txt'
    txtBtn.addEventListener('click', () => {
        const blob = new Blob([linkText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'animehay_download_links.txt'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    })
    btnRow.appendChild(txtBtn)

    content.appendChild(btnRow)
    createPanel('Download Links', content)
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress panel
// ─────────────────────────────────────────────────────────────────────────────

interface ProgressPanel {
    update: (current: number, filename: string) => void
    log: (msg: string, type: 'info' | 'success' | 'error') => void
    setItemProgress: (index: number, pct: number) => void
}

function showProgressPanel(total: number, filenames?: string[]): ProgressPanel {
    const content = document.createElement('div')

    const overallBar = document.createElement('div')
    overallBar.className = 'animehay-dl-progress-bar'
    const overallFill = document.createElement('div')
    overallFill.className = 'animehay-dl-progress-fill'
    overallFill.style.width = '0%'
    overallFill.textContent = '0/0'
    overallBar.appendChild(overallFill)
    content.appendChild(overallBar)

    const statusText = document.createElement('div')
    statusText.className = 'animehay-dl-status animehay-dl-status-info'
    statusText.textContent = 'Starting...'
    content.appendChild(statusText)

    const itemsContainer = document.createElement('div')
    itemsContainer.id = 'animehay-dl-items-container'
    itemsContainer.style.maxHeight = '30vh'
    itemsContainer.style.overflowY = 'auto'
    itemsContainer.style.marginBottom = '12px'

    const list = filenames || []
    for (let i = 0; i < list.length; i++) {
        const row = document.createElement('div')
        row.style.display = 'flex'
        row.style.alignItems = 'center'
        row.style.gap = '8px'
        row.style.marginBottom = '4px'

        const label = document.createElement('span')
        label.style.fontSize = '12px'
        label.style.minWidth = '30px'
        label.style.color = '#888'
        label.textContent = `#${i + 1}`

        const bar = document.createElement('div')
        bar.className = 'animehay-dl-progress-bar'
        bar.style.flex = '1'
        bar.style.margin = '0'
        bar.style.height = '18px'

        const fill = document.createElement('div')
        fill.className = 'animehay-dl-progress-fill'
        fill.style.width = '0%'
        fill.style.fontSize = '10px'
        fill.textContent = '0%'
        fill.id = `animehay-dl-fill-${i}`
        bar.appendChild(fill)

        const name = document.createElement('span')
        name.style.fontSize = '11px'
        name.style.color = '#aaa'
        name.style.maxWidth = '200px'
        name.style.overflow = 'hidden'
        name.style.textOverflow = 'ellipsis'
        name.style.whiteSpace = 'nowrap'
        name.textContent = list[i] || ''

        row.appendChild(label)
        row.appendChild(bar)
        row.appendChild(name)
        itemsContainer.appendChild(row)
    }
    content.appendChild(itemsContainer)

    const logDiv = document.createElement('div')
    logDiv.className = 'animehay-dl-log'
    content.appendChild(logDiv)

    createPanel('Download Progress', content)

    return {
        update: (current, _filename) => {
            const pct = Math.round((current / total) * 100)
            overallFill.style.width = `${pct}%`
            overallFill.textContent = `${current}/${total}`
            statusText.textContent = `Completed: ${current}/${total}`
        },
        log: (msg, type) => {
            const entry = document.createElement('div')
            entry.className = `animehay-dl-log-entry ${type}`
            entry.textContent = msg
            logDiv.appendChild(entry)
            logDiv.scrollTop = logDiv.scrollHeight
            debug(`[${type}]`, msg)
        },
        setItemProgress: (index, pct) => {
            const fill = document.getElementById(`animehay-dl-fill-${index}`)
            if (fill) {
                fill.style.width = `${Math.round(pct)}%`
                fill.textContent = `${Math.round(pct)}%`
            }
        },
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk download — fetch each watch page, extract stream URL, queue, process
// ─────────────────────────────────────────────────────────────────────────────

async function fetchEpisodeStream(sel: SelectedEpisode, referer: string): Promise<{
    streamUrl: string
    wd: AnimehayWatchData
} | null> {
    const pageUrl = normalizeAnimehayUrl(sel.url, referer)
    const pageResp = await fetchIframeText(pageUrl, referer)
    if (!pageResp || pageResp.status < 200 || pageResp.status >= 300) return null
    const wd = parseWatchPage(pageResp.text)
    if (!wd.serverMap || Object.keys(wd.serverMap).length === 0) return null
    const preferred = config.get('preferredSource') || wd.activeServer || 'AHS'
    const extracted = await extractFirstStream(wd.serverMap, preferred, wd.activeServer)
    if (!extracted) return null
    return { streamUrl: extracted.stream.url, wd }
}

async function startBulkDownload(): Promise<void> {
    if (selectedEpisodes.size === 0) return

    const items = Array.from(selectedEpisodes.values())
    const totalItems = items.length
    const { log } = showProgressPanel(totalItems)
    log(`Preparing ${totalItems} episodes...`, 'info')

    downloadQueue.clear()
    downloadQueue.setBulkMode(true)

    // Phase 1: Resolve all stream URLs only — no downloads yet.
    // HLS and non-HLS items go into a single list so the progress panel
    // shows EVERYTHING with per-file progress bars, matching Ohentai's UX.
    const prepared: Array<{
        title: string
        filename: string
        streamUrl: string
        referer: string
        episodeNumber: number
        isHls: boolean
    }> = []
    const referer = window.location.origin || (window.location.href ? new URL(window.location.href).origin : '')
    const concurrency = Math.max(config.get('concurrentVideos'), 1)
    let cursor = 0
    const resolveWorker = async (): Promise<void> => {
        while (cursor < items.length) {
            const idx = cursor++
            const sel = items[idx]
            log(`  Resolving ${idx + 1}/${totalItems}: ${sel.title}`, 'info')
            try {
                const result = await fetchEpisodeStream(sel, referer)
                if (!result) {
                    log(`  No stream for: ${sel.title}`, 'error')
                    continue
                }
                const wd = result.wd
                const num = parseInt(sel.no, 10) || parseInt(wd.episode_no, 10) || 0
                const metadata = watchDataToMetadata(wd, num)
                const filename = generateFilename(metadata, num || undefined)

                prepared.push({
                    title: sel.title,
                    filename,
                    streamUrl: result.streamUrl,
                    referer: referer,
                    episodeNumber: num || idx + 1,
                    isHls: isHlsUrl(result.streamUrl),
                })
                log(`  OK: ${sel.title}`, 'success')
            } catch (err) {
                log(`  Error: ${err instanceof Error ? err.message : String(err)}`, 'error')
            }
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => resolveWorker()))

    if (prepared.length === 0) {
        log('No streams resolved — aborting.', 'error')
        return
    }

    // Sort by episode number ascending so the queue runs in narrative order.
    prepared.sort((a, b) => a.episodeNumber - b.episodeNumber)

    // Phase 2: Single progress panel with ALL items (HLS + non-HLS)
    // The DownloadQueue.processOne() now handles both types transparently.
    const filenames = prepared.map(p => p.filename)
    const { update, log: plog, setItemProgress } = showProgressPanel(prepared.length, filenames)

    for (let i = 0; i < prepared.length; i++) {
        const p = prepared[i]
        downloadQueue.add({
            url: p.streamUrl,
            filename: p.filename,
            referer: p.referer,
            episodeNumber: p.episodeNumber || i + 1,
            isHls: p.isHls,
        })
        downloadQueue.setItemProgressCallback(i, (pct) => setItemProgress(i, pct))
    }
    downloadQueue.setProgressCallback((current, total, filename) => update(current, filename))
    downloadQueue.setLogCallback(plog)
    await downloadQueue.process()
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings panel
// ─────────────────────────────────────────────────────────────────────────────

type ConfigKey =
    | 'downloadMethod'
    | 'filenameTemplate'
    | 'tagSeparator'
    | 'preferredSource'
    | 'concurrentVideos'
    | 'downloadDelay'
    | 'aria2RpcUrl'
    | 'aria2Secret'
    | 'saveMetadata'
    | 'debug'
    | 'customCookies'
    | 'maxBrowserBlobMb'
    | 'chunksPerVideo'
    | 'hlsSaveMode'

interface SettingSpec {
    key: ConfigKey
    label: string
    type: 'text' | 'number' | 'checkbox' | 'select'
    options?: string[]
}

const SETTINGS: SettingSpec[] = [
    { key: 'downloadMethod', label: 'Download Method', type: 'select', options: ['browser', 'gm_download', 'aria2', 'direct', 'others'] },
    { key: 'filenameTemplate', label: 'Filename Template', type: 'text' },
    { key: 'tagSeparator', label: 'Tag Separator', type: 'text' },
    { key: 'preferredSource', label: 'Preferred Source', type: 'text' },
    { key: 'concurrentVideos', label: 'Concurrent Videos', type: 'number' },
    { key: 'downloadDelay', label: 'Delay (ms)', type: 'number' },
    { key: 'aria2RpcUrl', label: 'Aria2 RPC URL', type: 'text' },
    { key: 'aria2Secret', label: 'Aria2 Secret', type: 'text' },
    { key: 'saveMetadata', label: 'Save Metadata JSON', type: 'checkbox' },
    { key: 'debug', label: 'Debug Mode', type: 'checkbox' },
    { key: 'maxBrowserBlobMb', label: 'Max Browser Blob (MB)', type: 'number' },
    { key: 'chunksPerVideo', label: 'Chunks Per Video (aria2)', type: 'number' },
    { key: 'hlsSaveMode', label: 'HLS Save Mode', type: 'select', options: ['blob', 'stream'] },
]

function showSettingsPanel(): void {
    if (settingsPanelOpen) return
    settingsPanelOpen = true

    const content = document.createElement('div')

    const helpTop = document.createElement('div')
    helpTop.style.fontSize = '11px'
    helpTop.style.color = '#666'
    helpTop.style.marginBottom = '8px'
    helpTop.innerHTML = 'Default template: <code style="color:#4a90d9">[%number%] %title%</code><br>Available: %title% %series% %number% %episode_no% %movie_id% %episode_id% %download-date%'
    content.appendChild(helpTop)

    const helpHls = document.createElement('div')
    helpHls.style.fontSize = '11px'
    helpHls.style.color = '#666'
    helpHls.style.marginBottom = '8px'
    helpHls.innerHTML = '<strong>HLS Save Mode</strong>: <code style="color:#4a90d9">blob</code> = in-memory (universal). <code style="color:#4a90d9">stream</code> = write directly to disk via File System Access API (Chromium only, lower peak RAM, will prompt for a save location). Falls back to Blob automatically when unsupported/cancelled.'
    content.appendChild(helpHls)

    for (const setting of SETTINGS) {
        const row = document.createElement('div')
        row.className = 'animehay-dl-settings-row'

        const label = document.createElement('label')
        label.textContent = setting.label

        let input: HTMLInputElement | HTMLSelectElement
        if (setting.type === 'select') {
            input = document.createElement('select')
            const current = String(config.get(setting.key))
            for (const opt of setting.options || []) {
                const option = document.createElement('option')
                option.value = opt
                option.textContent = opt
                if (opt === current) option.selected = true
                input.appendChild(option)
            }
        } else {
            input = document.createElement('input')
            if (setting.type === 'checkbox') {
                input.type = 'checkbox'
                ;(input as HTMLInputElement).checked = Boolean(config.get(setting.key))
            } else if (setting.type === 'number') {
                input.type = 'number'
                ;(input as HTMLInputElement).value = String(config.get(setting.key) ?? 0)
            } else {
                input.type = 'text'
                ;(input as HTMLInputElement).value = String(config.get(setting.key) ?? '')
            }
        }

        input.addEventListener('change', () => {
            const raw: unknown = setting.type === 'checkbox'
                ? (input as HTMLInputElement).checked
                : setting.type === 'number'
                    ? parseInt((input as HTMLInputElement).value, 10)
                    : (input as HTMLInputElement).value
            // The SETTINGS table is the single source of truth and every key
            // in it is guaranteed to live on ConfigData, so this cast is safe.
            ;(config.set as (k: string, v: unknown) => void)(setting.key, raw)
        })

        row.appendChild(label)
        row.appendChild(input)
        content.appendChild(row)
    }

    // Cookie import section
    const cookieSection = document.createElement('div')
    cookieSection.style.marginTop = '16px'
    cookieSection.style.paddingTop = '12px'
    cookieSection.style.borderTop = '1px solid #333'

    const cookieTitle = document.createElement('h3')
    cookieTitle.textContent = 'Cookie Import'
    cookieTitle.style.fontSize = '14px'
    cookieTitle.style.color = '#4a90d9'
    cookieTitle.style.marginBottom = '8px'
    cookieSection.appendChild(cookieTitle)

    const cookieDesc = document.createElement('p')
    cookieDesc.style.fontSize = '12px'
    cookieDesc.style.color = '#888'
    cookieDesc.style.marginBottom = '8px'
    cookieDesc.textContent = 'Import cookies from J2Team (JSON) or Get Cookies.txt LOCALE (TXT) to bypass Cloudflare on mirror hops.'
    cookieSection.appendChild(cookieDesc)

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.json,.txt'
    fileInput.style.marginBottom = '8px'
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0]
        if (!file) return
        try {
            const text = await file.text()
            const cookies = importCookiesFromText(text, file.name)
            if (cookies) {
                config.set('customCookies', cookies)
                cookieStatus.textContent = `Imported: ${cookies.length} chars`
                cookieStatus.style.color = '#6bff6b'
            } else {
                cookieStatus.textContent = 'No valid cookies found'
                cookieStatus.style.color = '#ff6b6b'
            }
        } catch (err) {
            cookieStatus.textContent = 'Error: ' + (err instanceof Error ? err.message : String(err))
            cookieStatus.style.color = '#ff6b6b'
        }
    })
    cookieSection.appendChild(fileInput)

    const cookieStatus = document.createElement('div')
    cookieStatus.style.fontSize = '12px'
    cookieStatus.style.marginTop = '4px'
    const savedCookies = config.get('customCookies')
    cookieStatus.textContent = savedCookies ? `Saved: ${savedCookies.length} chars` : 'No cookies saved'
    cookieStatus.style.color = savedCookies ? '#6bff6b' : '#888'
    cookieSection.appendChild(cookieStatus)

    const clearCookieBtn = document.createElement('button')
    clearCookieBtn.className = 'animehay-dl-btn animehay-dl-btn-danger'
    clearCookieBtn.textContent = 'Clear Cookies'
    clearCookieBtn.style.marginTop = '4px'
    clearCookieBtn.style.fontSize = '12px'
    clearCookieBtn.style.padding = '4px 8px'
    clearCookieBtn.addEventListener('click', () => {
        config.set('customCookies', '')
        cookieStatus.textContent = 'Cleared'
        cookieStatus.style.color = '#888'
    })
    cookieSection.appendChild(clearCookieBtn)
    content.appendChild(cookieSection)

    const resetBtn = document.createElement('button')
    resetBtn.className = 'animehay-dl-btn animehay-dl-btn-danger'
    resetBtn.textContent = 'Reset to Defaults'
    resetBtn.style.marginTop = '16px'
    resetBtn.addEventListener('click', () => {
        config.reset()
        settingsPanelOpen = false
        // Re-open so the user sees the cleared state.
        const panel = document.querySelector('.animehay-dl-panel')
        const overlay = document.querySelector('.animehay-dl-overlay')
        if (panel) panel.remove()
        if (overlay) overlay.remove()
        showSettingsPanel()
    })
    content.appendChild(resetBtn)

    const helpText = document.createElement('div')
    helpText.style.marginTop = '16px'
    helpText.style.fontSize = '12px'
    helpText.style.color = '#888'
    helpText.innerHTML = `
        <strong>Template Variables:</strong><br>
        %title% %series% %number% %episode_no% %movie_id% %episode_id% %download-date%<br>
        <strong>Number:</strong> Lowest episode = 001, highest = NNN.
    `
    content.appendChild(helpText)

    createPanel('Settings', content, () => { settingsPanelOpen = false })
}

// ─────────────────────────────────────────────────────────────────────────────
// Observers + lifecycle — re-inject when the host SPA re-renders
// ─────────────────────────────────────────────────────────────────────────────

function setupObservers(): void {
    const debouncedHandler = debounce(() => {
        if (isWatchPage()) {
            ensureSingleDownloadButton()
            injectCheckboxesIntoEpisodeList()
        }
        if (isInfoPage()) {
            ensureSeriesBulkButton()
        }
    }, 500)

    const observer = new MutationObserver(debouncedHandler)
    observer.observe(document.body, { childList: true, subtree: true })

    const originalPushState = history.pushState.bind(history)
    history.pushState = function(...args) { originalPushState(...args); setTimeout(onPageChange, 300) }

    const originalReplaceState = history.replaceState.bind(history)
    history.replaceState = function(...args) { originalReplaceState(...args); setTimeout(onPageChange, 300) }

    window.addEventListener('popstate', () => onPageChange())
}

function onPageChange(): void {
    debug('Page changed:', window.location.href)
    document.querySelectorAll(
        '.animehay-dl-single-btn, .animehay-dl-bulk-btn, .animehay-dl-series-bulk-btn, .animehay-dl-checkbox-inject',
    ).forEach(el => el.remove())
    bulkPanelOpen = false
    settingsPanelOpen = false
    if (bulkCacheKey !== window.location.pathname) {
        bulkEpisodes = []
        bulkCacheKey = ''
    }
    loadSelectedEpisodes()

    if (isWatchPage()) {
        ensureSingleDownloadButton()
        injectCheckboxesIntoEpisodeList()
    }
    if (isInfoPage()) {
        ensureSeriesBulkButton()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

function mount(): void {
    debug('Mounting', window.location.href)

    injectStyles()
    loadSelectedEpisodes()
    ensureSettingsButton()

    if (isWatchPage()) {
        ensureSingleDownloadButton()
        injectCheckboxesIntoEpisodeList()
    }
    if (isInfoPage()) {
        ensureSeriesBulkButton()
    }

    setupObservers()

    debug('Mount complete')
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount)
} else {
    mount()
}

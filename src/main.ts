import { config } from './config'
import { delay, sanitizeFilename, debounce, LooseObject, VideoInfo, CrawlResult } from './env'
import { download } from './downloader'
import { extractStreamsFromPage, Stream } from './extractor'
import { extractMetadata, Metadata } from './metadata'
import { generateFilename } from './filename'
import { crawlTagPage, crawlSeriesPage, crawlAllTagPages } from './crawler'

const CSS = `
.ohentai-dl-btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 8px 16px; margin: 4px; border: none; border-radius: 4px;
    cursor: pointer; font-size: 14px; font-weight: bold; color: #fff;
    transition: opacity 0.2s; text-decoration: none;
}
.ohentai-dl-btn:hover { opacity: 0.85; }
.ohentai-dl-btn-primary { background-color: #ff6b35; }
.ohentai-dl-btn-secondary { background-color: #4a90d9; }
.ohentai-dl-btn-success { background-color: #28a745; }
.ohentai-dl-btn-danger { background-color: #dc3545; }
.ohentai-dl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ohentai-dl-panel {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: #1a1a2e; border: 2px solid #4a90d9; border-radius: 8px;
    padding: 20px; max-width: 800px; width: 90%; max-height: 80vh;
    overflow-y: auto; z-index: 10000; color: #e0e0e0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
.ohentai-dl-panel-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #333;
}
.ohentai-dl-panel-header h2 { margin: 0; font-size: 20px; color: #4a90d9; }
.ohentai-dl-panel-close {
    background: none; border: none; color: #e0e0e0; font-size: 24px; cursor: pointer; padding: 0 4px;
}
.ohentai-dl-panel-close:hover { color: #ff6b35; }
.ohentai-dl-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.7); z-index: 9999;
}
.ohentai-dl-video-item {
    display: flex; align-items: center; padding: 8px; margin: 4px 0;
    background: #16213e; border-radius: 4px; gap: 12px;
}
.ohentai-dl-video-item:hover { background: #1a2744; }
.ohentai-dl-video-item input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
.ohentai-dl-video-item .video-title { flex: 1; font-size: 14px; }
.ohentai-dl-video-item .video-ep { font-size: 12px; color: #888; min-width: 40px; text-align: right; }
.ohentai-dl-progress-bar {
    width: 100%; height: 24px; background: #16213e; border-radius: 12px;
    overflow: hidden; margin: 12px 0;
}
.ohentai-dl-progress-fill {
    height: 100%; background: linear-gradient(90deg, #4a90d9, #ff6b35);
    transition: width 0.3s; display: flex; align-items: center;
    justify-content: center; color: #fff; font-size: 12px; font-weight: bold;
}
.ohentai-dl-settings-row {
    display: flex; align-items: center; margin: 12px 0; gap: 12px;
}
.ohentai-dl-settings-row label { min-width: 140px; font-size: 14px; color: #b0b0b0; }
.ohentai-dl-settings-row input[type="text"],
.ohentai-dl-settings-row input[type="number"],
.ohentai-dl-settings-row select {
    flex: 1; padding: 6px 10px; background: #16213e; border: 1px solid #333;
    border-radius: 4px; color: #e0e0e0; font-size: 14px;
}
.ohentai-dl-settings-row input[type="checkbox"] { width: 18px; height: 18px; }
.ohentai-dl-status { padding: 8px 12px; margin: 8px 0; border-radius: 4px; font-size: 14px; }
.ohentai-dl-status-info { background: #1a2744; border-left: 4px solid #4a90d9; }
.ohentai-dl-status-success { background: #1a3a2a; border-left: 4px solid #28a745; }
.ohentai-dl-status-error { background: #3a1a1a; border-left: 4px solid #dc3545; }
.ohentai-dl-checkbox-inject {
    position: absolute; top: 8px; left: 8px; width: 24px; height: 24px;
    z-index: 100; cursor: pointer;
}
.ohentai-dl-download-btn-card {
    position: absolute; bottom: 8px; right: 8px; padding: 4px 12px;
    background: #ff6b35; color: #fff; border: none; border-radius: 4px;
    cursor: pointer; font-size: 12px; font-weight: bold; z-index: 100;
    min-width: 50px; text-align: center;
}
.ohentai-dl-download-btn-card:hover { background: #e55a2b; }
.ohentai-dl-toolbar { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
.ohentai-dl-log {
    max-height: 200px; overflow-y: auto; background: #0a0a14; padding: 8px;
    border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 12px;
}
.ohentai-dl-log-entry { padding: 2px 0; border-bottom: 1px solid #222; }
.ohentai-dl-log-entry.error { color: #ff6b6b; }
.ohentai-dl-log-entry.success { color: #6bff6b; }
.ohentai-dl-log-entry.info { color: #6bb5ff; }
`

function debug(...args: unknown[]): void {
    if (config.get('debug')) console.log('[OhentaiDL]', ...args)
}

function debugError(...args: unknown[]): void {
    console.error('[OhentaiDL]', ...args)
}

// ==================== Download Queue with concurrency ====================

class DownloadQueue {
    private queue: Array<{ url: string; filename: string; referer: string; episodeNumber: number; queueIndex: number }> = []
    private processing = false
    private progressCallback: ((current: number, total: number, filename: string) => void) | null = null
    private logCallback: ((message: string, type: 'info' | 'success' | 'error') => void) | null = null
    private itemProgressCallbacks = new Map<number, (pct: number) => void>()
    private nextIndex = 0

    add(item: { url: string; filename: string; referer: string; episodeNumber: number }): void {
        this.queue.push({ ...item, queueIndex: this.nextIndex++ })
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

    async process(): Promise<void> {
        if (this.processing || this.queue.length === 0) return
        this.processing = true

        const total = this.queue.length
        const concurrency = Math.min(Math.max(config.get('concurrentVideos'), 1), this.queue.length)
        let completed = 0
        let nextToStart = 0

        const processOne = async (item: typeof this.queue[0]): Promise<void> => {
            const idx = item.queueIndex
            this.logCallback?.(`[${idx + 1}/${total}] Downloading: ${item.filename}`, 'info')
            debug(`[${idx + 1}]`, item.url.substring(0, 80))

            try {
                await download({
                    url: item.url,
                    filename: item.filename,
                    referer: item.referer,
                    onProgress: (p) => {
                        this.itemProgressCallbacks.get(idx)?.(p)
                    },
                    onComplete: () => {
                        this.logCallback?.(`[${idx + 1}/${total}] Complete: ${item.filename}`, 'success')
                    },
                    onError: (err) => {
                        this.logCallback?.(`[${idx + 1}/${total}] Error: ${err.message}`, 'error')
                    },
                })
            } catch (error) {
                this.logCallback?.(`[${idx + 1}/${total}] Failed: ${error instanceof Error ? error.message : String(error)}`, 'error')
            }

            completed++
            this.progressCallback?.(completed, total, item.filename)
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

    clear(): void {
        this.queue = []
        this.processing = false
        this.itemProgressCallbacks.clear()
        this.nextIndex = 0
    }

    get length(): number { return this.queue.length }
}

const downloadQueue = new DownloadQueue()

// ==================== State ====================

const selectedVideos = new Map<string, { vid: string; title: string; pageUrl: string }>()
let bulkVideos: Array<{ vid: string; title: string; pageUrl: string; thumbnail: string; tags: string[]; series: string }> = []
let bulkPanelOpen = false
let settingsPanelOpen = false
let bulkLoading = false

// ==================== UI Components ====================

function injectStyles(): void {
    if (document.getElementById('ohentai-dl-styles')) return
    const style = document.createElement('style')
    style.id = 'ohentai-dl-styles'
    style.textContent = CSS
    document.head.appendChild(style)
}

function createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div')
    overlay.className = 'ohentai-dl-overlay'
    overlay.addEventListener('click', () => overlay.remove())
    return overlay
}

function createPanel(title: string, content: HTMLElement, onClosed?: () => void): HTMLDivElement {
    const existingOverlay = document.querySelector('.ohentai-dl-overlay')
    const existingPanel = document.querySelector('.ohentai-dl-panel')
    if (existingOverlay) existingOverlay.remove()
    if (existingPanel) existingPanel.remove()

    const panel = document.createElement('div')
    panel.className = 'ohentai-dl-panel'

    const header = document.createElement('div')
    header.className = 'ohentai-dl-panel-header'
    const h2 = document.createElement('h2')
    h2.textContent = title
    const closeBtn = document.createElement('button')
    closeBtn.className = 'ohentai-dl-panel-close'
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

// ==================== Ad Video Filter ====================

function isAdVideo(meta: Metadata, expectedTags: string[], expectedSeries: string): boolean {
    if (expectedSeries && meta.series && meta.series !== expectedSeries) {
        return true
    }
    if (expectedTags.length > 0 && meta.tags.length > 0) {
        const hasMatchingTag = meta.tags.some(t => expectedTags.includes(t))
        if (!hasMatchingTag) return true
    }
    return false
}

// ==================== Download Button ====================

function ensureDownloadButton(streams: Stream[], metadata: Metadata): void {
    if (document.querySelector('.ohentai-dl-single-btn')) return

    const downloadBtn = document.querySelector('.downloadbutton')
    if (!downloadBtn) return

    debug('Streams:', streams.length, 'Title:', metadata.title)

    const btn = document.createElement('button')
    btn.className = 'ohentai-dl-btn ohentai-dl-btn-primary ohentai-dl-single-btn'
    btn.textContent = 'DL'
    btn.style.marginLeft = '8px'
    btn.style.verticalAlign = 'middle'

    btn.addEventListener('click', async () => {
        btn.disabled = true

        const preferredSource = config.get('preferredSource')
        let stream = streams.find(s => s.source === preferredSource) || streams[0]
        if (!stream) {
            btn.textContent = 'No stream'
            setTimeout(() => { btn.textContent = 'DL'; btn.disabled = false }, 2000)
            return
        }

        const filename = generateFilename(metadata)
        debug('Downloading:', filename)

        downloadQueue.clear()
        downloadQueue.add({ url: stream.url, filename, referer: 'https://ohentai.org/', episodeNumber: metadata.episodeNumber })
        downloadQueue.setItemProgressCallback(0, (pct) => {
            btn.textContent = `${Math.round(pct)}%`
        })
        downloadQueue.setLogCallback((msg, type) => console.log(`[OhentaiDL][${type}]`, msg))

        await downloadQueue.process()

        btn.textContent = 'Done'
        setTimeout(() => { btn.textContent = 'DL'; btn.disabled = false }, 2000)
    })

    downloadBtn.parentNode?.insertBefore(btn, downloadBtn.nextSibling)
}

function ensureBulkButton(): void {
    if (document.querySelector('.ohentai-dl-bulk-btn')) return

    const isTagPage = window.location.pathname.includes('tagsearch.php')
    const isSeriesPage = window.location.pathname.includes('sery_video.php')
    const isSearchPage = window.location.pathname.includes('search.php')
    if (!isTagPage && !isSeriesPage && !isSearchPage) return

    const container = document.querySelector('.videolistcontainer, .videoseryconatiner, .searchresultcontainer')
    if (!container) return

    const btn = document.createElement('button')
    btn.className = 'ohentai-dl-btn ohentai-dl-btn-secondary ohentai-dl-bulk-btn'
    btn.textContent = 'Bulk Download'
    btn.style.marginBottom = '16px'
    btn.style.display = 'inline-block'

    btn.addEventListener('click', () => {
        if (bulkLoading) return
        bulkLoading = true
        loadBulkVideos().then(() => {
            bulkLoading = false
            showBulkPanel()
        }).catch(err => {
            debugError('Failed to load bulk videos:', err)
            bulkLoading = false
        })
    })

    container.insertBefore(btn, container.firstChild)
}

function ensureSettingsButton(): void {
    if (document.querySelector('.ohentai-dl-settings-btn')) return

    const btn = document.createElement('button')
    btn.className = 'ohentai-dl-btn ohentai-dl-btn-success ohentai-dl-settings-btn'
    btn.textContent = 'Settings'
    btn.style.position = 'fixed'
    btn.style.bottom = '20px'
    btn.style.right = '20px'
    btn.style.zIndex = '9998'

    btn.addEventListener('click', () => showSettingsPanel())
    document.body.appendChild(btn)
}

function injectCheckboxesToVideoCards(): void {
    if (document.querySelector('.ohentai-dl-checkbox-inject')) return

    const bricks = document.querySelectorAll('.videobrick')
    debug('Found', bricks.length, 'video bricks')

    bricks.forEach((brick) => {
        const link = brick.querySelector('.videotitle a, a[href*="detail.php?vid="]')
        if (!link) return

        const href = link.getAttribute('href') || ''
        const vidMatch = href.match(/vid=([^&]+)/)
        if (!vidMatch) return

        const vid = vidMatch[1]
        const title = link.textContent?.trim() || ''

        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.className = 'ohentai-dl-checkbox-inject'
        checkbox.checked = selectedVideos.has(vid)
        checkbox.title = 'Select for bulk download'

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                selectedVideos.set(vid, { vid, title, pageUrl: href.startsWith('http') ? href : `https://ohentai.org/${href}` })
            } else {
                selectedVideos.delete(vid)
            }
            debug('Selected:', selectedVideos.size)
        })

        ;(brick as HTMLElement).style.position = 'relative'
        brick.appendChild(checkbox)

        const dlBtn = document.createElement('button')
        dlBtn.className = 'ohentai-dl-download-btn-card'
        dlBtn.textContent = 'DL'
        dlBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            dlBtn.disabled = true

            try {
                const pageUrl = href.startsWith('http') ? href : `https://ohentai.org/${href}`
                const html = await fetch(pageUrl, { headers: { Referer: 'https://ohentai.org/' } }).then(r => r.text())
                const parser = new DOMParser()
                const doc = parser.parseFromString(html, 'text/html')

                const streams = extractStreamsFromPage(doc)
                const meta = extractMetadataFromDoc(doc)

                if (streams.length > 0 && meta) {
                    const preferredSource = config.get('preferredSource')
                    const stream = streams.find(s => s.source === preferredSource) || streams[0]
                    const filename = generateFilename(meta)

                    debug('Downloading:', filename)
                    downloadQueue.clear()
                    downloadQueue.add({ url: stream.url, filename, referer: 'https://ohentai.org/', episodeNumber: meta.episodeNumber })
                    downloadQueue.setItemProgressCallback(0, (pct) => {
                        dlBtn.textContent = `${Math.round(pct)}%`
                    })
                    downloadQueue.setLogCallback((msg, type) => console.log(`[OhentaiDL][${type}]`, msg))
                    await downloadQueue.process()
                    dlBtn.textContent = 'OK'
                } else {
                    debugError('No streams/metadata for:', title)
                    dlBtn.textContent = 'ERR'
                }
            } catch (err) {
                debugError('Card download error:', err)
                dlBtn.textContent = 'ERR'
            }

            setTimeout(() => { dlBtn.textContent = 'DL'; dlBtn.disabled = false }, 3000)
        })

        brick.appendChild(dlBtn)
    })
}

// ==================== Panels ====================

function showBulkPanel(): void {
    if (bulkPanelOpen) return
    bulkPanelOpen = true

    debug('Bulk videos:', bulkVideos.length, 'Selected:', selectedVideos.size)

    const content = document.createElement('div')

    const toolbar = document.createElement('div')
    toolbar.className = 'ohentai-dl-toolbar'

    const selectAllBtn = document.createElement('button')
    selectAllBtn.className = 'ohentai-dl-btn ohentai-dl-btn-primary'
    selectAllBtn.textContent = `Select All (${bulkVideos.length})`
    selectAllBtn.addEventListener('click', () => {
        bulkVideos.forEach(v => selectedVideos.set(v.vid, v))
        content.querySelectorAll('input[type="checkbox"]').forEach(cb => (cb as HTMLInputElement).checked = true)
        downloadSelectedBtn.textContent = `Download Selected (${selectedVideos.size})`
    })

    const deselectAllBtn = document.createElement('button')
    deselectAllBtn.className = 'ohentai-dl-btn ohentai-dl-btn-danger'
    deselectAllBtn.textContent = 'Deselect All'
    deselectAllBtn.addEventListener('click', () => {
        selectedVideos.clear()
        content.querySelectorAll('input[type="checkbox"]').forEach(cb => (cb as HTMLInputElement).checked = false)
        downloadSelectedBtn.textContent = `Download Selected (${selectedVideos.size})`
    })

    const downloadSelectedBtn = document.createElement('button')
    downloadSelectedBtn.className = 'ohentai-dl-btn ohentai-dl-btn-success'
    downloadSelectedBtn.textContent = `Download Selected (${selectedVideos.size})`
    downloadSelectedBtn.addEventListener('click', () => startBulkDownload())

    toolbar.appendChild(selectAllBtn)
    toolbar.appendChild(deselectAllBtn)
    toolbar.appendChild(downloadSelectedBtn)
    content.appendChild(toolbar)

    const videoList = document.createElement('div')
    videoList.id = 'ohentai-dl-video-list'
    videoList.style.maxHeight = '50vh'
    videoList.style.overflowY = 'auto'

    for (let i = 0; i < bulkVideos.length; i++) {
        const video = bulkVideos[i]
        const item = document.createElement('div')
        item.className = 'ohentai-dl-video-item'

        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.checked = selectedVideos.has(video.vid)
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) selectedVideos.set(video.vid, video)
            else selectedVideos.delete(video.vid)
            downloadSelectedBtn.textContent = `Download Selected (${selectedVideos.size})`
        })

        const epSpan = document.createElement('span')
        epSpan.className = 'video-ep'
        epSpan.textContent = `#${i + 1}`

        const titleSpan = document.createElement('span')
        titleSpan.className = 'video-title'
        titleSpan.textContent = video.title

        item.appendChild(checkbox)
        item.appendChild(epSpan)
        item.appendChild(titleSpan)
        videoList.appendChild(item)
    }

    content.appendChild(videoList)

    const status = document.createElement('div')
    status.className = 'ohentai-dl-status ohentai-dl-status-info'
    status.textContent = `Found ${bulkVideos.length} videos. Oldest=#1, Newest=#${bulkVideos.length}.`
    content.appendChild(status)

    createPanel('Bulk Download', content, () => { bulkPanelOpen = false })
}

function showSettingsPanel(): void {
    if (settingsPanelOpen) return
    settingsPanelOpen = true

    const content = document.createElement('div')

    const settings = [
        { key: 'downloadMethod', label: 'Download Method', type: 'select', options: ['browser', 'gm_download', 'aria2', 'others'] },
        { key: 'filenameTemplate', label: 'Filename Template', type: 'text' },
        { key: 'tagSeparator', label: 'Tag Separator', type: 'text' },
        { key: 'preferredSource', label: 'Preferred Source', type: 'text' },
        { key: 'chunksPerVideo', label: 'Chunks per Video', type: 'number' },
        { key: 'concurrentVideos', label: 'Concurrent Videos', type: 'number' },
        { key: 'downloadDelay', label: 'Delay (ms)', type: 'number' },
        { key: 'aria2RpcUrl', label: 'Aria2 RPC URL', type: 'text' },
        { key: 'aria2Secret', label: 'Aria2 Secret', type: 'text' },
        { key: 'saveMetadata', label: 'Save Metadata JSON', type: 'checkbox' },
        { key: 'debug', label: 'Debug Mode', type: 'checkbox' },
    ]

    const helpTop = document.createElement('div')
    helpTop.style.fontSize = '11px'
    helpTop.style.color = '#666'
    helpTop.style.marginBottom = '8px'
    helpTop.innerHTML = 'Default: <code style="color:#4a90d9">[%number%] %title%</code><br>Available: %title% %artist% %series% %tags% %publish-date% %last-updated% %download-date% %number% %vid%'
    content.appendChild(helpTop)

    for (const setting of settings) {
        const row = document.createElement('div')
        row.className = 'ohentai-dl-settings-row'

        const label = document.createElement('label')
        label.textContent = setting.label

        let input: HTMLInputElement | HTMLSelectElement

        if (setting.type === 'select') {
            input = document.createElement('select')
            for (const opt of setting.options!) {
                const option = document.createElement('option')
                option.value = opt
                option.textContent = opt
                if (config.get(setting.key as any) === opt) option.selected = true
                input.appendChild(option)
            }
        } else {
            input = document.createElement('input')
            input.type = setting.type === 'checkbox' ? 'checkbox' : setting.type === 'number' ? 'number' : 'text'
            if (setting.type !== 'checkbox') {
                (input as HTMLInputElement).value = String(config.get(setting.key as any))
            } else {
                (input as HTMLInputElement).checked = !!config.get(setting.key as any)
            }
        }

        input.addEventListener('change', () => {
            const value = setting.type === 'checkbox'
                ? (input as HTMLInputElement).checked
                : setting.type === 'number'
                    ? parseInt((input as HTMLInputElement).value, 10)
                    : (input as HTMLInputElement).value
            config.set(setting.key as any, value as any)
        })

        row.appendChild(label)
        row.appendChild(input)
        content.appendChild(row)
    }

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
    cookieDesc.textContent = 'Import cookies from J2Team (JSON) or Get Cookies.txt (TXT) to bypass Cloudflare.'
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
            const cookies = parseCookies(text, file.name.endsWith('.json') ? 'json' : 'txt')
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
    clearCookieBtn.className = 'ohentai-dl-btn ohentai-dl-btn-danger'
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

    const copyLinkBtn = document.createElement('button')
    copyLinkBtn.className = 'ohentai-dl-btn ohentai-dl-btn-primary'
    copyLinkBtn.textContent = 'Copy Download Link'
    copyLinkBtn.style.marginTop = '12px'
    copyLinkBtn.addEventListener('click', () => {
        const streamUrl = prompt('Paste video stream URL to get download link:')
        if (streamUrl) {
            const cookies = config.get('customCookies') || document.cookie
            const linkText = `${streamUrl}\nReferer: https://ohentai.org/\nCookie: ${cookies}`
            navigator.clipboard.writeText(linkText).then(() => {
                copyLinkBtn.textContent = 'Copied!'
                setTimeout(() => { copyLinkBtn.textContent = 'Copy Download Link' }, 2000)
            })
        }
    })
    content.appendChild(copyLinkBtn)

    const resetBtn = document.createElement('button')
    resetBtn.className = 'ohentai-dl-btn ohentai-dl-btn-danger'
    resetBtn.textContent = 'Reset to Defaults'
    resetBtn.style.marginTop = '16px'
    resetBtn.addEventListener('click', () => { config.reset(); settingsPanelOpen = false; showSettingsPanel() })
    content.appendChild(resetBtn)

    const helpText = document.createElement('div')
    helpText.style.marginTop = '16px'
    helpText.style.fontSize = '12px'
    helpText.style.color = '#888'
    helpText.innerHTML = `
        <strong>Template Variables:</strong><br>
        %title% %artist% %series% %tags% %publish-date% %last-updated% %download-date% %number% %vid%<br>
        <strong>Number:</strong> Oldest video = 001, Newest = NNN
    `
    content.appendChild(helpText)

    createPanel('Settings', content, () => { settingsPanelOpen = false })
}

function parseCookies(text: string, format: 'json' | 'txt'): string | null {
    try {
        if (format === 'json') {
            const data = JSON.parse(text)
            const cookies: string[] = []
            if (Array.isArray(data)) {
                for (const item of data) {
                    if (item.name && item.value) cookies.push(`${item.name}=${item.value}`)
                }
            } else if (typeof data === 'object') {
                for (const [name, value] of Object.entries(data)) {
                    if (value) cookies.push(`${name}=${value}`)
                }
            }
            return cookies.length > 0 ? cookies.join('; ') : null
        } else {
            const cookies: string[] = []
            for (const line of text.split('\n')) {
                const trimmed = line.trim()
                if (!trimmed || trimmed.startsWith('#')) continue
                const parts = trimmed.split('\t')
                if (parts.length >= 7 && parts[5] && parts[6]) {
                    cookies.push(`${parts[5]}=${parts[6]}`)
                }
            }
            return cookies.length > 0 ? cookies.join('; ') : null
        }
    } catch { return null }
}

function showProgressPanel(total: number, filenames?: string[]): { update: (current: number, filename: string) => void; log: (msg: string, type: 'info' | 'success' | 'error') => void; setItemProgress: (index: number, pct: number) => void } {
    const content = document.createElement('div')

    const overallBar = document.createElement('div')
    overallBar.className = 'ohentai-dl-progress-bar'
    const overallFill = document.createElement('div')
    overallFill.className = 'ohentai-dl-progress-fill'
    overallFill.style.width = '0%'
    overallFill.textContent = '0/0'
    overallBar.appendChild(overallFill)
    content.appendChild(overallBar)

    const statusText = document.createElement('div')
    statusText.className = 'ohentai-dl-status ohentai-dl-status-info'
    statusText.textContent = 'Starting...'
    content.appendChild(statusText)

    const itemsContainer = document.createElement('div')
    itemsContainer.id = 'ohentai-dl-items-container'
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
        bar.className = 'ohentai-dl-progress-bar'
        bar.style.flex = '1'
        bar.style.margin = '0'
        bar.style.height = '18px'

        const fill = document.createElement('div')
        fill.className = 'ohentai-dl-progress-fill'
        fill.style.width = '0%'
        fill.style.fontSize = '10px'
        fill.textContent = '0%'
        fill.id = `ohentai-dl-fill-${i}`
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
    logDiv.className = 'ohentai-dl-log'
    content.appendChild(logDiv)

    createPanel('Download Progress', content)

    return {
        update: (current, filename) => {
            const pct = Math.round((current / total) * 100)
            overallFill.style.width = `${pct}%`
            overallFill.textContent = `${current}/${total}`
            statusText.textContent = `Completed: ${current}/${total}`
        },
        log: (msg, type) => {
            const entry = document.createElement('div')
            entry.className = `ohentai-dl-log-entry ${type}`
            entry.textContent = msg
            logDiv.appendChild(entry)
            logDiv.scrollTop = logDiv.scrollHeight
            console.log(`[OhentaiDL][${type}]`, msg)
        },
        setItemProgress: (index, pct) => {
            const fill = document.getElementById(`ohentai-dl-fill-${index}`)
            if (fill) {
                fill.style.width = `${Math.round(pct)}%`
                fill.textContent = `${Math.round(pct)}%`
            }
        },
    }
}

// ==================== Bulk Download ====================

interface BulkVideoWithMeta {
    vid: string
    title: string
    pageUrl: string
    streamUrl: string
    streamSource: string
    metadata: Metadata
    uploadDate: string
}

async function startBulkDownload(): Promise<void> {
    if (selectedVideos.size === 0) return

    const { update, log } = showProgressPanel(selectedVideos.size)
    downloadQueue.clear()

    const videos = Array.from(selectedVideos.values())
    const totalVideos = videos.length
    log(`Fetching metadata for ${totalVideos} videos...`, 'info')

    const videosWithMeta: BulkVideoWithMeta[] = []
    const concurrency = Math.max(config.get('concurrentVideos'), 1)

    const fetchOne = async (video: typeof videos[0], index: number): Promise<void> => {
        try {
            const html = await fetch(video.pageUrl, { headers: { Referer: 'https://ohentai.org/' } }).then(r => r.text())
            const parser = new DOMParser()
            const doc = parser.parseFromString(html, 'text/html')

            const streams = extractStreamsFromPage(doc)
            const meta = extractMetadataFromDoc(doc)

            if (streams.length > 0 && meta) {
                const preferredSource = config.get('preferredSource')
                const stream = streams.find(s => s.source === preferredSource) || streams[0]

                videosWithMeta.push({
                    vid: video.vid,
                    title: video.title,
                    pageUrl: video.pageUrl,
                    streamUrl: stream.url,
                    streamSource: stream.source,
                    metadata: meta,
                    uploadDate: meta.uploadDate || meta.releaseDate || '',
                })
            } else {
                log(`  No streams/metadata for: ${video.title}`, 'error')
            }
        } catch (error) {
            log(`  Error: ${error instanceof Error ? error.message : String(error)}`, 'error')
        }
    }

    for (let i = 0; i < videos.length; i += concurrency) {
        const batch = videos.slice(i, i + concurrency)
        const batchPromises = batch.map((v, idx) => fetchOne(v, i + idx))
        await Promise.all(batchPromises)
        log(`Fetched batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(totalVideos / concurrency)} (${batch.length} videos)`, 'info')
    }

    log(`All ${videosWithMeta.length}/${totalVideos} videos fetched. Sorting by date...`, 'info')

    // Step 2: Sort by upload date (oldest first)
    videosWithMeta.sort((a, b) => {
        if (!a.uploadDate && !b.uploadDate) return 0
        if (!a.uploadDate) return 1
        if (!b.uploadDate) return -1
        return a.uploadDate.localeCompare(b.uploadDate)
    })

    debug('Sorted videos by date:', videosWithMeta.map(v => `${v.uploadDate} - ${v.title}`))

    // Step 3: Assign episode numbers (oldest=1, newest=N) and generate filenames
    const filenames: string[] = []
    for (let i = 0; i < videosWithMeta.length; i++) {
        const v = videosWithMeta[i]
        const episodeNumber = i + 1
        const filename = generateFilename(v.metadata, episodeNumber)
        filenames.push(filename)
        log(`  #${String(episodeNumber).padStart(3, '0')} ${v.uploadDate} -> ${filename}`, 'info')
    }

    // Step 4: Show progress panel with all items
    const { update: updateProgress, log: plog, setItemProgress } = showProgressPanel(videosWithMeta.length, filenames)

    // Step 5: Add to queue
    for (let i = 0; i < videosWithMeta.length; i++) {
        const v = videosWithMeta[i]
        downloadQueue.add({ url: v.streamUrl, filename: filenames[i], referer: 'https://ohentai.org/', episodeNumber: i + 1 })
        downloadQueue.setItemProgressCallback(i, (pct) => setItemProgress(i, pct))
    }

    // Step 6: Download
    downloadQueue.setProgressCallback((current, total, filename) => updateProgress(current, filename))
    downloadQueue.setLogCallback(plog)
    await downloadQueue.process()
}

async function loadBulkVideos(): Promise<void> {
    const url = window.location.href
    debug('Loading bulk from:', url)

    if (url.includes('sery_video.php')) {
        const params = new URLSearchParams(window.location.search)
        const seryid = params.get('seryid') || ''
        if (!seryid) return

        debug('Loading series from DOM')
        bulkVideos = []

        const bricks = document.querySelectorAll('.videobrick')
        debug('Bricks:', bricks.length)

        bricks.forEach(brick => {
            const link = brick.querySelector('.videotitle a, a[href*="detail.php?vid="]')
            if (link) {
                const href = link.getAttribute('href') || ''
                const vidMatch = href.match(/vid=([^&]+)/)
                if (vidMatch) {
                    bulkVideos.push({
                        vid: vidMatch[1],
                        title: link.textContent?.trim() || '',
                        pageUrl: href.startsWith('http') ? href : `https://ohentai.org/${href}`,
                        thumbnail: '',
                        tags: [],
                        series: '',
                    })
                }
            }
        })

        if (bulkVideos.length === 0) {
            const epsContainer = document.querySelector('.epscontainer')
            if (epsContainer) {
                const links = epsContainer.querySelectorAll('a')
                links.forEach(link => {
                    const href = link.getAttribute('href') || ''
                    const vidMatch = href.match(/vid=([^&]+)/)
                    if (vidMatch) {
                        bulkVideos.push({
                            vid: vidMatch[1],
                            title: link.textContent?.trim() || '',
                            pageUrl: href.startsWith('http') ? href : `https://ohentai.org/${href}`,
                            thumbnail: '',
                            tags: [],
                            series: '',
                        })
                    }
                })
            }
        }

        debug(`Found ${bulkVideos.length} episodes`)
    } else if (url.includes('tagsearch.php')) {
        const params = new URLSearchParams(window.location.search)
        const tag = params.get('tag') || ''
        if (!tag) return

        debug('Crawling tag:', tag)
        bulkVideos = []

        try {
            const allVideos = await crawlAllTagPages(tag, 100, (page, total) => {
                debug(`Page ${page}/${total}`)
            })
            bulkVideos = allVideos.map(v => ({ ...v, tags: [tag], series: '' }))
            debug(`Found ${bulkVideos.length} videos`)
        } catch (error) {
            debugError('Crawl error:', error)
        }
    } else if (url.includes('search.php')) {
        debug('Loading search results')
        bulkVideos = []

        const bricks = document.querySelectorAll('.videobrick')
        bricks.forEach(brick => {
            const link = brick.querySelector('.videotitle a')
            if (link) {
                const href = link.getAttribute('href') || ''
                const vidMatch = href.match(/vid=([^&]+)/)
                if (vidMatch) {
                    bulkVideos.push({
                        vid: vidMatch[1],
                        title: link.textContent?.trim() || '',
                        pageUrl: href.startsWith('http') ? href : `https://ohentai.org/${href}`,
                        thumbnail: '',
                        tags: [],
                        series: '',
                    })
                }
            }
        })
        debug(`Found ${bulkVideos.length} videos`)
    }
}

// ==================== Metadata from Doc ====================

function extractMetadataFromDoc(doc: Document): Metadata | null {
    const docUrl = doc.URL || ''
    const urlParams = new URLSearchParams(docUrl.split('?')[1] || '')
    let vid = urlParams.get('vid') || extractVidFromLinks(doc)
    if (!vid) return null

    const titleEl = doc.querySelector('h1.title')
    const title = titleEl?.textContent?.trim() || 'Unknown'

    const seriesEl = doc.querySelector('.sectiontitle a')
    const series = seriesEl?.textContent?.trim() || ''

    const seriesLink = doc.querySelector('a[href*="sery_video.php?seryid="]')
    const seryid = seriesLink
        ? new URLSearchParams(seriesLink.getAttribute('href')?.split('?')[1] || '').get('seryid')
        : null

    const tagEls = doc.querySelectorAll('.tagcontainer a')
    const tags: string[] = []
    tagEls.forEach(el => { const t = el.textContent?.trim(); if (t) tags.push(t) })

    const longdes = doc.querySelectorAll('.longdes')
    let uploadDate = ''
    let releaseDate: string | null = null
    longdes.forEach(el => {
        const text = el.textContent || ''
        const m = text.match(/(\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}:\d{2})/) || text.match(/(\d{4}[-/]\d{2}[-/]\d{2})/)
        if (!m) return
        const dateStr = m[1].replace(/\//g, '-')
        if (text.includes('Publish')) {
            uploadDate = dateStr
        }
        if ((text.includes('Last Updated') || text.includes('Updated')) && !uploadDate) {
            uploadDate = dateStr
        }
        if (text.includes('Release')) {
            releaseDate = dateStr
        }
    })

    const epsContainer = doc.querySelector('.epscontainer')
    const episodes = epsContainer ? Array.from(epsContainer.querySelectorAll('a')) : []
    const totalEpisodes = episodes.length

    let episodeNumber = 0
    if (totalEpisodes > 0) {
        episodes.forEach((ep, index) => {
            const href = ep.getAttribute('href') || ''
            const epVid = new URLSearchParams(href.split('?')[1] || '').get('vid')
            if (epVid === vid) episodeNumber = index + 1
        })
    }

    const ogImage = doc.querySelector('meta[property="og:image"]')
    const thumbnail = ogImage?.getAttribute('content') || ''

    return { vid, vidDecoded: vid, title, series, seryid, artist: series, tags, uploadDate, releaseDate, episodeNumber, totalEpisodes, thumbnail, views: 0, likes: 0 }
}

function extractVidFromLinks(doc: Document): string | null {
    const links = doc.querySelectorAll('a[href*="detail.php?vid="]')
    for (const link of links) {
        const href = link.getAttribute('href') || ''
        const match = href.match(/vid=([^&]+)/)
        if (match) return match[1]
    }
    return null
}

// ==================== Auto Download ====================

async function autoDownloadIfNeeded(): Promise<void> {
    const params = new URLSearchParams(window.location.search)
    if (params.get('auto_dl') !== '1') return

    debug('Auto-download')
    const streams = extractStreamsFromPage()
    const metadata = extractMetadata()

    if (streams.length > 0 && metadata) {
        const preferredSource = config.get('preferredSource')
        const stream = streams.find(s => s.source === preferredSource) || streams[0]
        const filename = generateFilename(metadata)

        await download({ url: stream.url, filename, referer: 'https://ohentai.org/' })
        setTimeout(() => window.close(), 3000)
    }
}

// ==================== Observers ====================

function setupObservers(): void {
    const debouncedHandler = debounce(() => {
        const isDetailPage = window.location.pathname.includes('detail.php')
        if (isDetailPage) {
            const streams = extractStreamsFromPage()
            const metadata = extractMetadata()
            debug('Observer: streams', streams.length)
            if (streams.length > 0 && metadata) ensureDownloadButton(streams, metadata)
        }
        ensureBulkButton()
        injectCheckboxesToVideoCards()
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
    document.querySelectorAll('.ohentai-dl-btn, .ohentai-dl-bulk-btn, .ohentai-dl-checkbox-inject, .ohentai-dl-download-btn-card, .ohentai-dl-single-btn').forEach(el => el.remove())
    bulkPanelOpen = false
    settingsPanelOpen = false

    const isDetailPage = window.location.pathname.includes('detail.php')
    if (isDetailPage) {
        const streams = extractStreamsFromPage()
        const metadata = extractMetadata()
        if (streams.length > 0 && metadata) ensureDownloadButton(streams, metadata)
    }

    ensureBulkButton()
    injectCheckboxesToVideoCards()
    autoDownloadIfNeeded()
}

// ==================== Entry Point ====================

function mount(): void {
    debug('Mounting', window.location.href)

    injectStyles()
    ensureSettingsButton()

    const isDetailPage = window.location.pathname.includes('detail.php')
    if (isDetailPage) {
        const streams = extractStreamsFromPage()
        const metadata = extractMetadata()
        debug('Initial: streams', streams.length, 'meta', metadata?.title)
        if (streams.length > 0 && metadata) ensureDownloadButton(streams, metadata)
        else debugError('No streams or metadata')
    }

    ensureBulkButton()
    injectCheckboxesToVideoCards()
    setupObservers()
    autoDownloadIfNeeded()

    debug('Mount complete')
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount)
} else {
    mount()
}

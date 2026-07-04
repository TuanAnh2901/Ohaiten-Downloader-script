// HLS (m3u8) stream downloader.
//
// Animehay's AHS and HY servers serve HLS streams (m3u8 playlists + segments
// disguised as .png to bypass ad-blockers). This module:
//   1. Fetches the master.m3u8 playlist
//   2. Picks the highest-quality variant
//   3. Fetches and parses the variant .m3u8 for segment URLs
//   4. Downloads all segments in parallel (limited concurrency)
//   5. Concatenates them in order into a single Blob
//
// The Blob can then be saved via GM_download or the standard download()
// pipeline.

export interface HlsDownloadOptions {
    /** URL of the m3u8 playlist (master or variant). */
    m3u8Url: string
    /** Referer header to attach to every segment request. */
    referer?: string
    /** Maximum simultaneous segment downloads (default 6). */
    concurrency?: number
    /** Called after each segment batch with (downloadedBytes, totalBytes). */
    onProgress?: (loaded: number, total: number) => void
    /** Abort signal. */
    signal?: AbortSignal
}

export interface HlsDownloadResult {
    blob: Blob
    /**
     * Segment ArrayBuffers in playback order, with empty placeholders filtered
     * out. Provided for callers that want to stream segments directly to disk
     * (File System Access API) instead of using the in-memory Blob.
     */
    orderedChunks: ArrayBuffer[]
    /** Total bytes of all concatenated segments. */
    totalBytes: number
    /** Number of segments downloaded. */
    segmentCount: number
    /** Content type detected (video/MP2T or video/mp4). */
    contentType: string
    /** Warnings encountered during download. */
    warnings: string[]
}

/**
 * Download an HLS stream end-to-end:
 * parse m3u8 → choose variant → download segments → concatenate.
 *
 * Returns a Blob that can be saved as .ts or remuxed.
 */
export async function downloadHlsStream(options: HlsDownloadOptions): Promise<HlsDownloadResult> {
    const {
        m3u8Url,
        referer = '',
        concurrency = 6,
        onProgress,
        signal,
    } = options

    const warnings: string[] = []

    // 1. Fetch master.m3u8
    const masterText = await fetchAsText(m3u8Url, referer)
    if (!masterText) throw new Error('Failed to fetch master playlist')

    // 2. Resolve variant playlist URL
    const variantUrl = resolveVariantPlaylist(masterText, m3u8Url)
    if (!variantUrl) throw new Error('No valid variant playlist found in m3u8')

    // 3. Fetch variant .m3u8
    const variantText = await fetchAsText(variantUrl, referer)
    if (!variantText) throw new Error('Failed to fetch variant playlist')

    // 4. Parse segment URLs from variant
    const segments = parseSegmentUrls(variantText, variantUrl)
    if (segments.length === 0) {
        // Try parsing master directly (some servers serve a single variant
        // timeline directly at the master URL).
        const fallbackSegments = parseSegmentUrls(masterText, m3u8Url)
        if (fallbackSegments.length === 0) {
            throw new Error('No segments found in playlist')
        }
        segments.push(...fallbackSegments)
    }

    const totalSegments = segments.length

    // 5. Download segments with adaptive concurrency, stall detection,
    //    exponential backoff, and a pipelined promise-pool. Patterns borrowed
    //    from FastStream's HLSLoader: throughput sampling every 500ms, abort
    //    any segment that hasn't moved in 8s, jitter backoff to avoid
    //    server-side throttling pressure, and pull-next-on-completion so
    //    workers never sit idle while segments are still queued.
    const chunks: ArrayBuffer[] = Array.from({ length: segments.length }, () => new ArrayBuffer(0))
    let loadedBytes = 0
    const totalBytesEstimate = segments.length * 1024 * 1024 // rough estimate per segment
    let successfulSegments = 0

    const MIN_CONCURRENCY = 3
    const MAX_CONCURRENCY = 10
    const STALL_TIMEOUT_MS = 8_000
    const SAMPLE_INTERVAL_MS = 500
    const HIGH_BW_BYTES_PER_S = 5 * 1024 * 1024 // 5 MB/s
    const LOW_BW_BYTES_PER_S = 1 * 1024 * 1024  // 1 MB/s
    const MAX_RETRY_DELAY_MS = 8_000

    let currentConcurrency = Math.max(MIN_CONCURRENCY, Math.min(MAX_CONCURRENCY, concurrency))
    let inflight = 0
    const nextSegmentIdxs: number[] = segments.map((_, i) => i)
    const pendingAborters = new Set<() => void>()

    // Throughput sampler — adjusts concurrency every 500ms based on average B/s.
    let sampleStartBytes = 0
    let sampleStartTime = 0
    const sampleTimer = setInterval(() => {
        const elapsed = (Date.now() - sampleStartTime) / 1000
        if (elapsed <= 0) return
        const bps = (loadedBytes - sampleStartBytes) / elapsed
        if (bps >= HIGH_BW_BYTES_PER_S && currentConcurrency < MAX_CONCURRENCY) {
            currentConcurrency++
        } else if (bps < LOW_BW_BYTES_PER_S && currentConcurrency > MIN_CONCURRENCY) {
            currentConcurrency--
        }
        sampleStartBytes = loadedBytes
        sampleStartTime = Date.now()
    }, SAMPLE_INTERVAL_MS)
    sampleStartBytes = 0
    sampleStartTime = Date.now()

    // Abort the in-flight segment timer when no bytes have arrived for STALL_TIMEOUT_MS.
    // Uses GM_xmlhttpRequest (bypasses CORS) and watches its `onprogress` event to
    // reset a stall timer; if no progress event lands within the window, the
    // request is aborted via xhr.abort() and we resolve to null so the caller
    // can retry with exponential backoff.
    async function fetchSegmentWithStallWatch(url: string, onStall: () => void): Promise<ArrayBuffer | null> {
        // Non-GM fallback (Node test env) — use the same timeout via AbortSignal.
        if (typeof GM_xmlhttpRequest === 'undefined') {
            try {
                const resp = await fetch(url, {
                    headers: referer ? { Referer: referer } : undefined,
                    signal: AbortSignal.timeout(STALL_TIMEOUT_MS),
                })
                if (!resp.ok) return null
                const buf = await resp.arrayBuffer()
                if (buf.byteLength > 0) {
                    loadedBytes += buf.byteLength
                    onProgress?.(loadedBytes, totalBytesEstimate)
                }
                return buf
            } catch {
                return null
            }
        }

        return new Promise<ArrayBuffer | null>((resolve) => {
            let stallTimer: ReturnType<typeof setTimeout> | null = null
            let lastLoaded = 0
            let settled = false
            const armStall = (): void => {
                if (stallTimer) clearTimeout(stallTimer)
                stallTimer = setTimeout(() => {
                    if (settled) return
                    settled = true
                    onStall()
                    try { xhr.abort() } catch { /* ignore */ }
                    resolve(null)
                }, STALL_TIMEOUT_MS)
            }
            const finish = (result: ArrayBuffer | null): void => {
                if (settled) return
                settled = true
                if (stallTimer) clearTimeout(stallTimer)
                resolve(result)
            }
            const xhr = GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: referer ? { Referer: referer } : undefined,
                responseType: 'arraybuffer',
                timeout: STALL_TIMEOUT_MS,
                onprogress: (e) => {
                    // Tampermonkey provides `loaded`; some builds also expose `total`.
                    // Treat any increment over `lastLoaded` as a stall-reset.
                    if (typeof e.loaded === 'number' && e.loaded > lastLoaded) {
                        const delta = e.loaded - lastLoaded
                        lastLoaded = e.loaded
                        loadedBytes += delta
                        onProgress?.(loadedBytes, totalBytesEstimate)
                        armStall()
                    }
                },
                onload: (resp) => {
                    if (resp.status >= 200 && resp.status < 300) {
                        const buf = resp.response as ArrayBuffer
                        // Account for bytes not covered by onprogress (the final chunk
                        // past the last reported `loaded` snapshot).
                        if (buf && buf.byteLength > lastLoaded) {
                            loadedBytes += buf.byteLength - lastLoaded
                            onProgress?.(loadedBytes, totalBytesEstimate)
                        }
                        finish(buf || null)
                    } else {
                        finish(null)
                    }
                },
                onerror: () => finish(null),
                ontimeout: () => finish(null),
    })
            armStall()
        })
    }

    // One segment download with retries + exponential backoff + jitter.
    async function downloadSegment(idx: number, url: string): Promise<void> {
        for (let attempt = 0; attempt < 3; attempt++) {
            if (signal?.aborted) return
            const localAbort = (): void => { /* triggered by stall watcher */ }
            pendingAborters.add(localAbort)
            try {
                const buf = await fetchSegmentWithStallWatch(url, localAbort)
                if (buf && buf.byteLength > 0) {
                    chunks[idx] = buf
                    successfulSegments++
                    onProgress?.(loadedBytes, totalBytesEstimate)
                    return
                }
                warnings.push(`Empty segment at index ${idx} (attempt ${attempt + 1})`)
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                warnings.push(`Segment ${idx} attempt ${attempt + 1} failed: ${msg}`)
            } finally {
                pendingAborters.delete(localAbort)
            }
            // Exponential backoff with jitter, capped at 8s.
            const base = 1000 * Math.pow(2, attempt)
            const jitter = Math.random() * 500
            const delay = Math.min(base + jitter, MAX_RETRY_DELAY_MS)
            await new Promise(r => setTimeout(r, delay))
        }
        warnings.push(`Failed to download segment ${idx} after 3 attempts`)
    }

    // Pipelined promise pool: each worker pulls the next available segment
    // index as soon as it finishes its current one, instead of waiting on
    // a fixed modulo-slot. Bounded by `currentConcurrency` which the sampler
    // mutates live.
    async function poolWorker(): Promise<void> {
        while (!signal?.aborted) {
            const idx = nextSegmentIdxs.shift()
            if (idx === undefined) return
            inflight++
            try {
                await downloadSegment(idx, segments[idx].url)
            } finally {
                inflight--
            }
        }
    }

    // Continuously maintain a pool of `currentConcurrency` workers, spawning a
    // new one whenever the live inflight count drops below the target.
    const runningWorkers: Promise<void>[] = []
    const ensureWorkers = (): void => {
        while (runningWorkers.length + inflight < currentConcurrency && nextSegmentIdxs.length > 0) {
            runningWorkers.push(poolWorker())
        }
    }
    // Initial fan-out: spin up to the starting concurrency.
    ensureWorkers()
    // Re-evaluate on every segment completion so newly-freed capacity refills.
    // A small interval also keeps the sampler steady.
    const refillTimer = setInterval(() => {
        ensureWorkers()
    }, 200)

    await Promise.allSettled(runningWorkers)
    clearInterval(sampleTimer)
    clearInterval(refillTimer)

    if (signal?.aborted) throw new Error('HLS download aborted')

    if (successfulSegments === 0) {
        throw new Error('No segments could be downloaded')
    }

    // 6. Build final outputs.
    const totalBytes = loadedBytes
    const contentType = detectContentType(segments)

    // `chunks` is already ordered and prefilled with empty buffers, so Blob can
    // stream the final concatenation directly without an extra filter/reduce pass.
    const blob = new Blob(chunks, { type: contentType })

    // `orderedChunks` is the same segments in order, with empty placeholders
    // filtered out. Callers that want to write each segment directly to disk
    // (e.g. File System Access API) iterate this instead of relying on the Blob.
    const orderedChunks = chunks.filter(c => c.byteLength > 0)

    return {
        blob,
        orderedChunks,
        totalBytes,
        segmentCount: successfulSegments,
        contentType,
        warnings,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// m3u8 parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the best variant playlist URL from a master.m3u8.
 * Prefers higher resolution, falls back to the first variant, then the URL
 * itself if no variant lines exist.
 */
function resolveVariantPlaylist(masterText: string, baseUrl: string): string | null {
    const lines = masterText.split('\n')
    let bestUrl: string | null = null
    let bestBandwidth = 0
    let bestResolution = 0

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        // #EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=1920x1080
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            const bwMatch = line.match(/BANDWIDTH=(\d+)/i)
            const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i)
            const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0
            const resolution = resMatch ? parseInt(resMatch[1], 10) * parseInt(resMatch[2], 10) : 0

            // Next non-empty, non-comment line is the URL
            for (let j = i + 1; j < lines.length; j++) {
                const next = lines[j].trim()
                if (!next || next.startsWith('#')) continue
                if (bandwidth > bestBandwidth || resolution > bestResolution) {
                    bestBandwidth = bandwidth
                    bestResolution = resolution
                    bestUrl = resolveUrl(next, baseUrl)
                }
                break
            }
        }
    }

    // Fallback: if no STREAM-INF found, the whole file might be a variant
    // playlist directly (single-level m3u8). Return base URL.
    if (!bestUrl) {
        // Check if the first non-comment line looks like a segment
        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#')) continue
            if (trimmed.endsWith('.m3u8') || trimmed.includes('m3u8?')) {
                return resolveUrl(trimmed, baseUrl)
            }
            // Not a playlist reference — the master IS the variant.
            return baseUrl
        }
    }

    return bestUrl
}

/**
 * Parse segment URLs from a variant m3u8 playlist.
 * Handles #EXTINF + segment URL pairs, respecting relative paths.
 */
function parseSegmentUrls(playlistText: string, baseUrl: string): Array<{ url: string; duration: number }> {
    const segments: Array<{ url: string; duration: number }> = []
    const lines = playlistText.split('\n')
    let currentDuration = 0

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        if (line.startsWith('#EXTINF:')) {
            const durMatch = line.match(/#EXTINF:\s*([\d.]+)/)
            if (durMatch) currentDuration = parseFloat(durMatch[1])
            continue
        }

        // Skip comments, tags, empty lines
        if (!line || line.startsWith('#')) continue

        // This is a segment URL
        const url = resolveUrl(line, baseUrl)
        segments.push({ url, duration: currentDuration })
        currentDuration = 0
    }

    return segments
}

// ─────────────────────────────────────────────────────────────────────────────
// Network helpers (GM_xmlhttpRequest in userscript, fetch in test env)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAsText(url: string, referer: string): Promise<string | null> {
    if (typeof GM_xmlhttpRequest !== 'undefined') {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: referer ? { Referer: referer } : undefined,
                timeout: 15_000,
                onload: (resp) => {
                    if (resp.status >= 200 && resp.status < 300) {
                        resolve(resp.responseText)
                    } else {
                        resolve(null)
                    }
                },
                onerror: () => resolve(null),
                ontimeout: () => resolve(null),
            })
        })
    }
    // Node test fallback
    try {
        const resp = await fetch(url, {
            headers: referer ? { Referer: referer } : undefined,
            signal: AbortSignal.timeout(15000),
        })
        if (!resp.ok) return null
        return await resp.text()
    } catch {
        return null
    }
}

async function fetchAsArrayBuffer(url: string, referer: string): Promise<ArrayBuffer | null> {
    if (typeof GM_xmlhttpRequest !== 'undefined') {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: referer ? { Referer: referer } : undefined,
                responseType: 'arraybuffer',
                timeout: 15_000,
                onload: (resp) => {
                    if (resp.status >= 200 && resp.status < 300) {
                        resolve(resp.response as ArrayBuffer)
                    } else {
                        resolve(null)
                    }
                },
                onerror: () => resolve(null),
                ontimeout: () => resolve(null),
            })
        })
    }
    // Node test fallback
    try {
        const resp = await fetch(url, {
            headers: referer ? { Referer: referer } : undefined,
            signal: AbortSignal.timeout(15000),
        })
        if (!resp.ok) return null
        return await resp.arrayBuffer()
    } catch {
        return null
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// URL resolution (relative → absolute)
// ─────────────────────────────────────────────────────────────────────────────

function resolveUrl(relativeUrl: string, baseUrl: string): string {
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
        return relativeUrl
    }
    try {
        const base = new URL(baseUrl)
        return new URL(relativeUrl, base.origin + base.pathname.replace(/\/[^/]*$/, '/')).href
    } catch {
        return relativeUrl
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Content-type detection
// ─────────────────────────────────────────────────────────────────────────────

function detectContentType(segments: Array<{ url: string; duration: number }>): string {
    // Check segment extensions
    for (const seg of segments) {
        const lower = seg.url.toLowerCase()
        if (lower.endsWith('.ts')) return 'video/MP2T'
        if (lower.endsWith('.mp4')) return 'video/mp4'
    }
    // Default: MPEG-2 Transport Stream (most common for HLS)
    return 'video/MP2T'
}

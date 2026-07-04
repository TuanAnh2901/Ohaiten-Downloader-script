import type { DownloadMethod } from './env'

interface ConfigData {
    downloadMethod: DownloadMethod
    filenameTemplate: string
    tagSeparator: string
    aria2RpcUrl: string
    aria2Secret: string
    preferredSource: string
    autoDownload: boolean
    downloadDelay: number
    concurrentVideos: number
    saveMetadata: boolean
    debug: boolean
    customCookies: string
    /** Max blob size (MB) accepted by the in-browser downloader. */
    maxBrowserBlobMb: number
    /** Number of parallel connections for aria2 multi-stream downloads. */
    chunksPerVideo: number
    /**
     * HLS save mode:
     *   - 'blob' (default): assemble all segments in memory, then trigger
     *     download via a Blob URL. Works on every browser, but peak RAM
     *     scales with file size.
     *   - 'stream': use File System Access API (`showSaveFilePicker` +
     *     `FileSystemWritableFileStream`) when available to write segments
     *     directly to disk. Faster for large files, lower RAM, but only
     *     supported on Chromium-based browsers. Falls back to 'blob' if
     *     the user cancels or the API is unavailable.
     */
    hlsSaveMode: 'blob' | 'stream'
}

const DEFAULTS: ConfigData = {
    downloadMethod: 'browser',
    filenameTemplate: '[%number%] %title%',
    tagSeparator: '_',
    aria2RpcUrl: 'http://127.0.0.1:6800/jsonrpc',
    aria2Secret: '',
    preferredSource: 'AHS',
    autoDownload: false,
    downloadDelay: 1000,
    concurrentVideos: 3,
    saveMetadata: false,
    debug: false,
    customCookies: '',
    maxBrowserBlobMb: 1024,
    chunksPerVideo: 5,
    hlsSaveMode: 'blob',
}

class Config {
    private data: ConfigData
    private listeners: Array<() => void> = []

    constructor() {
        this.data = this.load()
    }

    private load(): ConfigData {
        const loaded: Partial<ConfigData> = {}
        for (const key of Object.keys(DEFAULTS)) {
            const val = GM_getValue(`animehay_${key}`, undefined)
            if (val !== undefined) {
                loaded[key as keyof ConfigData] = val as ConfigData[keyof ConfigData]
            }
        }
        return { ...DEFAULTS, ...loaded }
    }

    private save(): void {
        for (const [key, value] of Object.entries(this.data)) {
            GM_setValue(`animehay_${key}`, value)
        }
    }

    get<K extends keyof ConfigData>(key: K): ConfigData[K] {
        return this.data[key]
    }

    set<K extends keyof ConfigData>(key: K, value: ConfigData[K]): void {
        this.data[key] = value
        GM_setValue(`animehay_${key}`, value)
        this.notifyListeners()
    }

    getAll(): Readonly<ConfigData> {
        return { ...this.data }
    }

    reset(): void {
        this.data = { ...DEFAULTS }
        this.save()
        this.notifyListeners()
    }

    onChange(listener: () => void): void {
        this.listeners.push(listener)
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener()
        }
    }
}

export const config = new Config()

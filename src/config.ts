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
    chunksPerVideo: number
    concurrentVideos: number
    saveMetadata: boolean
    debug: boolean
    customCookies: string
}

const DEFAULTS: ConfigData = {
    downloadMethod: 'browser',
    filenameTemplate: '[%number%] %title%',
    tagSeparator: '_',
    aria2RpcUrl: 'http://127.0.0.1:6800/jsonrpc',
    aria2Secret: '',
    preferredSource: 'Snowcore',
    autoDownload: false,
    downloadDelay: 2000,
    chunksPerVideo: 8,
    concurrentVideos: 1,
    saveMetadata: false,
    debug: false,
    customCookies: '',
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
            const val = GM_getValue(`ohentai_${key}`, undefined)
            if (val !== undefined) {
                loaded[key as keyof ConfigData] = val as ConfigData[keyof ConfigData]
            }
        }
        return { ...DEFAULTS, ...loaded }
    }

    private save(): void {
        for (const [key, value] of Object.entries(this.data)) {
            GM_setValue(`ohentai_${key}`, value)
        }
    }

    get<K extends keyof ConfigData>(key: K): ConfigData[K] {
        return this.data[key]
    }

    set<K extends keyof ConfigData>(key: K, value: ConfigData[K]): void {
        this.data[key] = value
        GM_setValue(`ohentai_${key}`, value)
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

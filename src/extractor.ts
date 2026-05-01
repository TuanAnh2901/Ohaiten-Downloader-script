import { LooseObject } from './env'

export interface Stream {
    url: string
    source: string
    quality?: string
}

export function extractStreamsFromPage(doc: Document = document): Stream[] {
    const streams: Stream[] = []
    const debug = (...args: unknown[]) => console.log('[OhentaiDL][extractor]', ...args)

    debug('Extracting streams from page')

    const scripts = doc.querySelectorAll('script')
    debug('Found', scripts.length, 'script tags')

    for (const script of scripts) {
        const text = script.textContent || ''

        if (!text.includes('jwplayer') && !text.includes('sources') && !text.includes('.mp4')) {
            continue
        }

        debug('Checking script, length:', text.length)

        const fileUrls = extractFileUrls(text)
        debug('Found file URLs:', fileUrls.length)

        if (fileUrls.length > 0) {
            const sourceName = extractSourceNameFromScript(text, doc)
            for (const fileUrl of fileUrls) {
                if (fileUrl.includes('.mp4') || fileUrl.includes('.m3u8')) {
                    streams.push({
                        url: fileUrl,
                        source: sourceName,
                        quality: extractQualityFromScript(text),
                    })
                    debug('Stream found:', sourceName, fileUrl.substring(0, 80))
                }
            }
        }
    }

    if (streams.length === 0) {
        debug('No streams from scripts, trying DOM elements')

        const videoEl = doc.querySelector('#my-video video')
        if (videoEl?.src) {
            streams.push({
                url: videoEl.src,
                source: 'DOM-video',
            })
            debug('Stream from video element:', videoEl.src.substring(0, 80))
        }

        const sources = doc.querySelectorAll('#my-video source')
        sources.forEach(source => {
            const src = source.getAttribute('src')
            if (src) {
                streams.push({
                    url: src,
                    source: 'DOM-source',
                    quality: source.getAttribute('label') || source.getAttribute('data-quality') || undefined,
                })
                debug('Stream from source element:', src.substring(0, 80))
            }
        })
    }

    if (streams.length === 0) {
        debug('No streams from DOM, trying regex on full page HTML')
        const html = doc.documentElement?.innerHTML || ''
        const fileUrls = extractFileUrls(html)
        const sourceName = getSourceTabs(doc)[0] || 'Unknown'

        for (const fileUrl of fileUrls) {
            if (fileUrl.includes('.mp4') || fileUrl.includes('.m3u8')) {
                streams.push({
                    url: fileUrl,
                    source: sourceName,
                })
                debug('Stream from full HTML regex:', fileUrl.substring(0, 80))
            }
        }
    }

    debug('Total streams extracted:', streams.length)
    return streams
}

function extractFileUrls(text: string): string[] {
    const urls: string[] = []

    const patterns = [
        /"file"\s*:\s*"([^"]+)"/g,
        /'file'\s*:\s*'([^']+)'/g,
        /file\s*:\s*"([^"]+)"/g,
        /file\s*:\s*'([^']+)'/g,
        /"src"\s*:\s*"([^"]+)"/g,
        /sources\s*:\s*\[\s*\{\s*"file"\s*:\s*"([^"]+)"/g,
    ]

    for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(text)) !== null) {
            const url = match[1]
            if (url && !urls.includes(url)) {
                urls.push(url)
            }
        }
    }

    return urls
}

function extractSourceNameFromScript(scriptText: string, doc: Document): string {
    const tabPattern = /name="([^"]+)"/
    const match = scriptText.match(tabPattern)
    if (match) return match[1]

    const tabs = getSourceTabs(doc)
    if (tabs.length > 0) return tabs[0]

    return 'Unknown'
}

function extractQualityFromScript(text: string): string | undefined {
    const qualityMatch = text.match(/"label"\s*:\s*"([^"]+)"/)
    if (qualityMatch) return qualityMatch[1]

    const heightMatch = text.match(/"height"\s*:\s*(\d+)/)
    if (heightMatch) return heightMatch[1]

    return undefined
}

export function getSourceTabs(doc: Document = document): string[] {
    const tabs: string[] = []

    const elements = doc.querySelectorAll('.resouurcetab')
    elements.forEach(el => {
        const name = el.getAttribute('name')
        if (name) tabs.push(name)
    })

    const select = doc.querySelector('#detaildropdownselect')
    if (select) {
        const options = select.querySelectorAll('option')
        options.forEach(opt => {
            const text = opt.textContent?.trim()
            if (text && !tabs.includes(text)) {
                tabs.push(text)
            }
        })
    }

    return tabs.length > 0 ? tabs : ['Snowcore']
}

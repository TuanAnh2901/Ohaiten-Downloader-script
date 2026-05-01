import { base64Decode } from './env'

export interface Metadata {
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
    thumbnail: string
    views: number
    likes: number
}

export function extractMetadata(doc: Document = document): Metadata | null {
    const urlParams = new URLSearchParams(window.location.search)
    const vid = urlParams.get('vid')
    if (!vid) return null

    const titleEl = doc.querySelector('h1.title')
    const title = titleEl?.textContent?.trim() || document.title.split('|')[0].trim()

    const seriesEl = doc.querySelector('.sectiontitle a')
    const series = seriesEl?.textContent?.trim() || ''

    const seriesLink = doc.querySelector('a[href*="sery_video.php?seryid="]')
    const seryid = seriesLink
        ? new URLSearchParams(seriesLink.getAttribute('href')?.split('?')[1] || '').get('seryid')
        : null

    const artist = series

    const tagEls = doc.querySelectorAll('.tagcontainer a')
    const tags: string[] = []
    tagEls.forEach(el => {
        const tag = el.textContent?.trim()
        if (tag) tags.push(tag)
    })

    const longdes = doc.querySelectorAll('.longdes')
    let uploadDate = ''
    let releaseDate: string | null = null

    longdes.forEach(el => {
        const text = el.textContent || ''
        const dateMatch = text.match(/(\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}:\d{2})/) || text.match(/(\d{4}[-/]\d{2}[-/]\d{2})/)
        if (!dateMatch) return

        const dateStr = normalizeDate(dateMatch[1])
        if (text.includes('Publish')) {
            uploadDate = dateStr
        }
        if (text.includes('Last Updated') || text.includes('Updated')) {
            if (!uploadDate) uploadDate = dateStr
        }
        if (text.includes('Release')) {
            releaseDate = dateStr
        }
    })

    if (!uploadDate) {
        const ogDate = doc.querySelector('meta[property*="date"]')
        if (ogDate) {
            const content = ogDate.getAttribute('content')
            if (content) {
                const dateMatch = content.match(/(\d{4}[-/]\d{2}[-/]\d{2})/)
                if (dateMatch) uploadDate = normalizeDate(dateMatch[1])
            }
        }
    }

    const epsContainer = doc.querySelector('.epscontainer')
    const episodes = epsContainer ? Array.from(epsContainer.querySelectorAll('a.interlink, a')) : []
    const totalEpisodes = episodes.length

    let episodeNumber = 0
    if (totalEpisodes > 0) {
        const currentVid = vid
        episodes.forEach((ep, index) => {
            const href = ep.getAttribute('href') || ''
            const epVid = new URLSearchParams(href.split('?')[1] || '').get('vid')
            if (epVid === currentVid) {
                episodeNumber = index + 1
            }
        })
    }

    const thumbnail = extractThumbnail(doc)

    const viewEl = doc.querySelector('.viewcontainer .viewlabel span')
    const views = parseInt(viewEl?.textContent?.replace(/,/g, '') || '0', 10)

    const likeEl = doc.querySelector('#likelabel')
    const likeText = likeEl?.textContent || ''
    const likeMatch = likeText.match(/(\d+)/)
    const likes = likeMatch ? parseInt(likeMatch[1], 10) : 0

    return {
        vid,
        vidDecoded: base64Decode(vid),
        title,
        series,
        seryid,
        artist,
        tags,
        uploadDate,
        releaseDate,
        episodeNumber,
        totalEpisodes,
        thumbnail,
        views,
        likes,
    }
}

function normalizeDate(dateStr: string): string {
    return dateStr.replace(/\//g, '-').trim()
}

function extractThumbnail(doc: Document = document): string {
    const ogImage = doc.querySelector('meta[property="og:image"]')
    if (ogImage) {
        const content = ogImage.getAttribute('content')
        if (content) return content
    }

    const videoImg = doc.querySelector('.video img, #my-video img')
    if (videoImg) {
        const src = videoImg.getAttribute('src')
        if (src) return src.startsWith('http') ? src : `https://ohentai.org/${src}`
    }

    return ''
}

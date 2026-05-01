import { CrawlResult } from './env'

export async function crawlTagPage(tag: string, page: number = 1): Promise<CrawlResult> {
    const url = `https://ohentai.org/tagsearch.php?tag=${encodeURIComponent(tag)}&p=${page}`
    const html = await fetchPage(url)
    return parseVideoListPage(html, page)
}

export async function crawlSeriesPage(seryid: string): Promise<CrawlResult> {
    const url = `https://ohentai.org/sery_video.php?seryid=${seryid}`
    const html = await fetchPage(url)
    return parseSeriesPage(html)
}

export async function crawlAllTagPages(tag: string, maxPages: number = 100, onProgress?: (page: number, total: number) => void): Promise<CrawlResult['videos']> {
    const allVideos: CrawlResult['videos'] = []
    let page = 1
    let hasNext = true

    while (hasNext && page <= maxPages) {
        const result = await crawlTagPage(tag, page)
        allVideos.push(...result.videos)
        hasNext = result.hasNextPage
        page++
        onProgress?.(page - 1, result.totalPages)
    }

    allVideos.reverse()
    return allVideos
}

async function fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: {
            'Referer': 'https://ohentai.org/',
        },
    })
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
    return response.text()
}

function parseVideoListPage(html: string, currentPage: number): CrawlResult {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const videos: CrawlResult['videos'] = []
    const videoBricks = doc.querySelectorAll('.videobrick')

    videoBricks.forEach(brick => {
        const link = brick.querySelector('.videotitle a, a[href*="detail.php?vid="]')
        if (link) {
            const href = link.getAttribute('href') || ''
            const vidMatch = href.match(/vid=([^&]+)/)
            const vid = vidMatch ? vidMatch[1] : ''
            const title = link.textContent?.trim() || ''
            const img = brick.querySelector('img')
            const thumbnail = img?.getAttribute('src') || ''

            if (vid && title) {
                videos.push({
                    vid,
                    title,
                    pageUrl: href.startsWith('http') ? href : `https://ohentai.org/${href}`,
                    thumbnail: thumbnail.startsWith('http') ? thumbnail : `https://ohentai.org/${thumbnail}`,
                })
            }
        }
    })

    const hasNextPage = extractHasNextPage(doc)
    const totalPages = extractTotalPages(doc, currentPage)

    return { videos, hasNextPage, currentPage, totalPages }
}

function parseSeriesPage(html: string): CrawlResult {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const videos: CrawlResult['videos'] = []

    const videoBricks = doc.querySelectorAll('.videobrick')
    videoBricks.forEach(brick => {
        const link = brick.querySelector('.videotitle a, a[href*="detail.php?vid="]')
        if (link) {
            const href = link.getAttribute('href') || ''
            const vidMatch = href.match(/vid=([^&]+)/)
            const vid = vidMatch ? vidMatch[1] : ''
            const title = link.textContent?.trim() || ''
            const img = brick.querySelector('img')
            const thumbnail = img?.getAttribute('src') || ''

            if (vid && title) {
                videos.push({
                    vid,
                    title,
                    pageUrl: href.startsWith('http') ? href : `https://ohentai.org/${href}`,
                    thumbnail: thumbnail.startsWith('http') ? thumbnail : `https://ohentai.org/${thumbnail}`,
                })
            }
        }
    })

    if (videos.length === 0) {
        const epsContainer = doc.querySelector('.epscontainer')
        if (epsContainer) {
            const links = epsContainer.querySelectorAll('a')
            links.forEach(link => {
                const href = link.getAttribute('href') || ''
                const vidMatch = href.match(/vid=([^&]+)/)
                const vid = vidMatch ? vidMatch[1] : ''
                const title = link.textContent?.trim() || ''

                if (vid && title) {
                    videos.push({
                        vid,
                        title,
                        pageUrl: href.startsWith('http') ? href : `https://ohentai.org/${href}`,
                        thumbnail: '',
                    })
                }
            })
        }
    }

    if (videos.length === 0) {
        const fultext = doc.querySelector('.fultext ul')
        if (fultext) {
            const links = fultext.querySelectorAll('li a')
            links.forEach(link => {
                const href = link.getAttribute('href') || ''
                const vidMatch = href.match(/vid=([^&]+)/)
                const vid = vidMatch ? vidMatch[1] : ''
                const title = link.textContent?.trim() || ''

                if (vid && title) {
                    videos.push({
                        vid,
                        title,
                        pageUrl: href.startsWith('http') ? href : `https://ohentai.org/${href}`,
                        thumbnail: '',
                    })
                }
            })
        }
    }

    if (videos.length === 0) {
        const allLinks = doc.querySelectorAll('a[href*="detail.php?vid="]')
        const seen = new Set<string>()
        allLinks.forEach(link => {
            const href = link.getAttribute('href') || ''
            const vidMatch = href.match(/vid=([^&]+)/)
            const vid = vidMatch ? vidMatch[1] : ''
            if (vid && !seen.has(vid)) {
                seen.add(vid)
                const title = link.textContent?.trim() || ''
                if (title) {
                    videos.push({
                        vid,
                        title,
                        pageUrl: href.startsWith('http') ? href : `https://ohentai.org/${href}`,
                        thumbnail: '',
                    })
                }
            }
        })
    }

    return { videos, hasNextPage: false, currentPage: 1, totalPages: 1 }
}

function extractHasNextPage(doc: Document): boolean {
    const pagination = doc.querySelector('.pagination')
    if (!pagination) return false

    const links = pagination.querySelectorAll('a')
    for (const link of links) {
        const href = link.getAttribute('href') || ''
        const text = link.textContent?.trim().toLowerCase()
        if (text === 'next' || text === '»' || text === '>' || href.includes('&p=')) {
            const pageNum = href.match(/p=(\d+)/)
            if (pageNum) {
                const currentActive = pagination.querySelector('.active')
                const currentPageText = currentActive?.textContent?.trim()
                if (currentPageText && /^\d+$/.test(currentPageText)) {
                    return parseInt(pageNum[1], 10) > parseInt(currentPageText, 10)
                }
                return true
            }
        }
    }

    const allPageNums: number[] = []
    links.forEach(link => {
        const href = link.getAttribute('href') || ''
        const pMatch = href.match(/p=(\d+)/)
        if (pMatch) allPageNums.push(parseInt(pMatch[1], 10))
    })
    if (allPageNums.length > 0) {
        const currentActive = pagination.querySelector('.active')
        const currentPageText = currentActive?.textContent?.trim()
        if (currentPageText && /^\d+$/.test(currentPageText)) {
            const current = parseInt(currentPageText, 10)
            return Math.max(...allPageNums) > current
        }
    }

    return false
}

function extractTotalPages(doc: Document, currentPage: number): number {
    const pagination = doc.querySelector('.pagination')
    if (!pagination) return currentPage

    let maxPage = currentPage
    const links = pagination.querySelectorAll('a')
    links.forEach(link => {
        const href = link.getAttribute('href') || ''
        const pMatch = href.match(/p=(\d+)/)
        if (pMatch) {
            const num = parseInt(pMatch[1], 10)
            if (num > maxPage) maxPage = num
        }
        const text = link.textContent?.trim()
        if (text && /^\d+$/.test(text)) {
            const num = parseInt(text, 10)
            if (num > maxPage) maxPage = num
        }
    })

    return maxPage
}

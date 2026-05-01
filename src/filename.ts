import { config } from './config'
import { sanitizeFilename } from './env'
import type { Metadata } from './metadata'

export function generateFilename(metadata: Metadata, forceNumber?: number): string {
    const template = config.get('filenameTemplate')
    const tagSeparator = config.get('tagSeparator')

    const now = new Date()
    const downloadDate = formatDate(now)

    const num = forceNumber ?? metadata.episodeNumber

    const data: Record<string, string> = {
        '%title%': metadata.title,
        '%artist%': metadata.artist,
        '%series%': metadata.series,
        '%tags%': metadata.tags.join(tagSeparator),
        '%publish-date%': metadata.uploadDate || 'unknown',
        '%last-updated%': metadata.releaseDate || metadata.uploadDate || 'unknown',
        '%download-date%': downloadDate,
        '%number%': String(num).padStart(3, '0'),
        '%vid%': metadata.vid,
    }

    let filename = template
    for (const [key, value] of Object.entries(data)) {
        filename = filename.split(key).join(value)
    }

    return sanitizeFilename(filename) + '.mp4'
}

function formatDate(dateStr: string | Date): string {
    if (typeof dateStr === 'string') {
        const d = new Date(dateStr)
        if (!isNaN(d.getTime())) return formatDate(d)
        return dateStr.replace(/\//g, '-').trim()
    }
    const year = dateStr.getFullYear()
    const month = String(dateStr.getMonth() + 1).padStart(2, '0')
    const day = String(dateStr.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

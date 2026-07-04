// Animehay filename templating.
//
// Builds the on-disk filename for a single video using the user's
// `filenameTemplate` and `tagSeparator` config values, with the
// following variables:
//
//   %title%         - video title (e.g. "Quang Am Chi Ngoai Tap 28")
//   %series%        - series / show name from breadcrumb
//   %number%        - zero-padded 3-digit episode number (override via
//                     `forceNumber`)
//   %episode_no%    - raw `episode_no` value from $info_data (e.g. "28")
//   %movie_id%      - numeric movie id (e.g. 4541)
//   %episode_id%    - numeric episode id (e.g. 76147)
//   %download-date% - today's date as YYYY-MM-DD
//
// The output is sanitised via `sanitizeFilename` from `env.ts` (drops
// path separators, control chars, normalises whitespace) and a `.mp4`
// extension is appended unconditionally — the project only deals with
// video downloads from embed players that return MP4/HLS, and forcing
// the extension prevents a "file" without an extension from being
// created on disk.

import { config } from './config'
import { sanitizeFilename } from './env'

export interface AnimehayMetadata {
    title: string
    series: string
    movie_id: number
    episode_id: number
    /** Raw `episode_no` value as it appears in `$info_data` (e.g. "28"). */
    episode_no: string
    /** Numeric 1-based episode number, used by `%number%` when no `forceNumber` is supplied. */
    episodeNumber: number
    poster: string
    uploadDate: string
    tags: string[]
}

const FILENAME_VARIABLES: ReadonlyArray<{
    token: string
    value: (m: AnimehayMetadata, ctx: FilenameContext) => string
}> = [
    { token: '%title%',         value: (m) => m.title || '' },
    { token: '%series%',        value: (m) => m.series || '' },
    { token: '%number%',        value: (m, ctx) => String(ctx.number).padStart(3, '0') },
    { token: '%episode_no%',    value: (m) => m.episode_no || '' },
    { token: '%movie_id%',      value: (m) => String(m.movie_id || 0) },
    { token: '%episode_id%',    value: (m) => String(m.episode_id || 0) },
    { token: '%download-date%', value: (_m, ctx) => ctx.downloadDate },
]

interface FilenameContext {
    number: number
    downloadDate: string
}

export function generateFilename(metadata: AnimehayMetadata, forceNumber?: number): string {
    const template = config.get('filenameTemplate')

    const number = forceNumber ?? metadata.episodeNumber ?? 0
    const ctx: FilenameContext = {
        number,
        downloadDate: formatDate(new Date()),
    }

    let filename = template
    for (const { token, value } of FILENAME_VARIABLES) {
        const replacement = value(metadata, ctx)
        // split/join is allocation-friendly enough at this scale and avoids
        // the regex-escape dance of `String.prototype.replace`.
        filename = filename.split(token).join(replacement)
    }

    return sanitizeFilename(filename) + '.mp4'
}

/**
 * Mirror of `formatDate` from the Ohentai reference: accepts a `Date` and
 * produces a `YYYY-MM-DD` string. Exported for the test suite.
 */
export function formatDate(input: Date | string): string {
    if (typeof input === 'string') {
        const d = new Date(input)
        if (!isNaN(d.getTime())) return formatDate(d)
        // Non-parseable strings fall back to a safe placeholder rather than
        // throwing; this matches the Ohentai behaviour.
        return input.replace(/\//g, '-').trim() || 'unknown'
    }
    const year = input.getFullYear()
    const month = String(input.getMonth() + 1).padStart(2, '0')
    const day = String(input.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

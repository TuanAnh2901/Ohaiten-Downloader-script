import { AnimehayEpisode } from './parser';
export type CrawlerErrorCode = 'http_error' | 'fetch_failed' | 'unrecognized_structure' | 'invalid_argument';
export declare class CrawlerError extends Error {
    readonly code: CrawlerErrorCode;
    readonly status?: number;
    readonly url?: string;
    constructor(message: string, code: CrawlerErrorCode, opts?: {
        status?: number;
        url?: string;
    });
}
/**
 * Resolve the episode list for a watch page. The argument can be:
 *   - raw HTML of a `/xem-phim/...` page, or
 *   - an absolute (or protocol-relative) URL to such a page.
 *
 * HTML detection is intentionally cheap: if the trimmed input starts with `<`
 * we treat it as HTML. Anything else is treated as a URL and fetched.
 *
 * The function reuses `parseWatchPage` from parser.ts so the extraction logic
 * stays in lockstep with the watch-page parser (and the same DOMParser vs.
 * regex fallback applies).
 */
export declare function collectEpisodes(watchHtmlOrUrl: string): Promise<AnimehayEpisode[]>;
/**
 * Resolve the full episode list for a series given its info-page URL
 * (`/thong-tin-phim/{slug}-{movie_id}.html`).
 *
 * Tries three strategies in order and returns the first non-empty result.
 * The matched strategy is logged via console for debugging.
 *
 * Throws a `CrawlerError` with code `unrecognized_structure` when all three
 * strategies yield zero episodes, and `http_error` / `fetch_failed` if the
 * initial GET itself fails.
 */
export declare function collectSeriesEpisodes(infoPageUrl: string): Promise<AnimehayEpisode[]>;
/**
 * Return a copy of `episodes` with the first occurrence of each unique URL
 * preserved. Episodes with an empty URL are dropped.
 */
export declare function deduplicateEpisodes(episodes: AnimehayEpisode[]): AnimehayEpisode[];
/**
 * Return a copy of `episodes` sorted ascending by the numeric value of
 * `ep.no`. Episodes with a non-numeric `no` (e.g. OVA / specials labelled
 * "0" or "") are pushed to the end in their original order.
 */
export declare function sortEpisodesByNumber(episodes: AnimehayEpisode[]): AnimehayEpisode[];
interface FetchResult {
    status: number;
    finalUrl: string;
    body: string;
}
type Requester = (url: string, opts?: {
    referer?: string;
    timeoutMs?: number;
}) => Promise<FetchResult>;
/** Test hook — override the page fetcher. Pass null to restore auto-detection. */
export declare function __setRequesterForTesting(fn: Requester | null): void;
export {};
//# sourceMappingURL=crawler.d.ts.map
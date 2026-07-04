export interface StreamResult {
    url: string;
    source: string;
    quality?: string;
    iframeUrl?: string;
    contentType?: string;
}
export interface NetworkStreamResult {
    streams: StreamResult[];
    warnings: string[];
    timedOut: boolean;
    blocked: boolean;
    blockedDetail?: string;
}
/**
 * Optional injection point for networkExtract. When provided, the function
 * uses these hooks instead of monkey-patching the current window so the
 * same implementation can drive a Playwright/Chromium CDP session.
 */
export interface NetworkCaptureContext {
    /** Install a listener that observes request URLs. */
    onRequest?: (url: string) => void;
    /** Install a listener that observes response URLs and content-types. */
    onResponse?: (url: string, contentType: string) => void;
    /** Optional helper to fetch the source URL and return the response text. */
    fetchSource?: (url: string, referer: string) => Promise<{
        ok: boolean;
        status: number;
        text: string;
    } | null>;
    /** Open the source URL in a hidden context so the page can run JS. */
    openContext?: (url: string, referer: string) => Promise<{
        queryVideoCurrentSrc: () => Promise<string | null>;
        clickPlayControls: () => Promise<boolean>;
        destroy: () => void;
    } | null>;
    /** Override default timeout in ms. */
    timeoutMs?: number;
}
/**
 * Parse iframe HTML for direct media URLs.
 *
 *   iframeHtml   raw HTML body of the embed page
 *   serverName   key into $wp_servers (e.g. 'AHS', 'HY') — used as the
 *                `source` label on each result
 *   sourceUrl    the iframe URL — echoed back as `iframeUrl` on each result
 */
export declare function staticExtract(iframeHtml: string, serverName: string, sourceUrl: string): StreamResult[];
/**
 * Browser/CDP-compatible network fallback.
 *
 * Captures request/response URLs that look like .mp4 / .m3u8, optionally
 * clicks play controls, and reads `<video>.currentSrc`. The default
 * implementation runs in the current page using:
 *
 *   - a fetch + XHR monkey-patch (only active for the duration of the call)
 *   - performance.getEntriesByType('resource') for already-completed entries
 *   - a temporary hidden iframe to load the source URL and read video state
 *
 * When called with a `captureContext` (e.g. from a Playwright bridge), the
 * injected hooks are used directly and no monkey-patching happens.
 */
export declare function networkExtract(sourceUrl: string, referer: string, captureContext?: NetworkCaptureContext): Promise<NetworkStreamResult>;
/**
 * Pick the embed URL for the preferred server, falling back to the first
 * available server. Returns '' if `servers` is empty.
 */
export declare function buildStreamUrl(preferred: string, servers: Record<string, string>): string;
/**
 * Drop URLs from a raw list that match an ad host, popunder path, or
 * non-media extension. Order-preserving.
 */
export declare function filterAdUrls(urls: string[]): string[];
//# sourceMappingURL=extractor.d.ts.map
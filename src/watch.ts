/**
 * Single-episode download for Animehay.
 *
 * Fetches a watch-page URL, locates the embed iframe via the parser +
 * extractor core modules, and shells out to yt-dlp for the actual download.
 */

import { readFile, stat } from 'node:fs/promises';
import { buildYtDlpArgs } from './cmd-builder.js';
import { parseWatchPage } from '@animehay/core/parser.js';
import { buildStreamUrl, staticExtract } from '@animehay/core/extractor.js';
import { downloadWithProgress } from './progress.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DownloadWatchPageOpts {
  /** Referer header sent with HTTP requests (typically the Animehay origin). */
  referer: string;
  /** Optional Netscape-format cookie file path. */
  cookieFile?: string | null;
  /** Absolute or relative path for the output .mp4 file. */
  outPath: string;
  /** Path to yt-dlp executable (defaults to 'yt-dlp'). */
  ytDlpPath?: string;
  /** Concurrent fragments per episode (default 6). */
  concurrentFragments?: number;
  /** Target resolution height (e.g. 480, 720, 1080). */
  res?: number;
  /** Number of retries on error (default 10). */
  retries?: number;
  /** Buffer size string (e.g. "16M"). */
  bufferSize?: string;
  /** Socket timeout in seconds (default 30). */
  socketTimeout?: number;
  /** Temp directory for partial downloads (defaults to system TEMP). */
  tempDir?: string;
  /** When true, skip auto-naming from the parsed page title. */
  noAutoName?: boolean;
  /** Optional progress slot for multi-progress display (series download). */
  progressSlot?: { update: (pct: number, downloaded: string, total: string, speed: string, eta: string) => void; finish: (message: string) => void };
}

export interface DownloadResult {
  outPath: string;
  bytes: number;
  /** True when the file was already present and the download was skipped. */
  skipped?: boolean;
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

export class AnimehayCliError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AnimehayCliError';
  }
}

// ---------------------------------------------------------------------------
// Cookie header helper
// ---------------------------------------------------------------------------

/**
 * Read a Netscape-format cookie file and return an HTTP `Cookie` header value.
 *
 * Each non-comment, non-empty line is expected to have 7 tab-separated fields
 * (Netscape format).  Only the name (field 6) and value (field 7) are used.
 *
 * Returns `{}` when `cookieFile` is null/empty.
 */
export async function cookieHeader(
  cookieFile: string | null,
): Promise<Record<string, string>> {
  if (!cookieFile) return {};

  let raw: string;
  try {
    raw = await readFile(cookieFile, 'utf-8');
  } catch {
    return {};
  }

  const pairs: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip comment lines.
    if (trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    const parts = trimmed.split('\t');
    // Netscape format: domain, domain_flag, path, secure, expiry, name, value
    if (parts.length >= 7) {
      const name = parts[5].trim();
      const value = parts[6].trim();
      if (name) {
        pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
      }
    }
  }

  if (pairs.length === 0) return {};
  return { Cookie: pairs.join('; ') };
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Download a single episode from an Animehay watch page.
 *
 * Flow:
 *  1. Fetch the watch page HTML with `Referer` (and optionally `Cookie`).
 *  2. Parse the HTML via `parseWatchPage` → server map + active server.
 *  3. Resolve the embed iframe URL via `buildStreamUrl`.
 *  4. Fetch the iframe HTML.
 *  5. Extract stream URLs via `staticExtract`.
 *  6. Pick the best stream (prefer m3u8 over mp4).
 *  7. Spawn yt-dlp with the chosen URL.
 *  8. Wait for exit, stat the output file, and return.
 *
 * Throws `AnimehayCliError` when no server/stream is available.
 */
export async function downloadWatchPage(
  url: string,
  opts: DownloadWatchPageOpts,
): Promise<DownloadResult> {
  const headers: Record<string, string> = {
    Referer: opts.referer,
    ...(await cookieHeader(opts.cookieFile ?? null)),
  };

  // 1) Fetch watch page
  const watchResp = await fetch(url, { headers });
  if (!watchResp.ok) {
    throw new AnimehayCliError(
      'FETCH_WATCH_PAGE',
      `Watch page returned HTTP ${watchResp.status}: ${url}`,
    );
  }
  const watchHtml = await watchResp.text();

  // 2) Parse
  const data = parseWatchPage(watchHtml);

  // 3) Resolve iframe URL
  const iframeUrl = buildStreamUrl(data.activeServer, data.serverMap);
  if (!iframeUrl) {
    throw new AnimehayCliError(
      'NO_SERVER',
      'No server available for this episode',
    );
  }

  // 4) Fetch iframe HTML — use the watch page URL as referer for the iframe
  const iframeHeaders: Record<string, string> = {
    Referer: url,
    ...(await cookieHeader(opts.cookieFile ?? null)),
  };
  const iframeResp = await fetch(iframeUrl, { headers: iframeHeaders });
  if (!iframeResp.ok) {
    throw new AnimehayCliError(
      'FETCH_IFRAME',
      `Iframe returned HTTP ${iframeResp.status}: ${iframeUrl}`,
    );
  }
  const iframeHtml = await iframeResp.text();

  // 5) Extract streams
  const streams = staticExtract(iframeHtml, data.activeServer, iframeUrl);
  if (streams.length === 0) {
    throw new AnimehayCliError(
      'NO_STREAM',
      'No stream URL found in embed iframe',
    );
  }

  // 6) Pick stream — prefer m3u8, fall back to first with a URL
  const pick =
    streams.find(s => s.url.toLowerCase().includes('.m3u8')) ?? streams[0];

  // 7) Build output filename from page title (or opts.title) when auto-naming is not disabled
  let finalOutPath = opts.outPath;
  if (!opts.noAutoName && data.title) {
    const sanitized = data.title
      .split('||')[0]
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '')   // remove filesystem-unsafe characters
      .replace(/\s+/g, '-')             // spaces → hyphens
      .replace(/-+/g, '-')              // collapse multiple hyphens
      .replace(/^-|-$/g, '');           // trim leading/trailing hyphens

    if (sanitized) {
      // Keep the directory from outPath, replace filename with sanitized title
      const lastSep = Math.max(opts.outPath.lastIndexOf('/'), opts.outPath.lastIndexOf('\\'));
      const dir = lastSep >= 0 ? opts.outPath.slice(0, lastSep + 1) : '';
      finalOutPath = `${dir}${sanitized}.mp4`;
    }
  }

  // 8) Skip if output file already exists with a reasonable size.
  //    1 MB threshold avoids skipping tiny partial/corrupt files while
  //    reliably catching complete video files (typically 50 MB+).
  const SKIP_MIN_BYTES = 1024 * 1024; // 1 MB
  try {
    const st = await stat(finalOutPath);
    if (st.size >= SKIP_MIN_BYTES) {
      opts.progressSlot?.finish('Skipped (already exists)');
      return { outPath: finalOutPath, bytes: st.size, skipped: true };
    }
  } catch { /* file doesn't exist — proceed */ }

  // 9) Spawn yt-dlp with progress bar — use the watch page URL as referer
  const ytDlpPath = opts.ytDlpPath ?? 'yt-dlp';
  const ytArgs = buildYtDlpArgs({
    url: pick.url,
    referer: url,  // watch page URL, not just origin
    cookieFile: opts.cookieFile ?? null,
    outPath: finalOutPath,
    concurrentFragments: opts.concurrentFragments,
    res: opts.res,
    retries: opts.retries,
    bufferSize: opts.bufferSize,
    socketTimeout: opts.socketTimeout,
    tempDir: opts.tempDir,
  });

  // Label for the progress bar — use page title or fall back to a short label
  const progressLabel = data.title
    ? data.title.split('||')[0].trim().replace(/\s+/g, ' ').substring(0, 50)
    : url.split('/').pop() ?? 'Download';

  const dlResult = await downloadWithProgress(
    ytDlpPath,
    ytArgs,
    progressLabel,
    undefined,
    opts.progressSlot,
  );

  if (dlResult.code !== 0) {
    throw new AnimehayCliError(
      'YT_DLP_FAILED',
      `yt-dlp exited with code ${dlResult.code}`,
    );
  }

  // 10) Stat output — the file yt-dlp actually wrote
  const outFile = finalOutPath.replace(/%(?:\([^)]+\))?s/g, 'mp4').replace(/\.\*$/, '.mp4');
  let bytes = 0;
  try {
    const st = await stat(outFile);
    bytes = st.size;
  } catch {
    // File might be at a different path or stat might fail for other reasons.
    // Since yt-dlp exited with code 0, we assume the download succeeded.
    // Try the original finalOutPath as a fallback.
    try {
      const st = await stat(finalOutPath);
      bytes = st.size;
    } catch {
      // If both fail, return with bytes: 0.
      // This shouldn't happen if yt-dlp succeeded, but handle it gracefully.
    }
  }
  return { outPath: outFile, bytes };
}

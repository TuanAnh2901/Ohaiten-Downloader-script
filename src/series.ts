/**
 * Series bulk download for Animehay.
 *
 * Fetches a series info-page URL (/thong-tin-phim/...), parses the episode
 * list via `parseSeriesPage`, applies optional `--from`/`--to` range
 * filtering, deduplicates and sorts, then downloads each episode through
 * `downloadWatchPage` with a configurable concurrency cap.
 */

import { parseSeriesPage, AnimehayEpisode } from '@animehay/core/parser.js';
import {
  deduplicateEpisodes,
  sortEpisodesByNumber,
} from '@animehay/core/crawler.js';
import { downloadWatchPage } from './watch.js';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { MultiProgress } from './multiprogress.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the episode number from a watch-page URL slug.
 *  URL: .../xem-phim/quang-am-chi-ngoai-tap-28-76147.html
 *  Returns 28, or null if no match. */
export function epNoFromUrl(url: string): number | null {
  const m = url.match(/-tap-(\d+)-/);
  return m ? parseInt(m[1], 10) : null;
}

export function episodeLabelFromLink(link: { title: string; url: string }): string | null {
  const title = link.title.trim().replace(/\s+/g, ' ');
  const ovaMatch = title.match(/^OVA\s*(\d+)$/i);
  if (ovaMatch) return `OVA ${parseInt(ovaMatch[1], 10)}`;

  const tapMatch = title.match(/^(?:T[aậ]p|Tap)\s*(\d+)$/i);
  if (tapMatch) return String(parseInt(tapMatch[1], 10));

  if (/^\d+$/.test(title)) {
    return String(epNoFromUrl(link.url) ?? parseInt(title, 10));
  }

  const urlNo = epNoFromUrl(link.url);
  return urlNo === null ? null : String(urlNo);
}

function displayEpisodeLabel(no: string): string {
  return /^\d+$/.test(no) ? `Tap ${no}` : no;
}

function sanitizeFilePart(value: string): string {
  return value
    .split('||')[0]
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Strip "Next Tập X" or "Tập X" suffix from a series title.
 *  Input: "Phim Quang Âm Chi Ngoại Next Tập 29"
 *  Output: "Phim Quang Âm Chi Ngoại"
 *  Also strips "|| SiteName" suffix. */
export function cleanSeriesTitle(raw: string): string {
  return raw
    .split('||')[0]
    .trim()
    .replace(/\s+(?:Next\s+)?T[aậ]p\s+\d+\s*$/i, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeriesOptions {
  /** Referer header sent with HTTP requests (typically the Animehay origin). */
  referer: string;
  /** Optional Netscape-format cookie file path. */
  cookieFile?: string | null;
  /** Output directory for downloaded episode files. */
  outDir: string;
  /** When true, create a sanitized per-series subdirectory inside outDir. */
  outputDirPerSeries?: boolean;
  /** Max concurrent downloads (default 3). */
  jobs?: number;
  /** Path to yt-dlp executable (defaults to 'yt-dlp'). */
  ytDlpPath?: string;
  /** Inclusive lower bound on episode id to download. */
  from?: number;
  /** Inclusive upper bound on episode id to download. */
  to?: number;
  /** Series title used for output filenames. */
  seriesTitle?: string;
  /** Concurrent fragments per episode (default 6). */
  concurrentFragments?: number;
  /** Target resolution height (e.g. 480, 720, 1080). */
  res?: number;
  /** Number of retries on error (default 10). */
  retries?: number;
  /** Buffer size string (e.g. "32M"). */
  bufferSize?: string;
  /** Socket timeout in seconds (default 30). */
  socketTimeout?: number;
  /** Temp directory for partial downloads (defaults to system TEMP). */
  tempDir?: string;
  /** Number of retry attempts per failed episode (default 3). */
  episodeRetries?: number;
  /** Called immediately before each episode download begins. */
  onEpisodeStart?: (ep: { title: string; no: string }) => void;
  /** Called after each episode download completes (success or failure). */
  onEpisodeDone?: (
    ep: { title: string; no: string },
    result: { ok: boolean; bytes?: number; skipped?: boolean },
  ) => void;
}

// ---------------------------------------------------------------------------
// downloadSeries
// ---------------------------------------------------------------------------

/**
 * Download all (or ranged) episodes from an Animehay series info page.
 *
 * Steps:
 *  1. Fetch the info-page HTML with the configured `Referer`.
 *  2. Parse via `parseSeriesPage` → structured episode data.
 *  3. Convert `SeriesEpisodeLink[]` to `AnimehayEpisode[]`.
 *  4. Filter by `from`/`to` range (on the numeric `id`).
 *  5. Deduplicate by URL.
 *  6. Sort ascending by episode number.
 *  7. Download episodes in batches of size `jobs` via `downloadWatchPage`.
 *  8. Aggregate and return `{ ok, failed, skipped }`.
 */
export async function downloadSeries(
  infoPageUrl: string,
  opts: SeriesOptions,
): Promise<{ ok: number; failed: number; skipped: number }> {
  // 1) Fetch the info page
  const resp = await fetch(infoPageUrl, {
    headers: { Referer: opts.referer },
  });
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch series page: HTTP ${resp.status} – ${infoPageUrl}`,
    );
  }
  const html = await resp.text();

  // 2) Parse
  const data = parseSeriesPage(html);

  // 3) Filter to only links belonging to this series (exclude related movies).
  //     The info page URL is /thong-tin-phim/<series-slug>-XXXX.html; episode
  //     URLs contain the same slug while related-movie links point to other series.
  const slugMatch = infoPageUrl.match(/\/thong-tin-phim\/(.+?)-\d+\.html$/i);
  const seriesSlug = slugMatch ? slugMatch[1] : null;
  const ownLinks = seriesSlug
    ? data.episodeLinks.filter(link => link.url.includes(seriesSlug))
    : data.episodeLinks;

  // 4) Convert to AnimehayEpisode[] for dedup/sort.
  //     Also filter out "Next" placeholder links (non-numeric titles like
  //     "Xem ngay" / "play_circle_outline Xem ngay") and extract episode
  //     numbers from URL slugs (e.g. `-tap-28-`) instead of the DB id.
  const episodes: AnimehayEpisode[] = ownLinks
    .filter((link) => {
      return episodeLabelFromLink(link) !== null;
    })
    .map((link) => ({
      title: link.title,
      url: link.url,
      no: episodeLabelFromLink(link) ?? String(link.id),
      episodeId: link.id,
    }));

  // 4) Range filter by numeric id
  const ranged =
    opts.from === undefined && opts.to === undefined
      ? episodes
      : episodes.filter((ep) => {
          const n = parseInt(ep.no, 10);
          if (!Number.isFinite(n)) return false;
          if (opts.from !== undefined && n < opts.from) return false;
          if (opts.to !== undefined && n > opts.to) return false;
          return true;
        });

  // 5) Dedup by URL
  const deduped = deduplicateEpisodes(ranged);

  // 6) Sort ascending by no
  const sorted = sortEpisodesByNumber(deduped);

  // 7) Download with concurrency cap (worker pool — always keeps jobs active)
  const jobs = opts.jobs && opts.jobs > 0 ? opts.jobs : 3;
  let ok = 0;
  let failed = 0;
  let skipped = 0;

  // Sanitize series title once for all filenames
  const seriesName = opts.seriesTitle || cleanSeriesTitle(data.title) || 'Series';
  const sanitizedSeries = sanitizeFilePart(seriesName);

  const targetOutDir = opts.outputDirPerSeries
    ? join(opts.outDir, sanitizedSeries || 'Series')
    : opts.outDir;
  try { await mkdir(targetOutDir, { recursive: true }); } catch { /* ignore */ }

  // Multi-line progress display
  const mp = new MultiProgress();
  let cursor = 0;

  const maxRetries = opts.episodeRetries && opts.episodeRetries > 0 ? opts.episodeRetries : 3;

  const downloadOne = async (): Promise<void> => {
    while (cursor < sorted.length) {
      const idx = cursor++;
      const ep = sorted[idx];
      const label = displayEpisodeLabel(ep.no);
      const slot = mp.createSlot(label);
      const epFile = `${sanitizedSeries} - ${sanitizeFilePart(label)}.mp4`;
      const outPath = join(targetOutDir, epFile);

      opts.onEpisodeStart?.({ title: ep.title, no: ep.no });

      // Retry loop: try up to maxRetries times on failure.
      // Skipped files (already downloaded) count as success on first try.
      let success = false;
      let lastResult: { ok: boolean; bytes?: number; skipped?: boolean } = { ok: false };
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= maxRetries && !success; attempt++) {
        try {
          const result = await downloadWatchPage(ep.url, {
            referer: opts.referer,
            cookieFile: opts.cookieFile ?? null,
            outPath,
            ytDlpPath: opts.ytDlpPath,
            concurrentFragments: opts.concurrentFragments,
            res: opts.res,
            retries: opts.retries,
            bufferSize: opts.bufferSize,
            socketTimeout: opts.socketTimeout,
            tempDir: opts.tempDir,
            noAutoName: true,
            progressSlot: slot,
          });
          success = true;
          lastResult = { ok: true, bytes: result.bytes, skipped: result.skipped };
          if (result.skipped) {
            slot.finish('[SKIP] Already exists');
          }
        } catch (err) {
          lastError = err;
          if (attempt < maxRetries) {
            slot.update(0, '0B', '?', '0B/s', `Retry ${attempt}/${maxRetries}`);
          }
          lastResult = { ok: false };
          // Suppress error on non-final attempts; only count as failed
          // after all retries are exhausted.
        }
      }

      if (success) {
        if (lastResult.skipped) {
          skipped++;
        } else {
          ok++;
        }
      } else {
        failed++;
        const message = lastError instanceof Error ? lastError.message : String(lastError);
        console.error(`[ERROR] ${label}: ${message}`);
      }
      opts.onEpisodeDone?.({ title: ep.title, no: ep.no }, lastResult);
    }
  };

  const effectiveJobs = Math.min(jobs, sorted.length);
  const workers = Array.from({ length: effectiveJobs }, () => downloadOne());
  await Promise.all(workers);

  return { ok, failed, skipped };
}

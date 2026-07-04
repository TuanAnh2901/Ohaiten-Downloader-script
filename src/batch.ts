/**
 * Batch URL processing for Animehay.
 *
 * Reads a text file containing one URL per line (with `#` comments and
 * blank lines skipped) and processes each URL sequentially. Watch pages
 * (`/xem-phim/`) and series pages (`/thong-tin-phim/`) are auto-detected
 * and routed to the appropriate downloader. Series downloads still use
 * the `--jobs` concurrency cap internally; URLs in a batch are processed
 * strictly one after another.
 */

/** Options accepted by {@link processBatch}. */
export interface BatchOptions {
  /** Referer header sent with HTTP requests (typically the Animehay origin). */
  referer: string;
  /** Optional Netscape-format cookie file path. */
  cookieFile?: string | null;
  /** Output directory for downloaded files. */
  outputDir: string;
  /** When true, series downloads are placed into a subdirectory per series. */
  outputDirPerSeries?: boolean;
  /** Path to yt-dlp executable (defaults to 'yt-dlp'). */
  ytDlpPath?: string;
  /** Max concurrent episodes within a series (default 3). */
  jobs?: number;
  /** Concurrent fragments per episode (default 16). */
  concurrentFragments?: number;
  /** Inclusive lower bound on episode id (series only). */
  from?: number;
  /** Inclusive upper bound on episode id (series only). */
  to?: number;
  /** When true, print yt-dlp command / episode list without downloading. */
  dryRun?: boolean;
  /** Verbose output (forwarded to series hooks). */
  verbose?: boolean;
  /** Target resolution height (e.g. 480, 720, 1080). */
  res?: number;
  /** Number of retries on error (default 10). */
  retries?: number;
  /** Buffer size string (e.g. "32M"). */
  bufferSize?: string;
  /** Socket timeout in seconds (default 30). */
  socketTimeout?: number;
  /** Temp directory for partial downloads. */
  tempDir?: string;
  /** Number of retry attempts per failed episode (series only, default 3). */
  episodeRetries?: number;
}

/** Aggregated result of a batch run. */
export interface BatchResult {
  total: number;
  ok: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive the watch-page outPath from a URL, mirroring `index.ts`:
 *   `<outputDir>/<last path segment, .html stripped>.mp4`
 */
function watchOutPath(outputDir: string, url: string): string {
  const last = url.split('/').pop() ?? '';
  const slug = last.replace(/\.html$/i, '') || 'output';
  return `${outputDir}/${slug}.mp4`;
}

// ---------------------------------------------------------------------------
// processBatch
// ---------------------------------------------------------------------------

/**
 * Read `batchFile`, parse one URL per non-comment, non-empty line, and
 * process each URL sequentially. Per-URL failures are caught and logged so
 * that one bad URL never aborts the rest of the batch.
 *
 * In `--dry-run` mode the actual downloader is not invoked: watch URLs
 * print the would-be yt-dlp command, and series URLs print the resolved
 * episode list (after fetching and parsing the page).
 */
export async function processBatch(
  batchFile: string,
  opts: BatchOptions,
): Promise<BatchResult> {
  const { readFile } = await import('node:fs/promises');
  const { mkdir } = await import('node:fs/promises');
  const { detectUrlType } = await import('./url-detect.js');

  // 1) Read and parse the batch file
  let raw: string;
  try {
    raw = await readFile(batchFile, 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[ERROR] Cannot read batch file '${batchFile}': ${message}`);
    return { total: 0, ok: 0, failed: 0 };
  }

  const urls = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  const total = urls.length;
  if (total === 0) {
    console.log('[INFO] Batch file contains no URLs');
    return { total: 0, ok: 0, failed: 0 };
  }

  // 2) Ensure output dir exists (best-effort — same pattern as index.ts)
  try { await mkdir(opts.outputDir, { recursive: true }); } catch { /* ignore */ }

  // 3) Process each URL sequentially
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i++) {
    const current = i + 1;
    const url = urls[i];
    console.log(`[INFO] [${current}/${total}] Processing: ${url}`);

    const type = detectUrlType(url);
    if (type === 'unknown') {
      console.error(
        `[ERROR] [${current}/${total}] Failed: Cannot determine URL type: ${url}`,
      );
      failed++;
      continue;
    }

    try {
      if (type === 'watch') {
        const outPath = watchOutPath(opts.outputDir, url);
        if (opts.dryRun) {
          const { buildYtDlpArgs } = await import('./cmd-builder.js');
          const args = buildYtDlpArgs({
            url,
            referer: opts.referer,
            cookieFile: opts.cookieFile ?? null,
            outPath,
            concurrentFragments: opts.concurrentFragments,
            res: opts.res,
            retries: opts.retries,
            bufferSize: opts.bufferSize,
            socketTimeout: opts.socketTimeout,
            tempDir: opts.tempDir,
          });
          console.log(`[DRY-RUN] ${opts.ytDlpPath ?? 'yt-dlp'} ${args.join(' ')}`);
        } else {
          const { downloadWatchPage } = await import('./watch.js');
          const result = await downloadWatchPage(url, {
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
          });
          const tag = result.skipped ? '[SKIP]' : '[OK]';
          console.log(
            `${tag} [${current}/${total}] ${result.outPath} (${result.bytes} bytes)`,
          );
        }
        ok++;
      } else {
        // series
        if (opts.dryRun) {
          // Mirror the series --dry-run path in index.ts: fetch + parse + filter
          const { parseSeriesPage } = await import('@animehay/core/parser.js');
          const { cleanSeriesTitle, episodeLabelFromLink } = await import('./series.js');
          const resp = await fetch(url, { headers: { Referer: opts.referer } });
          if (!resp.ok) {
            throw new Error(
              `Failed to fetch series page: HTTP ${resp.status} – ${url}`,
            );
          }
          const html = await resp.text();
          const data = parseSeriesPage(html);
          // Exclude related-movie links that don't belong to this series
          const slugMatch = url.match(/\/thong-tin-phim\/(.+?)-\d+\.html$/i);
          const seriesSlug = slugMatch ? slugMatch[1] : null;
          const ownLinks = seriesSlug
            ? data.episodeLinks.filter(link => link.url.includes(seriesSlug))
            : data.episodeLinks;
          const episodes = ownLinks.filter(e => {
            const label = episodeLabelFromLink(e);
            if (label === null) return false;
            const epNo = parseInt(label, 10);
            if (!Number.isFinite(epNo)) return true;
            if (opts.from && epNo < opts.from) return false;
            if (opts.to && epNo > opts.to) return false;
            return true;
          });
          const cleanedTitle = cleanSeriesTitle(data.title);
          console.log(
            `[DRY-RUN] Series: "${cleanedTitle}" — would download ${episodes.length} episode(s)`,
          );
          episodes.forEach(ep => {
            const label = episodeLabelFromLink(ep);
            console.log(`  ${/^\d+$/.test(label ?? '') ? `Tap ${label}` : label}`);
          });
        } else {
          const { downloadSeries } = await import('./series.js');
          const result = await downloadSeries(url, {
            referer: opts.referer,
            cookieFile: opts.cookieFile ?? null,
            outDir: opts.outputDir,
            outputDirPerSeries: opts.outputDirPerSeries,
            jobs: opts.jobs,
            ytDlpPath: opts.ytDlpPath,
            from: opts.from,
            to: opts.to,
            concurrentFragments: opts.concurrentFragments,
            res: opts.res,
            retries: opts.retries,
            bufferSize: opts.bufferSize,
            socketTimeout: opts.socketTimeout,
            tempDir: opts.tempDir,
            episodeRetries: opts.episodeRetries,
            onEpisodeStart: (ep) =>
              opts.verbose && console.log(`[INFO] Starting: ${ep.title}`),
            onEpisodeDone: (ep, r) =>
              opts.verbose &&
              console.log(`${r.ok ? '[OK]' : '[FAIL]'} ${ep.title}`),
          });
          console.log(
            `[DONE] [${current}/${total}] Series: ${result.ok} downloaded, ${result.skipped} skipped, ${result.failed} failed`,
          );
        }
        ok++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ERROR] [${current}/${total}] Failed: ${message}`);
      failed++;
    }
  }

  console.log(`[DONE] Batch complete: ${ok} ok, ${failed} failed, ${total} total`);
  return { total, ok, failed };
}

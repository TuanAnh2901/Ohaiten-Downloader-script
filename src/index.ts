#!/usr/bin/env node
import { Command } from 'commander';
import { installGmShim } from './core-shim.js';

// Called BEFORE any @animehay/core import touches config
installGmShim();

const program = new Command();

// Commander v12 passes `(value, default)` to processors; parseInt interprets
// the default as radix.  Use this wrapper to force base-10.
const int = (v: string) => parseInt(v, 10);

program
  .name('animehay')
  .description('Download videos from animehay.tv — a mini yt-dlp for one site')
  .version('0.1.0');

// Cookies sub-command
program
  .command('cookies')
  .description('Export browser cookies for animehay')
  .command('export')
  .argument('<browser>', 'Browser name: chrome, firefox, edge, brave, opera, chromium')
  .argument('<outPath>', 'Output file path for Netscape-format cookies')
  .action(async (browser, outPath) => {
    const { exportCookiesFromBrowser, isValidBrowser } = await import('./cookies.js');
    if (!isValidBrowser(browser)) {
      console.error(`[ERROR] Invalid browser '${browser}'. Valid: chrome, firefox, edge, brave, opera, chromium`);
      process.exit(1);
    }
    const result = await exportCookiesFromBrowser(browser, outPath);
    if (result.ok) {
      console.log(`[OK] Cookies exported to ${outPath} (${result.bytes} bytes)`);
    } else {
      console.error(`[ERROR] Cookie export ${result.reason}: ${result.detail}`);
      process.exit(1);
    }
  });

// Main download command
program
  .argument('[url]', 'Watch page or info page URL')
  .option('--batch <file>', 'Batch file with URLs (one per line)')
  .option('--referer <url>', 'Referer URL', 'https://animehay.tv/')
  .option('--cookies <file>', 'Netscape-format cookie file')
  .option('--output-dir <dir>', 'Output directory', './downloads/')
  .option('--no-output-dir-per-series', 'Disable per-series subdirectory (all episodes go directly in output-dir)', true)
  .option('--yt-dlp-path <path>', 'yt-dlp binary path', 'yt-dlp')
  .option('--jobs <n>', 'Concurrent episodes (series only)', int, 3)
  .option('--concurrent-fragments <n>', 'Concurrent fragments per episode', int, 16)
  .option('--from <n>', 'First episode number (series only)', int)
  .option('--to <n>', 'Last episode number (series only)', int)
  .option('--dry-run', 'Print the yt-dlp command without executing', false)
  .option('--verbose', 'Verbose output', false)
  .option('--res <height>', 'Target resolution (e.g. 480, 720, 1080)', int)
  .option('--retries <n>', 'Download retry count', int, 10)
  .option('--buffer-size <size>', 'Download buffer size', '32M')
  .option('--socket-timeout <seconds>', 'Socket timeout in seconds', int, 30)
  .option('--temp <dir>', 'Temp directory for partial downloads')
  .option('--episode-retries <n>', 'Retry attempts per failed episode (series only)', int, 3)
  .option('--install-yt-dlp', 'Download yt-dlp and exit', false)
   .action(async (url, options) => {
    // --install-yt-dlp standalone mode
    if (options.installYtDlp) {
      const { ensureYtDlp } = await import('./install-ytdlp.js');
      const path = await ensureYtDlp(options.ytDlpPath);
      if (path) {
        console.log(`[OK] yt-dlp ready at: ${path}`);
      } else {
        console.error(`[ERROR] Could not install yt-dlp. Try: winget install yt-dlp`);
        process.exit(1);
      }
      return;
    }

    // Neither URL nor batch file → nothing to do
    if (!url && !options.batch) {
      console.error(
        '[ERROR] Missing required argument: provide either <url> or --batch <file>',
      );
      process.exit(1);
    }

    // Batch mode: dispatch to processBatch and skip single-URL processing
    if (options.batch) {
      // Auto-detect referer from the first URL in the batch file when the
      // referer was left at its default. Best-effort: fall back to the
      // default if the file can't be read or the first line is invalid.
      if (!options.referer || options.referer === 'https://animehay.tv/') {
        try {
          const { readFile } = await import('node:fs/promises');
          const raw = await readFile(options.batch, 'utf-8');
          const firstLine = raw
            .split(/\r?\n/)
            .map(l => l.trim())
            .find(l => l.length > 0 && !l.startsWith('#'));
          if (firstLine) {
            options.referer = new URL(firstLine).origin;
          }
        } catch { /* keep default */ }
      }

      // Preflight: ensure yt-dlp exists (auto-download if missing)
      if (!options.dryRun) {
        const { ensureYtDlp } = await import('./install-ytdlp.js');
        const resolved = await ensureYtDlp(options.ytDlpPath);
        if (!resolved) {
          console.error(`[ERROR] yt-dlp not found and auto-download failed. Install manually: winget install yt-dlp`);
          process.exit(1);
        }
        options.ytDlpPath = resolved;
      }

      const { processBatch } = await import('./batch.js');
      await processBatch(options.batch, {
        referer: options.referer,
        cookieFile: options.cookies,
        outputDir: options.outputDir,
        outputDirPerSeries: options.outputDirPerSeries,
        ytDlpPath: options.ytDlpPath,
        jobs: options.jobs,
        concurrentFragments: options.concurrentFragments,
        from: options.from,
        to: options.to,
        dryRun: options.dryRun,
        verbose: options.verbose,
        res: options.res,
        retries: options.retries,
        bufferSize: options.bufferSize,
        socketTimeout: options.socketTimeout,
        tempDir: options.temp,
        episodeRetries: options.episodeRetries,
      });
      return;
    }

    // Auto-detect referer from URL origin if not explicitly set
    if (!options.referer || options.referer === 'https://animehay.tv/') {
      try { options.referer = new URL(url).origin } catch { /* keep default */ }
    }
    // Preflight: ensure yt-dlp exists (auto-download if missing)
    if (!options.dryRun) {
      const { ensureYtDlp } = await import('./install-ytdlp.js');
      const resolved = await ensureYtDlp(options.ytDlpPath);
      if (!resolved) {
        console.error(`[ERROR] yt-dlp not found and auto-download failed. Install manually: winget install yt-dlp`);
        process.exit(1);
      }
      options.ytDlpPath = resolved;
    }

    // Auto-detect URL type
    const { detectUrlType } = await import('./url-detect.js');
    const type = detectUrlType(url);
    if (type === 'unknown') {
      console.error(`[ERROR] Cannot determine URL type: ${url}. URL must contain /xem-phim/ or /thong-tin-phim/`);
      process.exit(1);
    }

    const ensureDir = async () => {
      const { mkdir } = await import('node:fs/promises');
      try { await mkdir(options.outputDir, { recursive: true }); } catch { /* ignore */ }
    };

    if (type === 'watch') {
      const { downloadWatchPage } = await import('./watch.js');
      const outPath = `${options.outputDir}/${url.split('/').pop()?.replace(/\.html$/, '') || 'output'}.mp4`;
      await ensureDir();
      if (options.dryRun) {
        const { buildYtDlpArgs } = await import('./cmd-builder.js');
        const args = buildYtDlpArgs({
          url,
          referer: options.referer,
          cookieFile: options.cookies,
          outPath,
          concurrentFragments: options.concurrentFragments,
          res: options.res,
          retries: options.retries,
          bufferSize: options.bufferSize,
          socketTimeout: options.socketTimeout,
          tempDir: options.temp,
        });
        console.log(`[DRY-RUN] ${options.ytDlpPath} ${args.join(' ')}`);
        return;
      }
      const result = await downloadWatchPage(url, {
        referer: options.referer,
        cookieFile: options.cookies,
        outPath,
        ytDlpPath: options.ytDlpPath,
        concurrentFragments: options.concurrentFragments,
        res: options.res,
        retries: options.retries,
        bufferSize: options.bufferSize,
        socketTimeout: options.socketTimeout,
        tempDir: options.temp,
      });
      if (result.skipped) {
        console.log(`[SKIP] ${result.outPath} (already exists, ${result.bytes} bytes)`);
      } else {
        console.log(`[OK] ${result.outPath} (${result.bytes} bytes)`);
      }
    } else { // series
      const { downloadSeries } = await import('./series.js');
      await ensureDir();
      if (options.dryRun) {
        // For dry-run on series, print what would be resolved
        const { parseSeriesPage } = await import('@animehay/core/parser.js');
        const { cleanSeriesTitle, episodeLabelFromLink } = await import('./series.js');
        const response = await fetch(url, { headers: { Referer: options.referer } });
        const html = await response.text();
        const data = parseSeriesPage(html);
        // Exclude related-movie links that don't belong to this series
        const slugMatch = url.match(/\/thong-tin-phim\/(.+?)-\d+\.html$/i);
        const seriesSlug = slugMatch ? slugMatch[1] : null;
        const ownLinks = seriesSlug
          ? data.episodeLinks.filter(link => link.url.includes(seriesSlug))
          : data.episodeLinks;
        const episodes = ownLinks
          .filter(e => {
            const label = episodeLabelFromLink(e);
            if (label === null) return false;
            const epNo = parseInt(label, 10);
            if (!Number.isFinite(epNo)) return true;
            if (options.from && epNo < options.from) return false;
            if (options.to && epNo > options.to) return false;
            return true;
          });
        const cleanedTitle = cleanSeriesTitle(data.title);
        console.log(`[DRY-RUN] Series: "${cleanedTitle}" — would download ${episodes.length} episode(s)`);
        episodes.forEach(ep => {
          const label = episodeLabelFromLink(ep);
          console.log(`  ${/^\d+$/.test(label ?? '') ? `Tap ${label}` : label}`);
        });
        return;
      }
      const result = await downloadSeries(url, {
        referer: options.referer,
        cookieFile: options.cookies,
        outDir: options.outputDir,
        outputDirPerSeries: options.outputDirPerSeries,
        jobs: options.jobs,
        ytDlpPath: options.ytDlpPath,
        from: options.from,
        to: options.to,
        concurrentFragments: options.concurrentFragments,
        res: options.res,
        retries: options.retries,
        bufferSize: options.bufferSize,
        socketTimeout: options.socketTimeout,
        tempDir: options.temp,
        episodeRetries: options.episodeRetries,
        onEpisodeStart: (ep) => options.verbose && console.log(`[INFO] Starting: ${ep.title}`),
        onEpisodeDone: (ep, r) => options.verbose && console.log(`${r.skipped ? '[SKIP]' : r.ok ? '[OK]' : '[FAIL]'} ${ep.title}`),
      });
      const parts = [];
      if (result.ok > 0) parts.push(`${result.ok} downloaded`);
      if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
      if (result.failed > 0) parts.push(`${result.failed} failed`);
      console.log(`[DONE] ${parts.join(', ') || '0 episodes'}`);
    }
  });

// Error handlers
process.on('unhandledRejection', (err: Error) => {
  console.error(`[ERROR] Unhandled rejection: ${err.message}`);
  process.exit(1);
});
process.on('uncaughtException', (err: Error) => {
  console.error(`[ERROR] Uncaught exception: ${err.message}`);
  process.exit(1);
});

// Only run if this is the main module (or SEA binary)
// In SEA mode, process.argv[1] is the exe path (not the script path)
const isMain = process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.cjs') || process.argv[1]?.endsWith('index.ts') || process.argv[1] === process.execPath;
if (isMain) {
  program.parseAsync(process.argv).catch((err: Error) => {
    console.error(`[ERROR] ${err.message}`);
    process.exit(1);
  });
}

export default program;

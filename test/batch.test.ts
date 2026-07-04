/**
 * Tests for src/batch.ts — sequential batch URL processing.
 *
 * `fs/promises.readFile` is mocked so we never hit the real filesystem;
 * `src/watch.js` and `src/series.js` are mocked so we never spawn yt-dlp.
 * `parseSeriesPage` (from @animehay/core/parser.js) is mocked because
 * `processBatch` imports it dynamically during the series --dry-run path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any import of the SUT.
// ---------------------------------------------------------------------------

// Control the file contents the batch loader sees.
const readFileMock = vi.fn();
const mkdirMock = vi.fn().mockResolvedValue(undefined);

vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => readFileMock(...args),
  mkdir: (...args: unknown[]) => mkdirMock(...args),
}));

// Watch + series downloader mocks — no real yt-dlp spawns in tests.
const downloadWatchPageMock = vi.fn();
const downloadSeriesMock = vi.fn();
const epNoFromUrlMock = vi.fn();
const cleanSeriesTitleMock = vi.fn();

vi.mock('../src/watch.js', () => ({
  downloadWatchPage: (...args: unknown[]) => downloadWatchPageMock(...args),
}));

vi.mock('../src/series.js', () => ({
  downloadSeries: (...args: unknown[]) => downloadSeriesMock(...args),
  downloadWatchPage: (...args: unknown[]) => downloadWatchPageMock(...args),
  epNoFromUrl: (...args: unknown[]) => epNoFromUrlMock(...args),
  cleanSeriesTitle: (...args: unknown[]) => cleanSeriesTitleMock(...args),
  episodeLabelFromLink: vi.fn((link: { title: string }) => {
    if (/^\d+$/.test(link.title)) return link.title;
    const ova = link.title.match(/^OVA\s*(\d+)$/i);
    return ova ? `OVA ${ova[1]}` : null;
  }),
}));

// Core parser mock — used by the series --dry-run path in batch.ts.
vi.mock('@animehay/core/parser.js', () => ({
  parseSeriesPage: vi.fn((_html: string) => ({
    title: 'Batch Series || AnimeHay',
    episodeLinks: [
      { id: 1, title: '1', url: 'https://animehay.tv/xem-phim/series-tap-1-10.html' },
      { id: 2, title: '2', url: 'https://animehay.tv/xem-phim/series-tap-2-11.html' },
      { id: 3, title: '3', url: 'https://animehay.tv/xem-phim/series-tap-3-12.html' },
    ],
  })),
}));

// ---------------------------------------------------------------------------
// SUT import (must come after vi.mock declarations).
// ---------------------------------------------------------------------------

import { processBatch, type BatchOptions } from '../src/batch.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default BatchOptions used across tests; tests can override fields. */
function makeOpts(overrides: Partial<BatchOptions> = {}): BatchOptions {
  return {
    referer: 'https://animehay.tv/',
    outputDir: './downloads',
    ytDlpPath: 'yt-dlp',
    jobs: 2,
    concurrentFragments: 4,
    ...overrides,
  };
}

/** Configure parseSeriesPage to produce the supplied episode links. */
function stubParseSeriesPage(links: { id: number; title: string; url: string }[]): void {
  const { parseSeriesPage } = require('@animehay/core/parser.js') as {
    parseSeriesPage: ReturnType<typeof vi.fn>;
  };
  parseSeriesPage.mockReturnValue({ title: 'Series || AnimeHay', episodeLinks: links });
}

/** Default epNoFromUrl: parse `-tap-N-` out of the URL. */
function defaultEpNoFromUrl(url: string): number | null {
  const m = url.match(/-tap-(\d+)-/);
  return m ? parseInt(m[1], 10) : null;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('processBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    epNoFromUrlMock.mockImplementation(defaultEpNoFromUrl);
    cleanSeriesTitleMock.mockImplementation((raw: string) => raw.split('||')[0].trim());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Test 1 — watch URLs only
  // -----------------------------------------------------------------------
  it('processes a batch of watch URLs and returns total/ok/failed counts', async () => {
    readFileMock.mockResolvedValueOnce(
      'https://animehay.tv/xem-phim/ep-1-100.html\n' +
      'https://animehay.tv/xem-phim/ep-2-200.html\n' +
      'https://animehay.tv/xem-phim/ep-3-300.html\n',
    );

    downloadWatchPageMock.mockResolvedValue({ outPath: 'out.mp4', bytes: 1234 });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const result = await processBatch('urls.txt', makeOpts());

      expect(result).toEqual({ total: 3, ok: 3, failed: 0 });
      expect(downloadWatchPageMock).toHaveBeenCalledTimes(3);

      // Slug is derived from the last URL segment with .html stripped
      expect(downloadWatchPageMock).toHaveBeenNthCalledWith(
        1,
        'https://animehay.tv/xem-phim/ep-1-100.html',
        expect.objectContaining({ outPath: './downloads/ep-1-100.mp4' }),
      );
      expect(downloadWatchPageMock).toHaveBeenNthCalledWith(
        3,
        'https://animehay.tv/xem-phim/ep-3-300.html',
        expect.objectContaining({ outPath: './downloads/ep-3-300.mp4' }),
      );

      // Per-URL progress messages + final summary
      const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(allOutput).toContain('[INFO] [1/3] Processing:');
      expect(allOutput).toContain('[INFO] [3/3] Processing:');
      expect(allOutput).toContain('[OK] [1/3] out.mp4 (1234 bytes)');
      expect(allOutput).toContain('[OK] [3/3] out.mp4 (1234 bytes)');
      expect(allOutput).toContain('[DONE] Batch complete: 3 ok, 0 failed, 3 total');

      // Series module must NOT have been called
      expect(downloadSeriesMock).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 2 — series URLs only
  // -----------------------------------------------------------------------
  it('processes a batch of series URLs and aggregates ok/failed counts', async () => {
    readFileMock.mockResolvedValueOnce(
      'https://animehay.tv/thong-tin-phim/series-a.html\n' +
      'https://animehay.tv/thong-tin-phim/series-b.html\n',
    );

    // First series: 2 ok; second series: 1 ok, 1 failed
    downloadSeriesMock
      .mockResolvedValueOnce({ ok: 2, failed: 0, skipped: 0 })
      .mockResolvedValueOnce({ ok: 1, failed: 1, skipped: 0 });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const result = await processBatch('urls.txt', makeOpts());

      // Per-URL ok/failed aggregates to a single BatchResult
      expect(result).toEqual({ total: 2, ok: 2, failed: 0 });
      expect(downloadSeriesMock).toHaveBeenCalledTimes(2);

      // Verify the first series was called with the right options
      expect(downloadSeriesMock).toHaveBeenNthCalledWith(
        1,
        'https://animehay.tv/thong-tin-phim/series-a.html',
        expect.objectContaining({
          outDir: './downloads',
          jobs: 2,
          referer: 'https://animehay.tv/',
        }),
      );

      // Per-URL series summary line
      const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(allOutput).toContain('[DONE] [1/2] Series: 2 downloaded, 0 skipped, 0 failed');
      expect(allOutput).toContain('[DONE] [2/2] Series: 1 downloaded, 0 skipped, 1 failed');
      expect(allOutput).toContain('[DONE] Batch complete: 2 ok, 0 failed, 2 total');

      // Watch must NOT have been called
      expect(downloadWatchPageMock).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 3 — mixed URLs
  // -----------------------------------------------------------------------
  it('handles a mix of watch and series URLs in the same batch', async () => {
    readFileMock.mockResolvedValueOnce(
      'https://animehay.tv/xem-phim/ep-1-100.html\n' +
      'https://animehay.tv/thong-tin-phim/series-a.html\n' +
      'https://animehay.tv/xem-phim/ep-2-200.html\n',
    );

    downloadWatchPageMock.mockResolvedValue({ outPath: 'out.mp4', bytes: 500 });
    downloadSeriesMock.mockResolvedValue({ ok: 3, failed: 0, skipped: 0 });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const result = await processBatch('urls.txt', makeOpts());

      expect(result).toEqual({ total: 3, ok: 3, failed: 0 });
      expect(downloadWatchPageMock).toHaveBeenCalledTimes(2);
      expect(downloadSeriesMock).toHaveBeenCalledTimes(1);

      // Order matters: URLs are processed sequentially in file order
      const watchUrls = downloadWatchPageMock.mock.calls.map(([u]) => u);
      expect(watchUrls).toEqual([
        'https://animehay.tv/xem-phim/ep-1-100.html',
        'https://animehay.tv/xem-phim/ep-2-200.html',
      ]);
      expect(downloadSeriesMock).toHaveBeenCalledWith(
        'https://animehay.tv/thong-tin-phim/series-a.html',
        expect.any(Object),
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 4 — comment lines and empty lines
  // -----------------------------------------------------------------------
  it('skips blank lines and lines starting with #', async () => {
    readFileMock.mockResolvedValueOnce(
      '\n' +
      '# This is a header comment\n' +
      '  \n' +
      'https://animehay.tv/xem-phim/ep-1-100.html\n' +
      '# another comment\n' +
      '\n' +
      'https://animehay.tv/xem-phim/ep-2-200.html\n',
    );

    downloadWatchPageMock.mockResolvedValue({ outPath: 'out.mp4', bytes: 100 });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const result = await processBatch('urls.txt', makeOpts());

      // Only the 2 non-comment, non-empty lines are processed
      expect(result.total).toBe(2);
      expect(result.ok).toBe(2);
      expect(result.failed).toBe(0);
      expect(downloadWatchPageMock).toHaveBeenCalledTimes(2);

      const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(allOutput).toContain('[1/2]');
      expect(allOutput).toContain('[2/2]');
      expect(allOutput).not.toContain('# This is a header comment');
    } finally {
      logSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 5 — unknown URL is counted as failed but does not abort
  // -----------------------------------------------------------------------
  it('counts unknown URLs as failed and continues processing', async () => {
    readFileMock.mockResolvedValueOnce(
      'https://animehay.tv/xem-phim/ep-1-100.html\n' +
      'https://example.com/not-an-animehay-page\n' +
      'https://animehay.tv/xem-phim/ep-2-200.html\n',
    );

    downloadWatchPageMock.mockResolvedValue({ outPath: 'out.mp4', bytes: 100 });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const result = await processBatch('urls.txt', makeOpts());

      expect(result).toEqual({ total: 3, ok: 2, failed: 1 });
      expect(downloadWatchPageMock).toHaveBeenCalledTimes(2);

      // The unknown URL must be reported via [ERROR]
      const errOutput = errorSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(errOutput).toContain('[ERROR] [2/3] Failed: Cannot determine URL type');
      expect(errOutput).toContain('https://example.com/not-an-animehay-page');

      // Final summary reflects the failure
      const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(allOutput).toContain('[DONE] Batch complete: 2 ok, 1 failed, 3 total');
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 6 — download failures are caught per-URL
  // -----------------------------------------------------------------------
  it('catches per-URL errors and continues with the rest of the batch', async () => {
    readFileMock.mockResolvedValueOnce(
      'https://animehay.tv/xem-phim/ep-1-100.html\n' +
      'https://animehay.tv/xem-phim/ep-2-200.html\n' +
      'https://animehay.tv/xem-phim/ep-3-300.html\n',
    );

    // Middle one fails
    downloadWatchPageMock
      .mockResolvedValueOnce({ outPath: 'ok-1.mp4', bytes: 100 })
      .mockRejectedValueOnce(new Error('yt-dlp exploded'))
      .mockResolvedValueOnce({ outPath: 'ok-3.mp4', bytes: 300 });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const result = await processBatch('urls.txt', makeOpts());

      expect(result).toEqual({ total: 3, ok: 2, failed: 1 });
      expect(downloadWatchPageMock).toHaveBeenCalledTimes(3);

      const errOutput = errorSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(errOutput).toContain('[ERROR] [2/3] Failed: yt-dlp exploded');

      const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(allOutput).toContain('[DONE] Batch complete: 2 ok, 1 failed, 3 total');
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 7 — watch --dry-run prints [DRY-RUN] and never spawns download
  // -----------------------------------------------------------------------
  it('in --dry-run mode, watch URLs print the yt-dlp command without invoking download', async () => {
    readFileMock.mockResolvedValueOnce(
      'https://animehay.tv/xem-phim/ep-1-100.html\n',
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const result = await processBatch(
        'urls.txt',
        makeOpts({ dryRun: true, ytDlpPath: 'yt-dlp' }),
      );

      expect(result).toEqual({ total: 1, ok: 1, failed: 0 });
      // downloadWatchPage must NOT be called in dry-run
      expect(downloadWatchPageMock).not.toHaveBeenCalled();

      const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(allOutput).toContain('[DRY-RUN] yt-dlp');
      expect(allOutput).toContain('--concurrent-fragments');
      expect(allOutput).toContain('Referer:');
    } finally {
      logSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 8 — series --dry-run fetches and prints episode list
  // -----------------------------------------------------------------------
  it('in --dry-run mode, series URLs fetch the page and print the episode list', async () => {
    readFileMock.mockResolvedValueOnce(
      'https://animehay.tv/thong-tin-phim/series-a.html\n',
    );

    // Stub global fetch used by the series dry-run path
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<html>series page</html>'),
    } as Response);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const result = await processBatch(
        'urls.txt',
        makeOpts({ dryRun: true }),
      );

      expect(result).toEqual({ total: 1, ok: 1, failed: 0 });
      // downloadSeries must NOT be called in dry-run
      expect(downloadSeriesMock).not.toHaveBeenCalled();
      // fetch was called for the series page
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://animehay.tv/thong-tin-phim/series-a.html',
        expect.objectContaining({ headers: { Referer: 'https://animehay.tv/' } }),
      );

      const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(allOutput).toContain('[DRY-RUN] Series:');
      expect(allOutput).toContain('3 episode(s)');
      expect(allOutput).toContain('Tap 1');
      expect(allOutput).toContain('Tap 2');
      expect(allOutput).toContain('Tap 3');
    } finally {
      logSpy.mockRestore();
      globalThis.fetch = originalFetch;
    }
  });

  // -----------------------------------------------------------------------
  // Test 9 — empty batch (only comments / blank lines) returns zeros
  // -----------------------------------------------------------------------
  it('returns total=0 when the batch file has only comments and blank lines', async () => {
    readFileMock.mockResolvedValueOnce(
      '# header comment\n' +
      '\n' +
      '# another comment\n' +
      '   \n',
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const result = await processBatch('urls.txt', makeOpts());

      expect(result).toEqual({ total: 0, ok: 0, failed: 0 });
      expect(downloadWatchPageMock).not.toHaveBeenCalled();
      expect(downloadSeriesMock).not.toHaveBeenCalled();

      const allOutput = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(allOutput).toContain('Batch file contains no URLs');
      expect(allOutput).not.toContain('Batch complete');
    } finally {
      logSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 10 — output directory is created before any URL is processed
  // -----------------------------------------------------------------------
  it('creates the output directory once before processing URLs', async () => {
    readFileMock.mockResolvedValueOnce(
      'https://animehay.tv/xem-phim/ep-1-100.html\n',
    );

    downloadWatchPageMock.mockResolvedValue({ outPath: 'out.mp4', bytes: 100 });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await processBatch('urls.txt', makeOpts({ outputDir: '/tmp/batch-out' }));

      expect(mkdirMock).toHaveBeenCalledTimes(1);
      expect(mkdirMock).toHaveBeenCalledWith('/tmp/batch-out', { recursive: true });
    } finally {
      logSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 11 — missing batch file surfaces an error and returns zeros
  // -----------------------------------------------------------------------
  it('returns total=0 and logs [ERROR] when the batch file cannot be read', async () => {
    readFileMock.mockRejectedValueOnce(new Error('ENOENT: no such file'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const result = await processBatch('missing.txt', makeOpts());

      expect(result).toEqual({ total: 0, ok: 0, failed: 0 });
      expect(downloadWatchPageMock).not.toHaveBeenCalled();
      expect(downloadSeriesMock).not.toHaveBeenCalled();

      const errOutput = errorSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(errOutput).toContain('[ERROR] Cannot read batch file');
      expect(errOutput).toContain('missing.txt');
      expect(errOutput).toContain('ENOENT');
    } finally {
      errorSpy.mockRestore();
    }
  });
});

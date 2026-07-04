/**
 * Unit tests for `src/series.ts` — series bulk download with
 * `--from`/`--to` range filtering, dedup, sort, and concurrency cap.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock watch module — we never spawn yt-dlp in tests.
// ---------------------------------------------------------------------------
vi.mock('../src/watch.js', () => ({
  downloadWatchPage: vi.fn(),
}));

import { downloadSeries, epNoFromUrl, cleanSeriesTitle } from '../src/series.js';
import { downloadWatchPage } from '../src/watch.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal HTML page that `parseSeriesPage` (regex path) can parse.
 *
 * `parseSeriesPageWithRegex` looks for:
 *   - `<a href=".../xem-phim/..."` and extracts the numeric id from
 *     `-(\d+)\.html$` in the href.
 *   - The link text or `title` attribute becomes the episode title.
 *
 * @param links  Array of { id, title } used to generate <a> tags.
 * @param title  Optional og:title value (defaults to "Test Series").
 */
function buildSeriesHtml(
  links: { id: number; title: string }[],
  title = 'Test Series',
): string {
  const anchors = links
    .map(
      (l) =>
        `<a href="/xem-phim/ep-${l.id}-${l.id}.html">${l.title}</a>`,
    )
    .join('\n');
  return `<!DOCTYPE html><html><head><meta property="og:title" content="${title}"/><meta property="og:image" content="https://example.com/poster.jpg"/></head><body>${anchors}</body></html>`;
}

/**
 * Stub `globalThis.fetch` so the first call inside `downloadSeries` returns
 * the given HTML. We use `mockImplementationOnce` because it's the safest
 * way to prevent cross-test leakage — vitest's `vi.restoreAllMocks` in
 * `afterEach` cleans up any spy installed via `vi.spyOn`.
 */
function stubFetch(html: string): void {
  vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(html),
    } as Response),
  );
}

// ---------------------------------------------------------------------------
// Tests — epNoFromUrl
// ---------------------------------------------------------------------------

describe('epNoFromUrl', () => {
  it('extracts episode number from -tap-N- URL slug', () => {
    expect(
      epNoFromUrl('/xem-phim/quang-am-chi-ngoai-tap-28-76147.html'),
    ).toBe(28);
    expect(
      epNoFromUrl(
        'https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-1-12345.html',
      ),
    ).toBe(1);
    expect(
      epNoFromUrl('/xem-phim/some-series-tap-999-88888.html'),
    ).toBe(999);
  });

  it('returns null for URLs without -tap-N- pattern', () => {
    expect(epNoFromUrl('/xem-phim/ep-3-3.html')).toBeNull();
    expect(
      epNoFromUrl('https://animehay.tv/xem-phim/test-123.html'),
    ).toBeNull();
    expect(epNoFromUrl('')).toBeNull();
    expect(epNoFromUrl('https://example.com/no-tap-here.html')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — cleanSeriesTitle
// ---------------------------------------------------------------------------

describe('cleanSeriesTitle', () => {
  it('strips "Next Tập N" suffix after || separator', () => {
    expect(
      cleanSeriesTitle('Phim Quang Âm Chi Ngoại Next Tập 29 || AnimeHay'),
    ).toBe('Phim Quang Âm Chi Ngoại');
  });

  it('strips "Tập N" suffix at end', () => {
    expect(cleanSeriesTitle('Test Series Tập 10')).toBe('Test Series');
  });

  it('strips "Next Tập N" without || separator', () => {
    expect(
      cleanSeriesTitle('My Anime Next Tập 5'),
    ).toBe('My Anime');
  });

  it('handles plain || separator', () => {
    expect(cleanSeriesTitle('My Series || AnimeHay')).toBe('My Series');
  });

  it('returns clean titles unchanged', () => {
    expect(cleanSeriesTitle('Clean Title')).toBe('Clean Title');
    expect(cleanSeriesTitle('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Tests — downloadSeries
// ---------------------------------------------------------------------------

describe('downloadSeries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Test 1 — dedup + sort + range filter
  // -----------------------------------------------------------------------
  it('filters by from/to, deduplicates by id, and sorts ascending', async () => {
    // 10 episodes in shuffled order plus duplicates of id=3 and id=5.
    // `parseSeriesPage` deduplicates by numeric id (the last number in the
    // URL), so the duplicate entries are dropped automatically.
    const links = [
      { id: 6, title: 'Tập 6' },
      { id: 3, title: 'Tập 3' },
      { id: 9, title: 'Tập 9' },
      { id: 1, title: 'Tập 1' },
      { id: 5, title: 'Tập 5' },
      { id: 8, title: 'Tập 8' },
      { id: 2, title: 'Tập 2' },
      { id: 10, title: 'Tập 10' },
      { id: 4, title: 'Tập 4' },
      { id: 7, title: 'Tập 7' },
      // Duplicates (same id → parseSeriesPage drops them)
      { id: 3, title: 'Tập 3 dup' },
      { id: 5, title: 'Tập 5 dup' },
    ];

    stubFetch(buildSeriesHtml(links));

    const mockDownload = vi.mocked(downloadWatchPage);
    mockDownload.mockResolvedValue({ outPath: 'test.mp4', bytes: 1000 });

    const onStart = vi.fn();
    const onDone = vi.fn();

    const result = await downloadSeries(
      'https://animehay07.site/thong-tin-phim/ep-1.html',
      {
        referer: 'https://animehay07.site/',
        outDir: './downloads',
        from: 3,
        to: 7,
        jobs: 2,
        onEpisodeStart: onStart,
        onEpisodeDone: onDone,
      },
    );

    // 5 unique episodes in range: 3, 4, 5, 6, 7
    expect(result.ok).toBe(5);
    expect(result.failed).toBe(0);
    expect(mockDownload).toHaveBeenCalledTimes(5);

    // Verify sorted call order: ascending by id
    const calledUrls = mockDownload.mock.calls.map(([url]) => url);
    expect(calledUrls).toEqual([
      '/xem-phim/ep-3-3.html',
      '/xem-phim/ep-4-4.html',
      '/xem-phim/ep-5-5.html',
      '/xem-phim/ep-6-6.html',
      '/xem-phim/ep-7-7.html',
    ]);

    // Verify onStart callbacks
    expect(onStart).toHaveBeenCalledTimes(5);
    expect(onStart).toHaveBeenNthCalledWith(1, { title: 'Tập 3', no: '3' });
    expect(onStart).toHaveBeenNthCalledWith(5, { title: 'Tập 7', no: '7' });

    // Verify onDone callbacks
    expect(onDone).toHaveBeenCalledTimes(5);
    expect(onDone).toHaveBeenNthCalledWith(
      1,
      { title: 'Tập 3', no: '3' },
      { ok: true, bytes: 1000 },
    );
    expect(onDone).toHaveBeenNthCalledWith(
      5,
      { title: 'Tập 7', no: '7' },
      { ok: true, bytes: 1000 },
    );

    // Verify that outPath is passed correctly to downloadWatchPage
    // Format: "Series-Title - Tap N.mp4"
    const calledOpts = mockDownload.mock.calls.map(([, opts]) => opts.outPath);
    expect(calledOpts).toEqual([
      expect.stringMatching(/Test-Series - Tap-3\.mp4$/),
      expect.stringMatching(/Test-Series - Tap-4\.mp4$/),
      expect.stringMatching(/Test-Series - Tap-5\.mp4$/),
      expect.stringMatching(/Test-Series - Tap-6\.mp4$/),
      expect.stringMatching(/Test-Series - Tap-7\.mp4$/),
    ]);
  });

  // -----------------------------------------------------------------------
  // Test 2 — empty series page
  // -----------------------------------------------------------------------
  it('returns {ok:0, failed:0} when the series page has no episode links', async () => {
    // Page with no /xem-phim/ anchors
    stubFetch(buildSeriesHtml([], 'Empty Series'));

    const mockDownload = vi.mocked(downloadWatchPage);

    const result = await downloadSeries(
      'https://animehay07.site/thong-tin-phim/ep-0.html',
      {
        referer: 'https://animehay07.site/',
        outDir: './downloads',
      },
    );

    expect(result).toEqual({ ok: 0, failed: 0, skipped: 0 });
    expect(mockDownload).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Test 3 — "Next" placeholder filtering
  // -----------------------------------------------------------------------
  it('skips "Next" placeholder episodes with non-numeric titles', async () => {
    const links = [
      { id: 1, title: 'Tập 1' },
      { id: 2, title: 'Tập 2' },
      { id: 72718, title: 'Xem ngay' },   // ← "Next" placeholder
      { id: 3, title: 'Tập 3' },
    ];

    stubFetch(buildSeriesHtml(links));

    const mockDownload = vi.mocked(downloadWatchPage);
    mockDownload.mockResolvedValue({ outPath: 'test.mp4', bytes: 1000 });

    const result = await downloadSeries(
      'https://animehay07.site/thong-tin-phim/ep-1.html',
      {
        referer: 'https://animehay07.site/',
        outDir: './downloads',
      },
    );

    expect(result.ok).toBe(3);  // 1, 2, 3 — not the placeholder
    expect(result.failed).toBe(0);
    expect(mockDownload).toHaveBeenCalledTimes(3);
  });

  // -----------------------------------------------------------------------
  // Test 4 — concurrency cap
  // -----------------------------------------------------------------------
  it('never exceeds the configured concurrency cap (jobs)', async () => {
    // 5 episodes, jobs=2
    const links = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Tập ${i + 1}`,
    }));

    stubFetch(buildSeriesHtml(links));

    let inFlight = 0;
    let maxInFlight = 0;

    const mockDownload = vi.mocked(downloadWatchPage);
    mockDownload.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      // Simulate a reasonably slow download (30 ms)
      await new Promise((r) => setTimeout(r, 30));
      inFlight--;
      return { outPath: 'test.mp4', bytes: 500 };
    });

    const result = await downloadSeries(
      'https://animehay07.site/thong-tin-phim/ep-1.html',
      {
        referer: 'https://animehay07.site/',
        outDir: './downloads',
        jobs: 2,
      },
    );

    expect(result.ok).toBe(5);
    expect(result.failed).toBe(0);
    // The batch-based Promise.all caps in-flight at exactly `jobs`.
    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(mockDownload).toHaveBeenCalledTimes(5);
  });

  // -----------------------------------------------------------------------
  // Edge: no from/to → all episodes downloaded
  // -----------------------------------------------------------------------
  it('downloads all episodes when from/to are not set', async () => {
    const links = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      title: `Tập ${i + 1}`,
    }));

    stubFetch(buildSeriesHtml(links));

    const mockDownload = vi.mocked(downloadWatchPage);
    mockDownload.mockResolvedValue({ outPath: 'test.mp4', bytes: 250 });

    const result = await downloadSeries(
      'https://animehay07.site/thong-tin-phim/ep-1.html',
      {
        referer: 'https://animehay07.site/',
        outDir: './downloads',
      },
    );

    expect(result.ok).toBe(4);
    expect(result.failed).toBe(0);
    expect(mockDownload).toHaveBeenCalledTimes(4);
  });

  // -----------------------------------------------------------------------
  // Edge: downloadWatchPage failure is counted as failed
  // -----------------------------------------------------------------------
  it('counts download failures correctly', async () => {
    const links = [
      { id: 1, title: 'Tập 1' },
      { id: 2, title: 'Tập 2' },
    ];

    stubFetch(buildSeriesHtml(links));

    const mockDownload = vi.mocked(downloadWatchPage);
    mockDownload
      .mockResolvedValueOnce({ outPath: 'ok.mp4', bytes: 100 })
      .mockRejectedValue(new Error('yt-dlp crashed')); // All remaining calls fail

    const onDone = vi.fn();

    const result = await downloadSeries(
      'https://animehay07.site/thong-tin-phim/ep-1.html',
      {
        referer: 'https://animehay07.site/',
        outDir: './downloads',
        jobs: 1, // sequential so order is deterministic
        onEpisodeDone: onDone,
      },
    );

    expect(result.ok).toBe(1);
    expect(result.failed).toBe(1);
    expect(onDone).toHaveBeenNthCalledWith(
      1,
      { title: 'Tập 1', no: '1' },
      { ok: true, bytes: 100 },
    );
    expect(onDone).toHaveBeenNthCalledWith(
      2,
      { title: 'Tập 2', no: '2' },
      { ok: false },
    );
  });

  // -----------------------------------------------------------------------
  // Test: episode retries — failed episode should retry the configured
  // number of times before counting as failed.
  // -----------------------------------------------------------------------
  it('retries failed episodes up to episodeRetries times', async () => {
    const links = [
      { id: 1, title: 'Tập 1' },
    ];
    stubFetch(buildSeriesHtml(links));

    const mockDownload = vi.mocked(downloadWatchPage);
    mockDownload.mockRejectedValue(new Error('network error'));

    const result = await downloadSeries(
      'https://animehay07.site/thong-tin-phim/ep-1.html',
      {
        referer: 'https://animehay07.site/',
        outDir: './downloads',
        jobs: 1,
        episodeRetries: 3,
      },
    );

    expect(result.ok).toBe(0);
    expect(result.failed).toBe(1);
    // Should have tried 3 times (1 initial + 2 retries)
    expect(mockDownload).toHaveBeenCalledTimes(3);
  });

  it('succeeds on a later retry after initial failure', async () => {
    const links = [
      { id: 1, title: 'Tập 1' },
    ];
    stubFetch(buildSeriesHtml(links));

    const mockDownload = vi.mocked(downloadWatchPage);
    mockDownload
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ outPath: 'ok.mp4', bytes: 500, skipped: false });

    const result = await downloadSeries(
      'https://animehay07.site/thong-tin-phim/ep-1.html',
      {
        referer: 'https://animehay07.site/',
        outDir: './downloads',
        jobs: 1,
        episodeRetries: 3,
      },
    );

    expect(result.ok).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockDownload).toHaveBeenCalledTimes(2); // fail, then succeed
  });
});

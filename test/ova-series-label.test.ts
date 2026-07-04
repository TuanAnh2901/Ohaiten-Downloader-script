/**
 * OVA label regression tests for Animehay series pages.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('../src/watch.js', () => ({
  downloadWatchPage: vi.fn(),
}));

import { downloadSeries, episodeLabelFromLink } from '../src/series.js';
import { downloadWatchPage } from '../src/watch.js';

function stubFetch(html: string): void {
  vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() =>
    Promise.resolve(new Response(html, { status: 200 })),
  );
}

describe('OVA series labels', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves OVA labels instead of deriving names from URL ids', () => {
    expect(episodeLabelFromLink({
      title: 'OVA 4',
      url: 'https://animehay07.site/xem-phim/tensei-shitara-slime-datta-ken-tap-ova-4-42706.html',
    })).toBe('OVA 4');
    expect(episodeLabelFromLink({
      title: 'OVA 2',
      url: 'https://animehay07.site/xem-phim/tensei-shitara-slime-datta-ken-tap-25-ova-40854.html',
    })).toBe('OVA 2');
  });

  it('keeps numeric episode labels and rejects related movie links', () => {
    expect(episodeLabelFromLink({
      title: '23',
      url: 'https://animehay07.site/xem-phim/tensei-shitara-slime-datta-ken-tap-23-40593.html',
    })).toBe('23');
    expect(episodeLabelFromLink({
      title: '104 Phút',
      url: 'https://animehay07.site/xem-phim/tensei-shitara-slime-datta-ken-movie-2-soukai-no-namida-hen-tap-full-76164.html',
    })).toBeNull();
  });

  it('excludes related-movie links (other series) even when they match episodeLabelFromLink', async () => {
    // Real-world scenario: the page has links to other series in the
    // "Phim liên kết" / related-movies section. Those links have a
    // different series slug in the URL path and must be excluded.
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:title" content="My Series || AnimeHay" />
      <meta property="og:image" content="https://example.com/poster.jpg" />
    </head><body>
      <a href="/xem-phim/my-series-tap-1-100.html">1</a>
      <a href="/xem-phim/my-series-tap-2-200.html">2</a>
      <a href="/xem-phim/other-series-tap-13-999.html">13</a>
      <a href="/xem-phim/other-series-tap-14-998.html">14</a>
    </body></html>`;
    stubFetch(html);

    const mockDownload = vi.mocked(downloadWatchPage);
    mockDownload.mockResolvedValue({ outPath: 'test.mp4', bytes: 500 });

    const result = await downloadSeries(
      'https://animehay07.site/thong-tin-phim/my-series-999.html',
      { referer: 'https://animehay07.site/', outDir: './downloads', jobs: 1 },
    );

    // Only 2 links belong to "my-series" — the other-series links are excluded
    expect(result).toEqual({ ok: 2, failed: 0, skipped: 0 });
    const calledUrls = mockDownload.mock.calls.map(([u]) => u);
    expect(calledUrls).toEqual([
      '/xem-phim/my-series-tap-1-100.html',
      '/xem-phim/my-series-tap-2-200.html',
    ]);
  });

  it('uses OVA labels in output filenames for real Animehay OVA-shaped links', async () => {
    const html = `<!DOCTYPE html><html><head>
      <meta property="og:title" content="Tensei shitara Slime Datta Ken || AnimeHay" />
      <meta property="og:image" content="https://example.com/poster.jpg" />
    </head><body>
      <a href="/xem-phim/tensei-shitara-slime-datta-ken-tap-ova-4-42706.html">OVA 4</a>
      <a href="/xem-phim/tensei-shitara-slime-datta-ken-tap-25-ova-40854.html">OVA 2</a>
      <a href="/xem-phim/tensei-shitara-slime-datta-ken-tap-23-40593.html">23</a>
      <a href="/xem-phim/tensei-shitara-slime-datta-ken-movie-2-soukai-no-namida-hen-tap-full-76164.html">104 Phút</a>
    </body></html>`;
    stubFetch(html);

    const mockDownload = vi.mocked(downloadWatchPage);
    mockDownload.mockResolvedValue({ outPath: 'test.mp4', bytes: 1000 });

    const result = await downloadSeries(
      'https://animehay07.site/thong-tin-phim/tensei-shitara-slime-datta-ken-2658.html',
      { referer: 'https://animehay07.site/', outDir: './downloads', jobs: 1 },
    );

    expect(result).toEqual({ ok: 3, failed: 0, skipped: 0 });
    const calledOpts = mockDownload.mock.calls.map(([, opts]) => opts.outPath);
    expect(calledOpts).toEqual([
      expect.stringMatching(/Tensei-shitara-Slime-Datta-Ken - Tap-23\.mp4$/),
      expect.stringMatching(/Tensei-shitara-Slime-Datta-Ken - OVA-4\.mp4$/),
      expect.stringMatching(/Tensei-shitara-Slime-Datta-Ken - OVA-2\.mp4$/),
    ]);
  });
});

/**
 * Tests for --output-dir-per-series series output layout.
 */

import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mkdirMock = vi.fn();
vi.mock('node:fs/promises', () => ({
  mkdir: (...args: readonly unknown[]) => mkdirMock(...args),
}));

const downloadWatchPageMock = vi.fn();
vi.mock('../src/watch.js', () => ({
  downloadWatchPage: (...args: readonly unknown[]) => downloadWatchPageMock(...args),
}));

const parseSeriesPageMock = vi.fn();
vi.mock('@animehay/core/parser.js', () => ({
  parseSeriesPage: (...args: readonly unknown[]) => parseSeriesPageMock(...args),
}));

vi.mock('@animehay/core/crawler.js', () => ({
  deduplicateEpisodes: <T>(episodes: readonly T[]): readonly T[] => episodes,
  sortEpisodesByNumber: <T>(episodes: readonly T[]): readonly T[] => episodes,
}));

import { downloadSeries } from '../src/series.js';

describe('outputDirPerSeries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mkdirMock.mockResolvedValue(undefined);
    downloadWatchPageMock.mockResolvedValue({ outPath: 'out.mp4', bytes: 1 });
    parseSeriesPageMock.mockReturnValue({
      title: 'My Series || AnimeHay',
      episodeLinks: [
        { id: 1, title: '1', url: 'https://animehay.tv/xem-phim/my-series-tap-1-100.html' },
      ],
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html></html>'),
    }));
  });

  it('places series episodes in a sanitized per-series subdirectory when enabled', async () => {
    const baseOutDir = './downloads';
    const seriesOutDir = join(baseOutDir, 'My-Series');

    const result = await downloadSeries('https://animehay.tv/thong-tin-phim/my-series.html', {
      referer: 'https://animehay.tv',
      outDir: baseOutDir,
      outputDirPerSeries: true,
      jobs: 1,
    });

    expect(result).toEqual({ ok: 1, failed: 0, skipped: 0 });
    expect(mkdirMock).toHaveBeenCalledWith(seriesOutDir, { recursive: true });
    expect(downloadWatchPageMock).toHaveBeenCalledWith(
      'https://animehay.tv/xem-phim/my-series-tap-1-100.html',
      expect.objectContaining({
        outPath: join(seriesOutDir, 'My-Series - Tap-1.mp4'),
        noAutoName: true,
      }),
    );
  });
});

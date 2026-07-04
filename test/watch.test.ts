/**
 * Tests for src/watch.ts — parse+extract pipeline and download error paths.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { installGmShim } from '../src/core-shim.js';

// ---------------------------------------------------------------------------
// Mock child_process.spawn so no real yt-dlp process is ever started.
// This mock is hoisted by vitest before any static imports resolve.
// ---------------------------------------------------------------------------
vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn((event: string, cb: (code: number) => void) => {
      if (event === 'exit') cb(0);
      // Return the mock child object for chaining.
      return undefined as unknown as object;
    }),
    stdout: { on: vi.fn(), pipe: vi.fn() },
    stderr: { on: vi.fn(), pipe: vi.fn() },
    stdin: { end: vi.fn(), write: vi.fn() },
    kill: vi.fn(),
    pid: 12345,
  })),
}));

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

/** Absolute path to the shared AnimehayDownloader fixture. */
const FIXTURE_PATH = new URL(
  '../../AnimehayDownloader/test/fixtures/watch-page.html',
  import.meta.url,
);

const watchPageHtml = readFileSync(FIXTURE_PATH, 'utf-8');

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('watch', () => {
  beforeAll(() => {
    installGmShim();
  });

  // -----------------------------------------------------------------------
  // Test 1 — parseWatchPage on fixture
  // -----------------------------------------------------------------------
  it('parseWatchPage → buildStreamUrl on fixture finds servers and iframe URL', async () => {
    const { parseWatchPage } = await import('@animehay/core/parser.js');
    const { buildStreamUrl } = await import('@animehay/core/extractor.js');

    const data = parseWatchPage(watchPageHtml);

    // Server map has at least one entry
    expect(Object.keys(data.serverMap).length).toBeGreaterThanOrEqual(1);
    expect(data.serverMap).toHaveProperty('AHS');
    expect(data.serverMap).toHaveProperty('HY');

    // Active server is AHS (first tab marked .active)
    expect(data.activeServer).toBe('AHS');

    // buildStreamUrl returns the embed URL for the active server
    const iframeUrl = buildStreamUrl(data.activeServer, data.serverMap);
    expect(iframeUrl).toBeTruthy();
    expect(iframeUrl).toContain('ahay.stream');
  });

  // -----------------------------------------------------------------------
  // Test 2 — staticExtract on inline jwplayer iframe
  // -----------------------------------------------------------------------
  it('staticExtract parses jwplayer file: and returns stream with expected URL', async () => {
    const { staticExtract } = await import('@animehay/core/extractor.js');

    const iframeHtml = `<html><body><script>
      jwplayer().setup({
        file: 'https://cdn.example.com/video.mp4',
        height: 720,
        width: 1280,
      });
    </script></body></html>`;

    const streams = staticExtract(iframeHtml, 'AHS', 'https://iframe.example.com/embed');

    expect(streams.length).toBe(1);
    expect(streams[0].url).toContain('example.com');
    expect(streams[0].url).toContain('.mp4');
    expect(streams[0].source).toBe('AHS');
    expect(streams[0].iframeUrl).toBe('https://iframe.example.com/embed');
  });

  // -----------------------------------------------------------------------
  // Test 3 — downloadWatchPage error path (bad URL → no server available)
  // -----------------------------------------------------------------------
  it('downloadWatchPage with non-watch HTML throws No server available', async () => {
    // Preserve original fetch
    const originalFetch = globalThis.fetch;

    // Mock fetch to return a generic HTML page without $wp_servers
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<html><body>not a watch page</body></html>'),
    } as unknown as Response);

    try {
      const { downloadWatchPage, AnimehayCliError } = await import('../src/watch.js');
      const { spawn } = await import('node:child_process');

      await expect(
        downloadWatchPage('https://bad-url.example.com/page.html', {
          referer: 'https://bad-url.example.com/',
          outPath: 'test.mp4',
        }),
      ).rejects.toThrow(AnimehayCliError);

      await expect(
        downloadWatchPage('https://bad-url.example.com/page.html', {
          referer: 'https://bad-url.example.com/',
          outPath: 'test.mp4',
        }),
      ).rejects.toThrow('No server available');

      // Ensure yt-dlp was never spawned
      expect(spawn).not.toHaveBeenCalled();
    } finally {
      // Restore original fetch
      globalThis.fetch = originalFetch;
    }
  });
});

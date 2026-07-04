/**
 * CLI entry-point tests for Animehay commander-based CLI.
 *
 * Tests option parsing, routing, dry-run output, and error exits.
 * All tests that would spawn real processes use --dry-run or mock process.exit.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import program from '../src/index.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock @animehay/core/parser so parseSeriesPage returns controlled data for
// the series dry-run test without requiring real fixture pages.
vi.mock('@animehay/core/parser.js', () => ({
  parseWatchPage: vi.fn(),
  parseSeriesPage: vi.fn((_html: string) => ({
    title: 'Test Series || AnimeHay',
    episodeLinks: [
      { id: 24, title: '24', url: 'https://animehay.tv/xem-phim/test-tap-24-100.html' },
      { id: 25, title: '25', url: 'https://animehay.tv/xem-phim/test-tap-25-101.html' },
      { id: 26, title: '26', url: 'https://animehay.tv/xem-phim/test-tap-26-102.html' },
      { id: 27, title: '27', url: 'https://animehay.tv/xem-phim/test-tap-27-103.html' },
      { id: 28, title: '28', url: 'https://animehay.tv/xem-phim/test-tap-28-104.html' },
      { id: 29, title: 'Xem ngay', url: 'https://animehay.tv/xem-phim/test-next-tap-29-105.html' },
    ],
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Capture process.stdout.write calls directly (used by commander for
 * --help/--version output, which bypasses console.log).
 */
function captureStdout(): { text: string; restore: () => void } {
  const orig = process.stdout.write.bind(process.stdout);
  let output = '';
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  return {
    get text() {
      return output;
    },
    restore() {
      process.stdout.write = orig;
    },
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CLI entry point', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Test 1 — --help prints expected text
  // -----------------------------------------------------------------------
  it('--help prints help text containing all expected flags and commands', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('EXIT_CALLED');
    }) as unknown as (code?: number) => never);
    const stdout = captureStdout();

    try {
      await expect(
        program.parseAsync(['node', 'animehay', '--help']),
      ).rejects.toThrow('EXIT_CALLED');

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(stdout.text).toContain('animehay');
      expect(stdout.text).toContain('cookies');
      expect(stdout.text).toContain('--referer');
      expect(stdout.text).toContain('--batch');
      expect(stdout.text).toContain('--from');
      expect(stdout.text).toContain('--to');
      expect(stdout.text).toContain('--no-output-dir-per-series');
      expect(stdout.text).toContain('--dry-run');
      expect(stdout.text).toContain('--verbose');
      expect(stdout.text).toContain('--res');
      expect(stdout.text).toContain('--retries');
      expect(stdout.text).toContain('--buffer-size');
      expect(stdout.text).toContain('--socket-timeout');
      expect(stdout.text).toContain('--temp');
      expect(stdout.text).toContain('--install-yt-dlp');
    } finally {
      exitSpy.mockRestore();
      stdout.restore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 2 — default option values
  // -----------------------------------------------------------------------
  it('--help shows correct defaults (--jobs 3, --buffer-size 32M)', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('EXIT_CALLED');
    }) as unknown as (code?: number) => never);
    const stdout = captureStdout();

    try {
      await expect(
        program.parseAsync(['node', 'animehay', '--help']),
      ).rejects.toThrow('EXIT_CALLED');

      expect(exitSpy).toHaveBeenCalledWith(0);
      // Commander renders option defaults as "(default: VALUE)"
      expect(stdout.text).toMatch(/--jobs[\s\S]*?\(default:\s*3\)/i);
      expect(stdout.text).toMatch(/--buffer-size[\s\S]*?\(default:\s*"32M"\)/i);
    } finally {
      exitSpy.mockRestore();
      stdout.restore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 3 — --version prints expected version
  // -----------------------------------------------------------------------
  it('--version prints 0.1.0', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('EXIT_CALLED');
    }) as unknown as (code?: number) => never);
    const stdout = captureStdout();

    try {
      await expect(
        program.parseAsync(['node', 'animehay', '--version']),
      ).rejects.toThrow('EXIT_CALLED');

      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(stdout.text.trim()).toBe('0.1.0');
    } finally {
      exitSpy.mockRestore();
      stdout.restore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 3 — watch URL --dry-run prints DRY-RUN yt-dlp command
  // -----------------------------------------------------------------------
  it('watch URL --dry-run prints DRY-RUN with yt-dlp arguments', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      await program.parseAsync([
        'node',
        'animehay',
        'https://animehay.tv/xem-phim/test-episode-123.html',
        '--dry-run',
      ]);

      // First console.log call should be the DRY-RUN message
      const firstCall = logSpy.mock.calls[0]?.[0] ?? '';
      expect(firstCall).toContain('[DRY-RUN]');
      expect(firstCall).toContain('yt-dlp');
      expect(firstCall).toContain('--concurrent-fragments');
      expect(firstCall).toContain('--add-headers');
      expect(firstCall).toContain('Referer:');
    } finally {
      logSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 4 — unknown URL type exits with code 1
  // -----------------------------------------------------------------------
  it('unknown URL type prints error and exits with code 1', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('EXIT_CALLED');
    }) as unknown as (code?: number) => never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(
        program.parseAsync([
          'node',
          'animehay',
          'https://example.com/not-animehay',
        ]),
      ).rejects.toThrow('EXIT_CALLED');

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalled();
      const firstErr = errorSpy.mock.calls[0]?.[0] ?? '';
      expect(firstErr).toContain('[ERROR]');
      expect(firstErr).toContain('Cannot determine URL type');
    } finally {
      exitSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 5 — cookies export with invalid browser exits with error
  // -----------------------------------------------------------------------
  it('cookies export invalid browser exits with error', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('EXIT_CALLED');
    }) as unknown as (code?: number) => never);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(
        program.parseAsync([
          'node',
          'animehay',
          'cookies',
          'export',
          'invalid-browser',
          'test.txt',
        ]),
      ).rejects.toThrow('EXIT_CALLED');

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalled();
      const firstErr = errorSpy.mock.calls[0]?.[0] ?? '';
      expect(firstErr).toContain('[ERROR]');
      expect(firstErr).toContain("Invalid browser 'invalid-browser'");
    } finally {
      exitSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  // -----------------------------------------------------------------------
  // Test 6 — series --from --to in dry-run applies range filter
  // -----------------------------------------------------------------------
  it('series URL --from --to in dry-run shows correctly filtered episodes', async () => {
    // parseSeriesPage is mocked at the top of this file with -tap-N-ID URLs.
    // Episodes 25, 26, 27, 28 are in range [25, 28].
    // Episode 24 (below from) and 29 (Xem ngay placeholder, non-numeric title) are excluded.
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html></html>', { status: 200 }),
    )
    try {
      await program.parseAsync([
        'node',
        'animehay',
        'https://animehay.tv/thong-tin-phim/test-series/',
        '--from',
        '25',
        '--to',
        '28',
        '--dry-run',
      ])

      const allOutput = logSpy.mock.calls.map((c) => String(c[0])).join('\n')
      expect(allOutput).toContain('[DRY-RUN]')
      // 4 episodes in range [25, 28], excluding "Xem ngay" placeholder
      expect(allOutput).toContain('4 episode(s)')
    } finally {
      logSpy.mockRestore()
      fetchSpy.mockRestore()
    }
  })
});

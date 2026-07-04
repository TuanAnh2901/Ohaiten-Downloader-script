/**
 * Tests for src/install-ytdlp.ts — yt-dlp auto-download utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock child_process.spawnSync so we never actually verify yt-dlp.
// ---------------------------------------------------------------------------
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { findInstalledYtDlp, downloadYtDlp, ensureYtDlp } from '../src/install-ytdlp.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Convenience: mock spawnSync to simulate a working binary. */
function mockVersionOk(path?: string): void {
  vi.mocked(spawnSync).mockImplementation((cmd: string) => {
    return { status: 0, stdout: '2025.01.01\n', stderr: '' } as any;
  });
}

/** Convenience: mock spawnSync to simulate a missing binary. */
function mockVersionFail(): void {
  vi.mocked(spawnSync).mockReturnValue({ status: 1 } as any);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('findInstalledYtDlp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the preferred path when it works', () => {
    mockVersionOk();
    const result = findInstalledYtDlp('C:\\tools\\yt-dlp.exe');
    expect(result).toBe('C:\\tools\\yt-dlp.exe');
    expect(spawnSync).toHaveBeenCalledWith('C:\\tools\\yt-dlp.exe', ['--version'], expect.any(Object));
  });

  it('returns null when the preferred path is missing', () => {
    mockVersionFail();
    // Will also check ./bin/yt-dlp.exe which also fails
    const result = findInstalledYtDlp('/usr/bin/yt-dlp');
    expect(result).toBeNull();
  });

  it('returns null when no path is given and yt-dlp is not on PATH', () => {
    mockVersionFail();
    const result = findInstalledYtDlp();
    expect(result).toBeNull();
  });
});

describe('downloadYtDlp', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns null when fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('networking down'));
    const result = await downloadYtDlp();
    expect(result).toBeNull();
  });

  it('returns null when HTTP response is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);
    const result = await downloadYtDlp();
    expect(result).toBeNull();
  });

  it('returns the local path on successful download', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    } as Response);

    // After download succeeds, the verify check needs to pass
    mockVersionOk();

    const result = await downloadYtDlp();
    expect(result).not.toBeNull();
    expect(result).toContain('bin\\yt-dlp.exe');
  });
});

describe('ensureYtDlp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the preferred path when yt-dlp is already installed', async () => {
    mockVersionOk();
    const result = await ensureYtDlp('yt-dlp');
    expect(result).toBe('yt-dlp');
  });

  it('attempts download when yt-dlp is not installed', async () => {
    // First 2 spawn calls (PATH + local bin) fail → trigger download
    vi.mocked(spawnSync)
      .mockReturnValueOnce({ status: 1 } as any)
      .mockReturnValueOnce({ status: 1 } as any)
      .mockReturnValue({ status: 0 } as any); // subsequent calls (verify) succeed

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    } as Response);

    const result = await ensureYtDlp('yt-dlp');
    expect(result).not.toBeNull();
    expect(result).toContain('bin\\yt-dlp.exe');
  });

  it('returns null when both check and download fail', async () => {
    // All spawn calls fail (PATH + local bin)
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as any);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const result = await ensureYtDlp('yt-dlp');
    expect(result).toBeNull();
  });
});

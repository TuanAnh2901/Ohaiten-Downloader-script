import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

import { spawnSync } from 'node:child_process';
import { exportCookiesFromBrowser } from '../src/cookies.ts';

describe('exportCookiesFromBrowser', () => {
  let tmpDir: string;
  let outPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cookies-test-'));
    outPath = join(tmpDir, 'cookies.txt');

    // Default mock: write a valid Netscape cookie file to the requested outPath
    vi.mocked(spawnSync).mockImplementation((_cmd: string, args: string[]) => {
      const idx = args.indexOf('--cookies');
      const path = args[idx + 1];
      writeFileSync(path, '# Netscape HTTP Cookie File\n');
      return { status: 0, stderr: '' } as any;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('chrome - exports cookies, writes file, returns ok:true', async () => {
    const result = await exportCookiesFromBrowser('chrome', outPath);

    expect(result).toEqual({ ok: true, bytes: expect.any(Number) });
    expect((result as { ok: true; bytes: number }).bytes).toBeGreaterThan(0);

    // Verify actual file content on disk
    const content = readFileSync(outPath, 'utf-8');
    expect(content).toContain('# Netscape HTTP Cookie File');

    // Verify spawnSync was invoked with correct yt-dlp args
    expect(spawnSync).toHaveBeenCalledWith('yt-dlp', [
      '--cookies-from-browser',
      'chrome',
      '--cookies',
      outPath,
      '--no-download',
      'https://animehay.tv/',
    ]);
  });

  it('firefox - exports cookies, writes file, returns ok:true', async () => {
    const result = await exportCookiesFromBrowser('firefox', outPath);

    expect(result).toEqual({ ok: true, bytes: expect.any(Number) });

    expect(spawnSync).toHaveBeenCalledWith('yt-dlp', [
      '--cookies-from-browser',
      'firefox',
      '--cookies',
      outPath,
      '--no-download',
      'https://animehay.tv/',
    ]);
  });

  it('edge - exports cookies, writes file, returns ok:true', async () => {
    const result = await exportCookiesFromBrowser('edge', outPath);

    expect(result).toEqual({ ok: true, bytes: expect.any(Number) });

    expect(spawnSync).toHaveBeenCalledWith('yt-dlp', [
      '--cookies-from-browser',
      'edge',
      '--cookies',
      outPath,
      '--no-download',
      'https://animehay.tv/',
    ]);
  });

  it('brave - exports cookies, writes file, returns ok:true', async () => {
    const result = await exportCookiesFromBrowser('brave', outPath);

    expect(result).toEqual({ ok: true, bytes: expect.any(Number) });

    expect(spawnSync).toHaveBeenCalledWith('yt-dlp', [
      '--cookies-from-browser',
      'brave',
      '--cookies',
      outPath,
      '--no-download',
      'https://animehay.tv/',
    ]);
  });

  it('invalid browser - rejects immediately without calling spawnSync', async () => {
    const result = await exportCookiesFromBrowser('safari' as any, outPath);

    expect(result).toEqual({
      ok: false,
      reason: 'unsupported',
      detail: 'Browser must be one of: chrome, firefox, edge, brave, opera, chromium',
    });
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('non-zero exit from yt-dlp - returns error with stderr detail', async () => {
    vi.mocked(spawnSync).mockImplementationOnce((_cmd: string, _args: string[]) => {
      return { status: 1, stderr: 'Could not find browser cookies' } as any;
    });

    const result = await exportCookiesFromBrowser('chrome', outPath);

    expect(result).toEqual({
      ok: false,
      reason: 'error',
      detail: 'Could not find browser cookies',
    });
  });
});

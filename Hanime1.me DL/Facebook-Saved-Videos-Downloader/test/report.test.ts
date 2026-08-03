import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Report } from '../src/report.js';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'fb-report-test-'));
}

describe('Report counters', () => {
  it('starts with zero counts', () => {
    const r = new Report();
    expect(r.downloadedCount).toBe(0);
    expect(r.failedCount).toBe(0);
    expect(r.skippedCount).toBe(0);
  });

  it('addFailure increments failedCount', () => {
    const r = new Report();
    r.addFailure('v1', 'boom', 'https://fb.com/watch?v=1');
    expect(r.failedCount).toBe(1);
    expect(r.downloadedCount).toBe(0);
    expect(r.skippedCount).toBe(0);
  });

  it('addSkipped increments skippedCount', () => {
    const r = new Report();
    r.addSkipped('v2', 'already downloaded');
    expect(r.skippedCount).toBe(1);
  });

  it('addDownloaded increments downloadedCount', () => {
    const r = new Report();
    r.addDownloaded('v3');
    expect(r.downloadedCount).toBe(1);
  });
});

describe('Report.writeReportFile', () => {
  it('writes a valid report JSON to the given dir and returns its path', () => {
    const dir = tempDir();
    try {
      const r = new Report();
      r.addDownloaded('v1');
      r.addFailure('v2', 'boom', 'https://fb.com/watch?v=2');
      r.addSkipped('v3', 'exists');
      const path = r.writeReportFile(dir);
      expect(existsSync(path)).toBe(true);
      expect(path).toMatch(/report-\d{8}-\d{6}\.json$/);

      const data = JSON.parse(readFileSync(path, 'utf8'));
      expect(typeof data.timestamp).toBe('string');
      expect(data.summary).toEqual({ downloaded: 1, failed: 1, skipped: 1 });
      expect(data.failures).toEqual([
        { videoId: 'v2', reason: 'boom', url: 'https://fb.com/watch?v=2' },
      ]);
      expect(data.skipped).toEqual([{ videoId: 'v3', reason: 'exists' }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates the directory if missing', () => {
    const dir = tempDir();
    try {
      const r = new Report();
      const path = r.writeReportFile(join(dir, 'nested', 'deep'));
      expect(existsSync(path)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Report.summaryText', () => {
  it('summarizes counts in [DONE] format', () => {
    const r = new Report();
    r.addDownloaded('v1');
    r.addFailure('v2', 'boom');
    r.addSkipped('v3', 'x');
    expect(r.summaryText()).toBe('[DONE] 1 downloaded, 1 failed, 1 skipped');
  });
});

describe('Report.exitCode', () => {
  it('returns 3 when there was nothing to do', () => {
    expect(new Report().exitCode()).toBe(3);
  });

  it('returns 0 when everything downloaded', () => {
    const r = new Report();
    r.addDownloaded('v1');
    expect(r.exitCode()).toBe(0);
  });

  it('returns 0 when all items skipped and none failed', () => {
    const r = new Report();
    r.addSkipped('v1', 'exists');
    expect(r.exitCode()).toBe(0);
  });

  it('returns 1 when any item failed', () => {
    const r = new Report();
    r.addDownloaded('v1');
    r.addFailure('v2', 'boom');
    expect(r.exitCode()).toBe(1);
  });
});

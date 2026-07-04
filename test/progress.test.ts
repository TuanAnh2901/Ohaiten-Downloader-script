import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import process from 'node:process';
import { parseYtDlpLine, runWithProgress } from '../src/progress.ts';

// ---------------------------------------------------------------------------
// parseYtDlpLine – 8 fixture lines
// ---------------------------------------------------------------------------

describe('parseYtDlpLine', () => {
  it('1: 0% with ~total and --- ETA', () => {
    const line = '  [download]   0.0% of ~100.00MiB at 0B/s ETA ---';
    expect(parseYtDlpLine(line)).toEqual({
      pct: 0,
      speed: 0,
      eta: 0,
      totalBytes: 104_857_600,
      downloadedBytes: 0,
    });
  });

  it('2: 50% of 100MiB at 5MiB/s ETA 00:10', () => {
    const line = '  [download]  50.0% of 100.00MiB at 5.00MiB/s ETA 00:10';
    expect(parseYtDlpLine(line)).toEqual({
      pct: 50,
      speed: 5_242_880,
      eta: 10,
      totalBytes: 104_857_600,
      downloadedBytes: 52_428_800,
    });
  });

  it('3: 100% of 1GiB at 10MiB/s ETA 00:00', () => {
    const line = '  [download] 100.0% of 1.00GiB at 10.00MiB/s ETA 00:00';
    expect(parseYtDlpLine(line)).toEqual({
      pct: 100,
      speed: 10_485_760,
      eta: 0,
      totalBytes: 1_073_741_824,
      downloadedBytes: 1_073_741_824,
    });
  });

  it('4: fractional pct with KiB units', () => {
    const line = '  [download]   0.5% of 512.00KiB at 50.0KiB/s ETA 00:09';
    const result = parseYtDlpLine(line);
    expect(result).not.toBeNull();
    expect(result!.pct).toBeCloseTo(0.5);
    expect(result!.speed).toBe(51_200);
    expect(result!.eta).toBe(9);
    expect(result!.totalBytes).toBe(524_288);
    expect(result!.downloadedBytes).toBe(2_621);
  });

  it('5: [ExtractURL] returns null', () => {
    expect(parseYtDlpLine('  [ExtractURL] Downloading subtitles...')).toBeNull();
  });

  it('6: [generic] returns null', () => {
    expect(parseYtDlpLine('  [generic] Some unrelated message')).toBeNull();
  });

  it('7: nonsense returns null', () => {
    expect(parseYtDlpLine('  nonsense gibberish')).toBeNull();
  });

  it('8: ANSI escape prefixes are stripped and line is parsed', () => {
    const line = '  \x1b[2K\x1b[1A\x1b[2K[download]  75.0% of 500.00MiB';
    expect(parseYtDlpLine(line)).toEqual({
      pct: 75,
      speed: 0,
      eta: 0,
      totalBytes: 524_288_000,
      downloadedBytes: 393_216_000,
    });
  });
});

// ---------------------------------------------------------------------------
// runWithProgress
// ---------------------------------------------------------------------------

/**
 * Wait for one process.nextTick cycle so that deferred stream 'data' events
 * propagate through readline and 'line' listeners.
 *
 * Node.js Readable.push() does NOT emit 'data' synchronously even in flowing
 * mode — the emission is deferred to the next tick.  We need to yield before
 * we check results or emit the child 'close' event.
 *
 * Importantly, process.nextTick is NOT faked by vi.useFakeTimers(), so this
 * helper works in both timer regimes.
 */
function nextTick(): Promise<void> {
  return new Promise((resolve) => process.nextTick(resolve));
}

/**
 * Create a minimal mock ChildProcess using Readable.from() streams.
 *
 * Readable.from() is preferred over manual new Readable({ read(){} }) + push()
 * because it works correctly with Node's internal stream deferral mechanism.
 */
function createMockChild(
  stdoutLines: string[],
  stderrLines: string[],
): EventEmitter & { stdout: Readable; stderr: Readable } {
  const stdout = Readable.from(stdoutLines);
  const stderr = Readable.from(stderrLines);
  return Object.assign(new EventEmitter(), { stdout, stderr });
}

describe('runWithProgress', () => {
  it('calls onProgress for download progress lines and resolves on close', async () => {
    const child = createMockChild(
      [
        '[download]   0.0% of 100.00MiB at 0B/s ETA 00:10\n',
        '[download]  50.0% of 100.00MiB at 5.00MiB/s ETA 00:05\n',
        '[download] 100.0% of 100.00MiB at 5.00MiB/s ETA 00:00\n',
      ],
      ['something on stderr\n'],
    );

    const onProgress = vi.fn();
    const promise = runWithProgress(child, onProgress, 100);

    // Yield so Readable data flows through readline → 'line' events.
    await nextTick();

    child.emit('close', 0);

    const result = await promise;
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('something on stderr\n');

    // First line fires immediately; lines 2 & 3 are suppressed within the
    // throttle window (all three arrive in the same tick).
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ pct: 0 }),
    );
  });

  it('resolves with non-zero code and captured stderr', async () => {
    const child = createMockChild([], ['fatal error\n']);

    const promise = runWithProgress(child, vi.fn(), 100);

    await nextTick();

    child.emit('close', 1);

    const result = await promise;
    expect(result.code).toBe(1);
    expect(result.stderr).toBe('fatal error\n');
  });

  it('fires trailing edge progress when throttle window expires', async () => {
    vi.useFakeTimers();

    const child = createMockChild(
      [
        '[download]   0.0% of 100.00MiB at 0B/s ETA 00:10\n',
        '[download]  50.0% of 100.00MiB at 5.00MiB/s ETA 00:05\n',
        '[download] 100.0% of 100.00MiB at 5.00MiB/s ETA 00:00\n',
      ],
      [],
    );

    const onProgress = vi.fn();
    const promise = runWithProgress(child, onProgress, 100);

    // Let stream data flow (process.nextTick is real even under fake timers).
    await nextTick();

    // Leading edge fired immediately; rest suppressed.
    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ pct: 0 }),
    );

    // Advance past the throttle window – trailing edge fires with the last
    // suppressed value.
    await vi.advanceTimersByTimeAsync(150);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(2,
      expect.objectContaining({ pct: 100 }),
    );

    child.emit('close', 0);
    await promise;

    vi.useRealTimers();
  });
});

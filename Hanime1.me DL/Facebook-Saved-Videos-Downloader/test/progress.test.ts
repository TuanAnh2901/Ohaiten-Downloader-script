import { describe, expect, it, vi } from 'vitest';
import { MultiProgress } from '../src/multiprogress.js';
import { parseYtDlpLine, ProgressBar } from '../src/progress.js';

// ---------------------------------------------------------------------------
// parseYtDlpLine – fixtures mirroring AnimehayCLI test/progress.test.ts
// ---------------------------------------------------------------------------

describe('parseYtDlpLine', () => {
  it('1: 0% with ~total and --- ETA', () => {
    const line = '  [download]   0.0% of ~100.00MiB at 0B/s ETA ---';
    expect(parseYtDlpLine(line)).toEqual({
      percent: 0,
      size: '100.00MiB',
      speed: '0B/s',
      eta: '',
    });
  });

  it('2: 50% of 100MiB at 5MiB/s ETA 00:10', () => {
    const line = '  [download]  50.0% of 100.00MiB at 5.00MiB/s ETA 00:10';
    expect(parseYtDlpLine(line)).toEqual({
      percent: 50,
      size: '100.00MiB',
      speed: '5.00MiB/s',
      eta: '00:10',
    });
  });

  it('3: 100% of 1GiB at 10MiB/s ETA 00:00', () => {
    const line = '  [download] 100.0% of 1.00GiB at 10.00MiB/s ETA 00:00';
    expect(parseYtDlpLine(line)).toEqual({
      percent: 100,
      size: '1.00GiB',
      speed: '10.00MiB/s',
      eta: '00:00',
    });
  });

  it('4: fractional pct with KiB units', () => {
    const line = '  [download]   0.5% of 512.00KiB at 50.0KiB/s ETA 00:09';
    expect(parseYtDlpLine(line)).toEqual({
      percent: 0.5,
      size: '512.00KiB',
      speed: '50.0KiB/s',
      eta: '00:09',
    });
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

  it('8: ANSI cursor escapes are stripped and line is parsed', () => {
    const line = '  \x1b[2K\x1b[1A\x1b[2K[download]  75.0% of 500.00MiB';
    expect(parseYtDlpLine(line)).toEqual({
      percent: 75,
      size: '500.00MiB',
      speed: '',
      eta: '',
    });
  });

  it('9: completed line with "in" duration (no speed/ETA)', () => {
    const line = '  [download] 100% of 1.29MiB in 00:03';
    expect(parseYtDlpLine(line)).toEqual({
      percent: 100,
      size: '1.29MiB',
      speed: '',
      eta: '',
    });
  });

  it('10: [download] Destination line returns null', () => {
    expect(
      parseYtDlpLine('  [download] Destination: /path/to/file.mp4'),
    ).toBeNull();
  });

  it('11: h:mm:ss ETA variant', () => {
    const line = '  [download]  42.0% of 300.00MiB at 1.00MiB/s ETA 1:00:42';
    expect(parseYtDlpLine(line)).toEqual({
      percent: 42,
      size: '300.00MiB',
      speed: '1.00MiB/s',
      eta: '1:00:42',
    });
  });

  it('12: ANSI SGR color codes are stripped', () => {
    const line = '  \x1b[31m[download]\x1b[0m  10.0% of 2.00GiB at 200.00KiB/s ETA 00:01';
    expect(parseYtDlpLine(line)).toEqual({
      percent: 10,
      size: '2.00GiB',
      speed: '200.00KiB/s',
      eta: '00:01',
    });
  });
});

// ---------------------------------------------------------------------------
// ProgressBar – stderr-only in-place rendering
// ---------------------------------------------------------------------------

describe('ProgressBar', () => {
  it('renders in-place on stderr and never writes to stdout', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const bar = new ProgressBar('video');
      bar.update(45.2, '5.5MiB', '12.3MiB', '1.2MiB/s', '00:10');
      expect(stderrWrite).toHaveBeenCalledWith(
        expect.stringContaining('\r\x1b[Kvideo'),
      );
      expect(stdoutWrite).not.toHaveBeenCalled();
    } finally {
      stderrWrite.mockRestore();
      stdoutWrite.mockRestore();
    }
  });

  it('finish() clears the line and prints message on a new line', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const bar = new ProgressBar('video');
      bar.finish('[OK] Completed');
      expect(stderrWrite).toHaveBeenCalledWith('\r\x1b[Kvideo  [OK] Completed\n');
    } finally {
      stderrWrite.mockRestore();
    }
  });

  it('update() is a no-op after finish()', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const bar = new ProgressBar('video');
      bar.finish('[OK] Completed');
      stderrWrite.mockClear();
      bar.update(50, '1MiB', '2MiB', '1MiB/s', '00:01');
      expect(stderrWrite).not.toHaveBeenCalled();
    } finally {
      stderrWrite.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// MultiProgress – stacked bars with cursor moves
// ---------------------------------------------------------------------------

describe('MultiProgress', () => {
  it('stacks lines and moves cursor up when re-rendering', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const mp = new MultiProgress();
      const a = mp.createSlot('video-a');
      a.update(50, '5MiB', '10MiB', '1MiB/s', '00:05');
      stderrWrite.mockClear();
      mp.createSlot('video-b');
      const calls = stderrWrite.mock.calls.map((c) => c[0] as string);
      expect(calls).toContain('\r\x1b[1A');
    } finally {
      stderrWrite.mockRestore();
    }
  });

  it('finishAll() marks every slot done and freezes updates', () => {
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const mp = new MultiProgress();
      const a = mp.createSlot('video-a');
      mp.finishAll('batch done');
      stderrWrite.mockClear();
      a.update(50, '5MiB', '10MiB', '1MiB/s', '00:05');
      expect(stderrWrite).not.toHaveBeenCalled();
    } finally {
      stderrWrite.mockRestore();
    }
  });
});

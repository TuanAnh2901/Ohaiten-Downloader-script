/**
 * yt-dlp progress line parser for Animehay.
 *
 * Parses yt-dlp stdout progress lines and provides a throttled wrapper for
 * reading child-process output with controlled callback frequency.
 *
 * Also exports a winutil-style `ProgressBar` class and a high-level
 * `downloadWithProgress` function for single-episode downloads.
 */

import { type ChildProcess, spawn } from 'node:child_process';
import readline from 'node:readline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressData {
  pct: number;
  speed: number;
  eta: number;
  totalBytes: number;
  downloadedBytes: number;
}

// ---------------------------------------------------------------------------
// ANSI escape stripping
// ---------------------------------------------------------------------------

/**
 * Strip ALL ANSI escape sequences, including cursor movement (\x1b[2K, \x1b[1A)
 * and SGR colors (\x1b[31m). yt-dlp emits cursor codes even with --newline.
 */
function stripAnsi(s: string): string {
  // Covers CSI sequences: ESC [ ... letter
  return s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Match a yt-dlp [download] progress line.
 *
 * Capture groups (all optional after pct):
 *   1 – percentage (e.g. "50.0")
 *   2 – total size number (e.g. "100.00")
 *   3 – total size unit (e.g. "MiB")
 *   4 – speed number (e.g. "5.00")
 *   5 – speed unit (e.g. "MiB")
 *   6 – ETA string (e.g. "00:10" or "0:00:42")
 */
const PROGRESS_RE =
  /\[download\]\s+([\d.]+)%(?:\s+of\s+~?\s*([\d.]+)\s*(B|KiB|MiB|GiB|TiB|iB))?(?:\s+at\s+([\d.]+)\s*(B|KiB|MiB|GiB|TiB|iB)\/s)?(?:\s+ETA\s+(\d+(?::\d+){0,2}))?/;

const UNIT_MAP: Record<string, number> = {
  B: 1,
  KiB: 1024,
  MiB: 1048576,
  GiB: 1073741824,
  TiB: 1099511627776,
  iB: 1,
};

/** Convert a size like "100.00" + "MiB" to raw bytes. */
function parseSize(value: string, unit: string): number {
  const num = parseFloat(value);
  if (!isFinite(num)) return 0;
  return Math.round(num * (UNIT_MAP[unit] ?? 1));
}

/** Convert an ETA string ("mm:ss" or "h:mm:ss") to seconds. */
function parseEta(raw: string): number {
  if (!raw || raw === '---') return 0;
  const parts = raw.split(':').map(Number);
  if (parts.length === 2) {
    // mm:ss
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    // h:mm:ss
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

// ---------------------------------------------------------------------------
// ProgressBar (winutil-style)
// ---------------------------------------------------------------------------

/**
 * A single-line progress bar that renders in-place on stderr.
 */
export class ProgressBar {
  private lastLineLength = 0;
  private finished = false;

  constructor(
    private label: string,
    private width: number = 50,
  ) {}

  /**
   * Render the progress bar on stderr, overwriting the current line.
   * After `finish()` is called, `update()` is a no-op.
   */
  update(percent: number, downloaded: string, total: string, speed: string, eta: string): void {
    if (this.finished) return;

    const clampedPct = Math.max(0, Math.min(100, percent));
    const filled = Math.round((clampedPct / 100) * this.width);
    const empty = this.width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const line = `${this.label}  [${bar}] ${clampedPct.toFixed(1)}%  ${downloaded}/${total}  ${speed}  ETA ${eta}`;

    // \r returns to column 0, \x1b[K clears the rest of the line so we
    // never leave a partial line when the next update is shorter.
    process.stderr.write(`\r\x1b[K${line}`);
    this.lastLineLength = line.length;
  }

  /**
   * Mark the progress bar as finished and print a final message on a new line.
   */
  finish(message: string): void {
    if (this.finished) return;
    this.finished = true;
    process.stderr.write(`\r\x1b[K${this.label}  ${message}\n`);
  }
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

/**
 * Format an ETA in seconds to "mm:ss" or "h:mm:ss".
 */
export function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format a byte count to a human-readable string (e.g. "100.00MiB").
 */
export function formatBytes(bytes: number): string {
  if (!isFinite(bytes) || bytes <= 0) return '0B';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(2)}${units[i]}`;
}

/**
 * Format a transfer speed (bytes/sec) to a human-readable string.
 */
export function formatSpeed(bytesPerSec: number): string {
  if (!isFinite(bytesPerSec) || bytesPerSec <= 0) return '0B/s';
  return formatBytes(bytesPerSec) + '/s';
}

// ---------------------------------------------------------------------------
// downloadWithProgress – high-level download wrapper
// ---------------------------------------------------------------------------

/**
 * Spawn yt-dlp with the given args and display a single-line progress bar
 * on stderr by parsing yt-dlp's `[download]` progress lines.
 *
 * Reads BOTH stdout and stderr for progress (yt-dlp may emit to either
 * depending on flags/version).
 *
 * Resolves when the child process exits.
 */
export async function downloadWithProgress(
  ytDlpPath: string,
  args: string[],
  label: string,
  onComplete?: (code: number) => void,
  slot?: { update: (pct: number, downloaded: string, total: string, speed: string, eta: string) => void; finish: (message: string) => void },
): Promise<{ code: number }> {
  const child = spawn(ytDlpPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Use external slot (multi-progress) or internal ProgressBar
  const updater = slot ?? new ProgressBar(label);

  const { code } = await runWithProgress(child, (p) => {
    const dl = formatBytes(p.downloadedBytes);
    const total = formatBytes(p.totalBytes);
    const speed = formatSpeed(p.speed);
    const eta = formatEta(p.eta);
    if (slot) {
      slot.update(p.pct, dl, total, speed, eta);
    } else {
      (updater as ProgressBar).update(p.pct, dl, total, speed, eta);
    }
  });

  if (slot) {
    slot.finish(code === 0 ? '[OK] Completed' : `[FAIL] Exit code ${code}`);
  } else {
    const bar = updater as ProgressBar;
    if (code === 0) {
      bar.finish('[OK] Completed');
    } else {
      bar.finish(`[FAIL] Exit code ${code}`);
    }
  }

  onComplete?.(code);
  return { code };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a single line of yt-dlp output into structured progress data.
 *
 * Strips ALL ANSI escape sequences (SGR + cursor movement) before matching.
 * Returns `null` when the line is not a `[download]` progress line.
 */
export function parseYtDlpLine(line: string): ProgressData | null {
  const clean = stripAnsi(line);
  const match = clean.match(PROGRESS_RE);
  if (!match) return null;

  const pct = parseFloat(match[1]);
  const totalBytes = match[2] && match[3] ? parseSize(match[2], match[3]) : 0;
  const speed = match[4] && match[5] ? parseSize(match[4], match[5]) : 0;
  const eta = match[6] ? parseEta(match[6]) : 0;

  // downloadedBytes derived from totalBytes × pct (avoids a second regex capture
  // and stays consistent if totalBytes is unknown → 0)
  const downloadedBytes = totalBytes > 0 ? Math.round(totalBytes * (pct / 100)) : 0;

  return { pct, speed, eta, totalBytes, downloadedBytes };
}

/**
 * Read yt-dlp output line-by-line from BOTH stdout and stderr, parse progress,
 * and invoke `onProgress` with **leading + trailing throttle** at `throttleMs`.
 *
 * - The first progress update fires immediately.
 * - Subsequent updates within `throttleMs` are suppressed, latest is remembered.
 * - When the window expires the remembered value fires (trailing edge).
 *
 * Resolves when the child process exits with `{ code, stderr }`.
 */
export function runWithProgress(
  child: ChildProcess,
  onProgress: (p: ProgressData) => void,
  throttleMs = 100,
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    let stderr = '';
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let pending: ProgressData | null = null;
    let isFirst = true;

    const fire = (p: ProgressData) => {
      onProgress(p);
      pending = null;
    };

    const startThrottleWindow = () => {
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        if (pending) {
          fire(pending);
        }
      }, throttleMs);
    };

    const throttled = (p: ProgressData) => {
      if (isFirst) {
        isFirst = false;
        fire(p);
        startThrottleWindow();
        return;
      }

      if (throttleTimer) {
        pending = p;
        return;
      }

      fire(p);
      startThrottleWindow();
    };

    const handleLine = (line: string) => {
      const parsed = parseYtDlpLine(line);
      if (parsed) {
        throttled(parsed);
      }
    };

    // Read stdout line by line
    if (child.stdout) {
      const rlOut = readline.createInterface({ input: child.stdout });
      rlOut.on('line', handleLine);
    }
    // Read stderr line by line — yt-dlp sometimes writes progress to stderr
    if (child.stderr) {
      const rlErr = readline.createInterface({ input: child.stderr });
      rlErr.on('line', (line: string) => {
        stderr += line + '\n';
        const parsed = parseYtDlpLine(line);
        if (parsed) {
          throttled(parsed);
        }
      });
    }

    child.on('close', (code) => {
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
      resolve({ code: code ?? -1, stderr });
    });
  });
}

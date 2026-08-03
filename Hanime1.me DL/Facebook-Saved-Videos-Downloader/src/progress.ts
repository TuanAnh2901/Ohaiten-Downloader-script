// ---------------------------------------------------------------------------
// yt-dlp progress line parsing + single-line progress bar rendering
// ---------------------------------------------------------------------------

export interface ParsedProgress {
  percent: number;
  size: string;
  speed: string;
  eta: string;
}

// Strip ANSI escape sequences (SGR colors + cursor movement). yt-dlp emits
// cursor codes like \x1b[2K and \x1b[1A even with --newline.
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

// [download]  45.2% of 12.3MiB at 1.2MiB/s ETA 00:10
// Groups: 1=pct, 2=size number, 3=size unit, 4=speed number, 5=speed unit,
//         6=ETA ("mm:ss" / "h:mm:ss" / "mm")
const PROGRESS_RE =
  /\[download\]\s+([\d.]+)%(?:\s+of\s+~?\s*([\d.]+)\s*(B|KiB|MiB|GiB|TiB|iB))?(?:\s+at\s+([\d.]+)\s*(B|KiB|MiB|GiB|TiB|iB)\/s)?(?:\s+ETA\s+(\d+(?::\d+){0,2}))?/;

/**
 * Parse a single yt-dlp output line into progress data.
 *
 * Strips all ANSI escape sequences before matching. Returns `null` when the
 * line is not a `[download]` progress line (e.g. `[youtube] Extracting URL:`,
 * `[download] Destination: ...`).
 */
export function parseYtDlpLine(line: string): ParsedProgress | null {
  const match = stripAnsi(line).match(PROGRESS_RE);
  if (!match) return null;
  const size = match[2] && match[3] ? `${match[2]}${match[3]}` : '';
  const speed = match[4] && match[5] ? `${match[4]}${match[5]}/s` : '';
  return {
    percent: parseFloat(match[1]),
    size,
    speed,
    eta: match[6] ?? '',
  };
}

// ---------------------------------------------------------------------------
// ProgressBar – single-line in-place rendering
// ---------------------------------------------------------------------------

/**
 * A single-line progress bar that renders in-place on stderr.
 *
 * Progress goes to stderr so stdout stays clean for machine consumers.
 */
export class ProgressBar {
  private finished = false;

  constructor(
    private label: string,
    private width: number = 50,
  ) {}

  /**
   * Render the progress bar on stderr, overwriting the current line.
   * After `finish()` is called, `update()` is a no-op.
   */
  update(
    percent: number,
    downloaded: string,
    total: string,
    speed: string,
    eta: string,
  ): void {
    if (this.finished) return;

    const clampedPct = Math.max(0, Math.min(100, percent));
    const filled = Math.round((clampedPct / 100) * this.width);
    const empty = this.width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const line =
      `${this.label}  [${bar}] ${clampedPct.toFixed(1)}%  ` +
      `${downloaded}/${total}  ${speed}  ETA ${eta}`;

    // \r returns to column 0, \x1b[K clears the rest of the line so a
    // shorter update never leaves a partial line behind.
    process.stderr.write(`\r\x1b[K${line}`);
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

/**
 * yt-dlp argument builder for Animehay.
 * Produces the exact command-line arguments for Node's child_process.spawn.
 */

export interface YtDlpArgs {
  args: string[];
  outPath: string;
}

export interface BuildYtDlpOpts {
  url: string;
  referer: string;
  cookieFile?: string | null;
  outPath?: string;
  concurrentFragments?: number;
  /** Target resolution height, e.g. 480, 720, 1080. Maps to -S "res:N" */
  res?: number;
  /** Number of retries on error (default 10). Maps to --retries N */
  retries?: number;
  /** Buffer size string e.g. "16M". Maps to --buffer-size SIZE */
  bufferSize?: string;
  /** Socket timeout in seconds (default 30). Maps to --socket-timeout SECONDS */
  socketTimeout?: number;
  /** Temp directory for partial downloads. Maps to --paths temp:TEMP_DIR */
  tempDir?: string;
}

/**
 * Build a yt-dlp arguments array from the given options.
 * The args are ordered: flags first, then URL last (yt-dlp convention).
 *
 * Default concurrentFragments is 6. A value of 0 is treated as "use default 6".
 * If cookieFile is provided, --cookies and the path are inserted before the URL.
 * If outPath is not provided, it is derived from the URL's last path segment.
 */
export function buildYtDlpArgs(opts: BuildYtDlpOpts): string[] {
  if (!opts.url) {
    throw new Error('url is required');
  }

  const cf = opts.concurrentFragments && opts.concurrentFragments > 0
    ? opts.concurrentFragments
    : 16;

  const outPath = opts.outPath ?? defaultOutPath(opts.url);

  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  const args: string[] = [
    '--newline',
    '--no-mtime',
    '--no-playlist',
    '--no-part',
    '--concurrent-fragments',
    String(cf),
    '--merge-output-format',
    'mp4',
    '--remux-video',
    'mp4',
    '-o',
    outPath,
    '--add-headers',
    `Referer: ${opts.referer}`,
    '--add-headers',
    `User-Agent: ${ua}`,
  ];

  // Resolution filter
  if (opts.res && opts.res > 0) {
    args.push('-S', `res:${opts.res}`);
  }

  // Retries (default to 10 when not specified but requested)
  if (opts.retries !== undefined && opts.retries >= 0) {
    args.push('--retries', String(opts.retries));
  } else {
    args.push('--retries', '10');
  }

  // Buffer size (default 16M)
  if (opts.bufferSize) {
    args.push('--buffer-size', opts.bufferSize);
  } else {
    args.push('--buffer-size', '16M');
  }

  // Socket timeout (default 30)
  if (opts.socketTimeout !== undefined && opts.socketTimeout > 0) {
    args.push('--socket-timeout', String(opts.socketTimeout));
  } else {
    args.push('--socket-timeout', '30');
  }

  // Temp directory via --paths temp:TEMP_DIR
  if (opts.tempDir) {
    args.push('--paths', `temp:${opts.tempDir}`);
  }

  if (opts.cookieFile) {
    args.push('--cookies', opts.cookieFile);
  }

  args.push(opts.url);

  return args;
}

/**
 * Derive a default output path from a URL.
 * Extracts the last path segment (filename) and uses it as the output template.
 */
function defaultOutPath(url: string): string {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.replace(/\/+$/, '').split('/');
    const last = segments[segments.length - 1];
    if (last && last.length > 0) {
      // Strip file extension and use as base filename
      const dot = last.lastIndexOf('.');
      const base = dot > 0 ? last.slice(0, dot) : last;
      return `${base}.%(ext)s`;
    }
  } catch {
    // fall through for invalid URLs
  }
  return 'output.%(ext)s';
}

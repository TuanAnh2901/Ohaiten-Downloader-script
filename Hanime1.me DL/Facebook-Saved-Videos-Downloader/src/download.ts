// ---------------------------------------------------------------------------
// yt-dlp download coordinator.
//
// Mirrors AnimehayCLI's cmd-builder arg list + worker pool, with two
// project-specific rules:
//   1. COOKIE SAFETY: yt-dlp's --cookies FILE is READ-WRITE — it rewrites the
//      file on exit and silently drops HttpOnly session cookies (c_user, xs,
//      presence). This destroyed the user's master cookie file once
//      (see learnings.md). Every download path therefore passes a TEMP COPY of
//      the cookie file to yt-dlp and deletes it afterwards.
//   2. Resume markers: {outPath}.done.json is the PRIMARY skip signal; a file
//      >= 1MB without a marker is also skipped (pre-marker downloads). Small
//      files without a marker still download (partial/corrupt files).
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { copyFile, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AUTH_FAILED, FbSavedCliError } from './errors.js';

// ---------------------------------------------------------------------------
// yt-dlp arg builder (mirrors AnimehayCLI cmd-builder, FB-adapted)
// ---------------------------------------------------------------------------

export interface BuildYtDlpArgsOpts {
  cookiesFile: string;
  outPath: string;
  url: string;
  /** The binary is the spawn executable, never an arg — kept for symmetry. */
  ytDlpPath?: string;
}

export function buildYtDlpArgs(opts: BuildYtDlpArgsOpts): string[] {
  return [
    '--cookies',
    opts.cookiesFile,
    '-f',
    // HD DASH when available; /b = best muxed fallback so videos with no
    // matching DASH streams (e.g. SD-only muxed) still resolve a format.
    'bv*[height<=720]+ba/b[height<=720]/b',
    '--merge-output-format',
    'mp4',
    '--remux-video',
    'mp4',
    '--no-playlist',
    '-N',
    '4',
    '--retries',
    '3',
    '--fragment-retries',
    '10',
    '--skip-unavailable-fragments',
    '-o',
    opts.outPath,
    '--no-overwrites',
    // Capture the final filepath (template vars could rename the output).
    '--print',
    'after_move:filepath',
    // URL last, per AnimehayCLI convention.
    opts.url,
  ];
}

// ---------------------------------------------------------------------------
// Cookie safety
// ---------------------------------------------------------------------------

/**
 * Copy the master cookie file to a temp path so yt-dlp's READ-WRITE
 * `--cookies` handling can never scrub the master. The temp copy is deleted
 * via the returned `cleanup()`.
 */
export async function copyCookiesForYtDlp(
  srcPath: string,
): Promise<{ tempPath: string; cleanup: () => Promise<void> }> {
  const tempPath = join(
    tmpdir(),
    `fb-saved-dl-cookies-${process.pid}-${randomBytes(4).toString('hex')}.txt`,
  );
  await copyFile(srcPath, tempPath);
  return {
    tempPath,
    cleanup: async () => {
      try {
        await unlink(tempPath);
      } catch {
        /* already gone — fine */
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Spawn runner
// ---------------------------------------------------------------------------

/** Lines mentioning a login problem, matched ONLY when the download failed. */
const AUTH_PATTERN = /sign in|login|log in|cookies/i;

function runYtDlp(
  ytDlpPath: string,
  args: string[],
  onProgress?: (line: string) => void,
  spawnFn: typeof spawn = spawn,
): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawnFn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      for (const line of text.split('\n')) onProgress?.(line);
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('close', (code) => resolve({ code: code ?? -1, output }));
    child.on('error', (err) =>
      resolve({ code: -1, output: `${output}\n${err.message}` }),
    );
  });
}

function lastErrorLine(output: string): string {
  const lines = output
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('ERROR'));
  return lines[lines.length - 1] ?? 'no error detail captured';
}

// ---------------------------------------------------------------------------
// Markers + skip checks
// ---------------------------------------------------------------------------

export function writeDoneMarker(
  outPath: string,
  meta: { videoId: string; url: string; size: number },
): void {
  const payload = {
    videoId: meta.videoId,
    url: meta.url,
    timestamp: new Date().toISOString(),
    size: meta.size,
  };
  writeFileSync(`${outPath}.done.json`, JSON.stringify(payload, null, 2));
}

export function hasDoneMarker(outPath: string): boolean {
  return existsSync(`${outPath}.done.json`);
}

/** File exists AND >= 1MB — catches complete pre-marker downloads, while
 *  small/partial files (no marker) still download. */
export function isAlreadyDownloaded(outPath: string): boolean {
  try {
    return existsSync(outPath) && statSync(outPath).size >= 1_048_576;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Single-video download
// ---------------------------------------------------------------------------

export interface DownloadVideoOpts {
  cookiesFile: string;
  outPath: string;
  url: string;
  ytDlpPath?: string;
  onProgress?: (line: string) => void;
  /** Test seam: inject a fake spawn. Defaults to node:child_process.spawn. */
  spawnFn?: typeof spawn;
}

export async function downloadVideo(
  opts: DownloadVideoOpts,
): Promise<{ ok: boolean; error?: string; size?: number }> {
  const { tempPath, cleanup } = await copyCookiesForYtDlp(opts.cookiesFile);
  try {
    const args = buildYtDlpArgs({
      cookiesFile: tempPath,
      outPath: opts.outPath,
      url: opts.url,
    });
    const { code, output } = await runYtDlp(
      opts.ytDlpPath ?? 'yt-dlp',
      args,
      opts.onProgress,
      opts.spawnFn,
    );
    if (code !== 0) {
      if (AUTH_PATTERN.test(output)) {
        throw new FbSavedCliError(
          AUTH_FAILED,
          'yt-dlp reports a login problem — refresh cookies',
        );
      }
      return {
        ok: false,
        error: `yt-dlp exited with code ${code}: ${lastErrorLine(output)}`,
      };
    }
    let size: number | undefined;
    try {
      size = statSync(opts.outPath).size;
    } catch {
      /* file not on disk (e.g. dry run / mocked tests) — size unknown */
    }
    return { ok: true, size };
  } finally {
    await cleanup();
  }
}

// ---------------------------------------------------------------------------
// Concurrency pool (mirrors AnimehayCLI series.ts worker pool)
// ---------------------------------------------------------------------------

export interface DownloadItem {
  videoId: string;
  url: string;
  outPath: string;
}

export interface DownloadManyOpts {
  /** Max concurrent yt-dlp processes (default 3). */
  jobs: number;
  cookiesFile: string;
  ytDlpPath?: string;
  onProgress?: (videoId: string, line: string) => void;
  onDone?: (videoId: string) => void;
  /** Test seam: inject a fake spawn. Defaults to node:child_process.spawn. */
  spawnFn?: typeof spawn;
}

export type DownloadResult = {
  videoId: string;
  status: 'downloaded' | 'skipped' | 'failed';
  error?: string;
};

async function downloadOne(
  item: DownloadItem,
  opts: DownloadManyOpts,
): Promise<DownloadResult> {
  try {
    if (hasDoneMarker(item.outPath) || isAlreadyDownloaded(item.outPath)) {
      return { videoId: item.videoId, status: 'skipped' };
    }
    const res = await downloadVideo({
      cookiesFile: opts.cookiesFile,
      outPath: item.outPath,
      url: item.url,
      ytDlpPath: opts.ytDlpPath,
      onProgress: (line) => opts.onProgress?.(item.videoId, line),
      spawnFn: opts.spawnFn,
    });
    if (!res.ok) {
      return { videoId: item.videoId, status: 'failed', error: res.error };
    }
    writeDoneMarker(item.outPath, {
      videoId: item.videoId,
      url: item.url,
      size: res.size ?? 0,
    });
    return { videoId: item.videoId, status: 'downloaded' };
  } catch (err) {
    // Per-item isolation: individual failures never throw. ONLY auth errors
    // propagate (fatal, must abort the whole run so the user refreshes cookies).
    if (err instanceof FbSavedCliError && err.code === AUTH_FAILED) {
      throw err;
    }
    return {
      videoId: item.videoId,
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function downloadMany(
  items: DownloadItem[],
  opts: DownloadManyOpts,
): Promise<DownloadResult[]> {
  const jobs = opts.jobs > 0 ? opts.jobs : 3;
  const results: DownloadResult[] = new Array(items.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx];
      results[idx] = await downloadOne(item, opts);
      opts.onDone?.(item.videoId);
    }
  };

  const workers = Array.from(
    { length: Math.min(jobs, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

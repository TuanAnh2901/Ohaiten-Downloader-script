/**
 * Auto-download yt-dlp for Animehay CLI.
 *
 * When yt-dlp is not found on PATH, downloads the latest Windows x86_64
 * binary from GitHub to `<cwd>/bin/yt-dlp.exe`.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Platform helpers
// ---------------------------------------------------------------------------

const YT_DLP_EXE = 'yt-dlp.exe';

/** Resolve the local bin directory relative to cwd. */
function localBinDir(): string {
  return join(process.cwd(), 'bin');
}

function localBinPath(): string {
  return join(localBinDir(), YT_DLP_EXE);
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the binary at `path` responds to `--version`.
 */
function checkVersion(path: string): boolean {
  try {
    const result = spawnSync(path, ['--version'], { timeout: 5000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Try to locate a working yt-dlp.
 *
 * Order:
 *  1. The user-supplied path (or "yt-dlp" by default – checked via PATH)
 *  2. `<cwd>/bin/yt-dlp.exe`
 *
 * Returns the resolved path, or `null` when neither works.
 */
export function findInstalledYtDlp(preferred?: string): string | null {
  // 1) Preferred / PATH
  if (checkVersion(preferred ?? YT_DLP_EXE)) {
    return preferred ?? YT_DLP_EXE;
  }

  // 2) Local bin
  const local = localBinPath();
  if (checkVersion(local)) {
    return local;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

const GITHUB_RELEASE =
  'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';

/**
 * Download the latest yt-dlp.exe from GitHub to `<cwd>/bin/`.
 *
 * Uses native `fetch` (Node ≥18) to stream the binary.  Returns the local
 * path on success, or `null` on failure.
 */
export async function downloadYtDlp(): Promise<string | null> {
  const outDir = localBinDir();
  const outPath = localBinPath();

  try {
    await mkdir(outDir, { recursive: true });
  } catch {
    return null; // cannot create bin/
  }

  process.stderr.write('[INFO] Downloading yt-dlp from GitHub...\n');

  let resp: Response;
  try {
    resp = await fetch(GITHUB_RELEASE);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[ERROR] Cannot reach GitHub: ${msg}\n`);
    return null;
  }

  if (!resp.ok) {
    process.stderr.write(
      `[ERROR] GitHub returned HTTP ${resp.status} ${resp.statusText}\n`,
    );
    return null;
  }

  // Stream into memory then write — good enough for a ~20 MB binary.
  let buffer: ArrayBuffer;
  try {
    buffer = await resp.arrayBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[ERROR] Download failed: ${msg}\n`);
    return null;
  }

  try {
    await writeFile(outPath, Buffer.from(buffer));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[ERROR] Cannot write ${outPath}: ${msg}\n`);
    return null;
  }

  // Verify the downloaded binary
  if (!checkVersion(outPath)) {
    process.stderr.write('[ERROR] Downloaded yt-dlp.exe does not work — corrupt download?\n');
    return null;
  }

  process.stderr.write(`[OK] yt-dlp saved to ${outPath}\n`);
  return outPath;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Ensure yt-dlp is available:
 *  1. Check user's preferred path / PATH
 *  2. Check `<cwd>/bin/yt-dlp.exe`
 *  3. Auto-download from GitHub
 *
 * Returns the resolved yt-dlp path, or `null` if all attempts failed.
 */
export async function ensureYtDlp(preferred?: string): Promise<string | null> {
  const found = findInstalledYtDlp(preferred);
  if (found) return found;

  return downloadYtDlp();
}

import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

export const VALID_BROWSERS = ['chrome', 'firefox', 'edge', 'brave', 'opera', 'chromium'] as const;

export type BrowserName = typeof VALID_BROWSERS[number];

export function isValidBrowser(name: string): name is BrowserName {
  return (VALID_BROWSERS as readonly string[]).includes(name);
}

export type CookieResult =
  | { ok: true; bytes: number }
  | { ok: false; reason: 'unsupported' | 'error'; detail: string };

/**
 * Export cookies from a browser via yt-dlp --cookies-from-browser.
 * Writes a Netscape-format cookie file to `outPath`.
 * Never throws — returns a discriminated union result.
 */
export async function exportCookiesFromBrowser(
  browser: BrowserName,
  outPath: string,
): Promise<CookieResult> {
  try {
    if (!isValidBrowser(browser)) {
      return {
        ok: false,
        reason: 'unsupported',
        detail: 'Browser must be one of: chrome, firefox, edge, brave, opera, chromium',
      };
    }

    const result = spawnSync('yt-dlp', [
      '--cookies-from-browser',
      browser,
      '--cookies',
      outPath,
      '--no-download',
      'https://animehay.tv/',
    ]);

    if (result.status !== 0) {
      return {
        ok: false,
        reason: 'error',
        detail: (result.stderr ?? '').toString() || `yt-dlp exited with status ${result.status}`,
      };
    }

    // Verify the cookie file was created
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(outPath);
    } catch {
      return {
        ok: false,
        reason: 'error',
        detail: 'Cookie file was not created by yt-dlp',
      };
    }

    // Verify the file starts with the expected Netscape header
    const content = readFileSync(outPath, 'utf-8');
    const firstLine = content.split('\n')[0]?.trim();
    if (!firstLine?.startsWith('# Netscape HTTP Cookie File')) {
      return {
        ok: false,
        reason: 'error',
        detail: `Unexpected cookie file format: ${firstLine ?? '<empty>'}`,
      };
    }

    return { ok: true, bytes: st.size };
  } catch (err) {
    return {
      ok: false,
      reason: 'error',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

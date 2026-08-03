/**
 * Playwright auth: headed persistent browser with Facebook cookie injection.
 *
 * The Netscape cookie file is only READ here (addCookies) — never rewritten,
 * unlike yt-dlp's `--cookies` which scrubs HttpOnly session cookies on exit.
 * See learnings: yt-dlp cookie scrubbing incident.
 */

import { readFile } from 'node:fs/promises';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { parseNetscapeFile, toPlaywrightCookies } from './cookies.js';
import { AUTH_FAILED, FbSavedCliError } from './errors.js';

export interface LaunchOpts {
  /** Persistent profile dir. Defaults to ./playwright-profile/. */
  userDataDir?: string;
  /** Navigate to /saved after cookie injection (default true). Tests pass
   *  false to stay hermetic (no live Facebook). */
  navigate?: boolean;
}

/**
 * Launch a HEADED persistent Chromium context, inject cookies BEFORE any
 * navigation, then navigate to https://www.facebook.com/saved. The page MUST
 * be on a real FB page before any GraphQL fetch: page.evaluate(fetch) against
 * the graphql endpoint is same-origin only (from about:blank it is
 * cross-origin → CORS → "TypeError: Failed to fetch"), and fb_dtsg comes from
 * require('DTSG') which only exists after the saved page hydrates. This was
 * the real task-18 blocker, NOT the WAF.
 */
export async function launchAuthenticated(
  cookieFile: string,
  opts: LaunchOpts = {},
): Promise<{ context: BrowserContext; page: Page }> {
  const userDataDir = opts.userDataDir ?? './playwright-profile/';
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  // Inject cookies before the first navigation so the session survives.
  const raw = await readFile(cookieFile, 'utf-8');
  await context.addCookies(toPlaywrightCookies(parseNetscapeFile(raw)));

  const page = context.pages()[0] ?? (await context.newPage());
  if (opts.navigate !== false) {
    try {
      await page.goto('https://www.facebook.com/saved', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      // Let DTSG hydrate and the page settle before any GraphQL query.
      await page.waitForTimeout(2500);
      await assertLoggedIn(page);
    } catch (err) {
      // Don't leave a headed Chromium window orphaned on auth failure.
      await context.close().catch(() => {});
      throw err;
    }
  }
  return { context, page };
}

const LOGIN_URL_RE = /\/login|\/checkpoint/;

/**
 * Bail guard: after navigating to https://www.facebook.com/saved, throw
 * AUTH_FAILED (exit 2) if Facebook redirected to a login/checkpoint URL or
 * rendered a login form. No retries — an auth bail means refresh cookies.
 */
export async function assertLoggedIn(page: Page): Promise<void> {
  const url = page.url();
  if (LOGIN_URL_RE.test(url)) {
    throw new FbSavedCliError(
      AUTH_FAILED,
      `Facebook redirected to ${url} — session expired, refresh cookies in Facebook-cookies.txt`,
    );
  }
  const loginForm = await page.$('input[name="email"], form[action*="login"]');
  if (loginForm) {
    throw new FbSavedCliError(
      AUTH_FAILED,
      'Facebook showed a login form — session expired, refresh cookies in Facebook-cookies.txt',
    );
  }
}

/** Close the persistent context (which also closes its browser). */
export async function closeBrowser(context: BrowserContext): Promise<void> {
  await context.close();
}

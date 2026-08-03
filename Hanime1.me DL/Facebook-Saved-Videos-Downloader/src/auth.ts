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
}

/**
 * Launch a HEADED persistent Chromium context and inject cookies BEFORE any
 * navigation. `launchPersistentContext` returns the context directly (no
 * separate browser object); closing the context closes the browser.
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

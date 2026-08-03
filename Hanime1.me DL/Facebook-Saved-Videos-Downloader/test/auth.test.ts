import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertLoggedIn,
  closeBrowser,
  launchAuthenticated,
} from '../src/auth.js';
import { AUTH_FAILED } from '../src/errors.js';

// Synthetic cookie fixture — never depends on the live Facebook-cookies.txt.
const COOKIE_FILE = fileURLToPath(
  new URL('./fixtures/cookies.txt', import.meta.url),
);

function tempProfile(): string {
  return mkdtempSync(join(tmpdir(), 'pw-auth-'));
}

describe('launchAuthenticated', () => {
  it('injects cookies with .facebook.com domain', async () => {
    const dir = tempProfile();
    const { context } = await launchAuthenticated(COOKIE_FILE, {
      userDataDir: dir,
      navigate: false, // hermetic: no live Facebook navigation
    });
    try {
      const cookies = await context.cookies();
      const names = cookies.map((c) => c.name);
      expect(names).toContain('c_user');
      expect(names).toContain('xs');
      expect(names).toContain('fr');
      for (const c of cookies) {
        expect(c.domain.endsWith('.facebook.com')).toBe(true);
      }
    } finally {
      await closeBrowser(context);
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);
});

describe('assertLoggedIn', () => {
  it('throws AUTH_FAILED with "refresh cookies" when /saved redirects to /login', async () => {
    const dir = tempProfile();
    const { context, page } = await launchAuthenticated(COOKIE_FILE, {
      userDataDir: dir,
      navigate: false, // hermetic: this test routes its own /saved navigation
    });
    try {
      await page.route('**/*', async (route) => {
        if (route.request().url().includes('/saved')) {
          await route.fulfill({
            status: 302,
            headers: { location: '/login' },
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<html><body></body></html>',
          });
        }
      });
      await page.goto('https://www.facebook.com/saved');
      expect(page.url()).toContain('/login');
      const err = await assertLoggedIn(page).catch((e) => e);
      expect(err.code).toBe(AUTH_FAILED);
      expect(err.message).toContain('refresh cookies');
    } finally {
      await closeBrowser(context);
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);
});

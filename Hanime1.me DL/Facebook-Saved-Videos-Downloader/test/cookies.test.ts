import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  parseNetscapeFile,
  toPlaywrightCookies,
  toCookieHeader,
} from '../src/cookies.js';

// Synthetic fixture: deterministic Netscape cookie file (never depends on the
// user's live Facebook-cookies.txt, which changes on every re-export).
const FIXTURE = readFileSync(
  new URL('./fixtures/cookies.txt', import.meta.url),
  'utf-8',
);

describe('parseNetscapeFile', () => {
  it('parses exactly 11 cookies from the fixture (13 lines minus 2 comment)', () => {
    const cookies = parseNetscapeFile(FIXTURE);
    expect(cookies).toHaveLength(11);
    // Order-independent: the live cookie file can reorder, the fixture is fixed.
    expect(cookies.map((c) => c.name).sort()).toEqual([
      'datr',
      'sb',
      'ps_l',
      'ps_n',
      'ar_debug',
      'locale',
      'c_user',
      'wd',
      'fr',
      'xs',
      'presence',
    ].sort());
  });

  it('handles the #HttpOnly_ domain prefix as an httpOnly flag', () => {
    const synthetic = [
      '# Netscape HTTP Cookie File',
      '#HttpOnly_.facebook.com\tTRUE\t/\tTRUE\t0\tdpr\t2',
    ].join('\n');
    const cookies = parseNetscapeFile(synthetic);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe('dpr');
    expect(cookies[0].httpOnly).toBe(true);
    expect(cookies[0].domain).toBe('.facebook.com');
  });
});

describe('toPlaywrightCookies', () => {
  it('forces leading-dot domains and maps session expiry 0 to -1', () => {
    const pw = toPlaywrightCookies(parseNetscapeFile(FIXTURE));
    expect(pw).toHaveLength(11);
    for (const c of pw) {
      expect(c.domain.startsWith('.')).toBe(true);
      expect(c.expires).toBeGreaterThanOrEqual(-1);
    }
    // ar_debug and presence are session cookies (expires 0 in the file)
    const session = pw.filter((c) => ['ar_debug', 'presence'].includes(c.name));
    expect(session).toHaveLength(2);
    for (const c of session) expect(c.expires).toBe(-1);
    expect(pw.find((c) => c.name === 'c_user')?.expires).toBeGreaterThan(-1);
  });
});

describe('toCookieHeader', () => {
  it('joins name=value pairs with "; "', () => {
    const header = toCookieHeader(parseNetscapeFile(FIXTURE));
    expect(header).toContain('c_user=123456789012345');
    expect(header).toContain('xs=');
    expect(header.split('; ')).toHaveLength(11);
  });
});

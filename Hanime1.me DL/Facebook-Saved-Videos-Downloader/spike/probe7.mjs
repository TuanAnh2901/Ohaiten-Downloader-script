/**
 * probe7.mjs — diagnostic: does Playwright's page.request (CDP transport)
 * pass the WAF that blocks page.evaluate(fetch)?
 *
 * Launch headed chromium with fresh cookies → /saved (auth check) →
 * extract fb_dtsg → POST /api/graphql/ via BOTH transports → compare.
 * Read-only probe, no production changes.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const COOKIES = 'Facebook-cookies.txt';
const ENDPOINT = 'https://www.facebook.com/api/graphql/';
const DOC_ID = '27602599562734455'; // CometSaveLeftRailPaginationQuery
const FRIENDLY = 'CometSaveLeftRailPaginationQuery';
const VARIABLES = { count: 5, cursor: null, scale: 1 };

function parseCookies(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const parts = l.split('\t');
      const [domain, , path, secure, expires, name, value] = parts;
      return { name, value, domain: domain.startsWith('.') ? domain : '.' + domain, path, secure: secure === 'TRUE', expires: expires === '0' ? -1 : Number(expires) };
    });
}

const ctx = await chromium.launchPersistentContext('playwright-profile', {
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
try {
  await ctx.addCookies(parseCookies(readFileSync(COOKIES, 'utf8')));
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto('https://www.facebook.com/saved', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  const url = page.url();
  console.log('URL after /saved:', url.slice(0, 80));
  if (/\/login|\/checkpoint/.test(url)) {
    console.log('RESULT: AUTH FAILED — redirect to login/checkpoint');
    process.exit(2);
  }

  const tokens = await page.evaluate(() => {
    let fb_dtsg = '';
    try {
      fb_dtsg = globalThis.require?.('DTSG')?.getToken() ?? '';
    } catch {}
    const input = (n) => document.querySelector(`input[name="${n}"]`)?.value ?? '';
    return { fb_dtsg, lsd: input('lsd'), jazoest: input('jazoest') };
  });
  console.log('fb_dtsg len:', tokens.fb_dtsg?.length ?? 0);

  const form = new URLSearchParams();
  form.set('doc_id', DOC_ID);
  form.set('variables', JSON.stringify(VARIABLES));
  form.set('fb_api_req_friendly_name', FRIENDLY);
  form.set('fb_dtsg', tokens.fb_dtsg ?? '');
  form.set('lsd', tokens.lsd ?? '');
  form.set('jazoest', tokens.jazoest ?? '');
  form.set('__comet_req', '1');

  // Transport 1: page.evaluate(fetch) — the known-WAF-blocked path
  try {
    const r = await page.evaluate(async (arg) => {
      const res = await fetch(arg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: arg.body,
      });
      return { status: res.status, text: (await res.text()).slice(0, 300) };
    }, { url: ENDPOINT, body: form.toString() });
    console.log('page.evaluate(fetch): status', r.status, '| body:', r.text.slice(0, 120));
  } catch (e) {
    console.log('page.evaluate(fetch): THREW —', e.message);
  }

  // Transport 2: page.request (Playwright APIRequestContext via CDP)
  try {
    const r = await page.request.post(ENDPOINT, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: form.toString(),
    });
    const text = (await r.text()).slice(0, 300);
    console.log('page.request.post: status', r.status(), '| body:', text.slice(0, 120));
  } catch (e) {
    console.log('page.request.post: THREW —', e.message);
  }
} finally {
  await ctx.close();
}

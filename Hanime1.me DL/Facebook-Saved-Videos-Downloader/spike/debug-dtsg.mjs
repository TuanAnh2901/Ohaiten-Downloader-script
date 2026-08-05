#!/usr/bin/env node
// DEBUG: find fb_dtsg extraction method + dump /saved SSR HTML + scroll to trigger saver queries
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const COOKIE_FILE = path.join(ROOT, '..', 'Facebook-cookies.txt');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function loadCookies(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const cookies = [];
  for (const line of lines) {
    if (!line || line.startsWith('#') || line.startsWith('#HttpOnly_')) continue;
    const p = line.split('\t');
    if (p.length < 7) continue;
    cookies.push({ name: p[5], value: p[6], domain: p[0], path: p[2], secure: p[3] === 'TRUE' });
  }
  return cookies;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { chromium } = await import('playwright');
  let browser;
  try { browser = await chromium.launch({ headless: false, channel: 'msedge' }); }
  catch { browser = await chromium.launch({ headless: false }); }
  const context = await browser.newContext({ userAgent: UA, locale: 'vi-VN', viewport: { width: 1280, height: 900 } });
  await context.addCookies(loadCookies(COOKIE_FILE).map((c) => ({
    name: c.name, value: c.value, domain: '.facebook.com', path: c.path || '/',
    secure: c.secure, httpOnly: false, sameSite: 'Lax',
  })));
  const page = await context.newPage();

  const hits = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/graphql')) hits.push({ kind: 'req', url: req.url(), postData: (req.postData() || '').slice(0, 300) });
  });

  await page.goto('https://www.facebook.com/saved', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  console.log('url:', page.url());
  if (/\/login|\/checkpoint/.test(page.url())) { console.log('AUTH_FAILED'); await browser.close(); process.exit(2); }

  // dump full SSR HTML (redacted)
  const html = await page.content();
  let redacted = html;
  for (const c of loadCookies(COOKIE_FILE)) if (c.value.length >= 4) redacted = redacted.split(c.value).join('[REDACTED]');
  fs.writeFileSync(path.join(ROOT, 'evidence', 'rerun', 'saved_ssr.html'), redacted);
  console.log('html size:', redacted.length);

  // dtsg candidates
  const cands = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const out = {};
    out.inputs = [...document.querySelectorAll('input[type="hidden"]')].map((i) => ({ name: i.name, value: i.value.slice(0, 40) }));
    for (const re of [
      /"DTSGInitialData":\[\],"token":"([^"]+)"/,
      /"DTSGInitData":\[\],"token":"([^"]+)"/,
      /"DTSGInitialData":\[\],"token":"([^"]+)"/,
      /name="fb_dtsg" value="([^"]+)"/,
      /"token":"([A-Za-z0-9_-]{40,})"/,
      /fb_dtsg\\?"\s*:\s*\\?"([A-Za-z0-9_-]{40,})/,
    ]) {
      const m = html.match(re);
      if (m) out[re.source] = m[1].slice(0, 40);
    }
    out.requireDtsg = typeof window.require === 'function' ? (() => { try { return require('DTSG').getToken().slice(0, 40); } catch (e) { return 'ERR ' + e.message; } })() : 'no require';
    // look around any DTSG occurrence
    const idx = html.indexOf('DTSG');
    out.dtsgContext = idx >= 0 ? html.slice(Math.max(0, idx - 100), idx + 300) : 'no DTSG in html';
    return out;
  });
  console.log('DTSG candidates:', JSON.stringify(cands, null, 2));

  // scroll to trigger saver pagination
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1500);
  }
  await sleep(3000);
  console.log('graphql hits after scroll:', hits.length);
  for (const h of hits) console.log(' ', h.kind, h.url.slice(0, 120), '|', h.postData ? 'has postData' : 'GET');
  fs.writeFileSync(path.join(ROOT, 'evidence', 'rerun', 'scroll_hits.json'), JSON.stringify(hits, null, 2));

  await browser.close();
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });

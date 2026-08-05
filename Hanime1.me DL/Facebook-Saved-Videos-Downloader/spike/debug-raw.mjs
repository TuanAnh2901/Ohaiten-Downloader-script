#!/usr/bin/env node
// Save RAW network HTML of /saved (plain quotes, like the original dump) + full graphql postData
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
function redact(s) {
  let out = s;
  for (const c of loadCookies(COOKIE_FILE)) if (c.value.length >= 4) out = out.split(c.value).join('[REDACTED]');
  return out;
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
    if (req.url().includes('/api/graphql')) hits.push({ kind: 'req', url: req.url(), postData: redact(req.postData() || '') });
  });
  page.on('response', (res) => {
    if (res.url().includes('/api/graphql')) {
      res.text().then((t) => { hits.push({ kind: 'res', url: res.url(), status: res.status(), body: redact(t) }); }).catch(() => {});
    }
  });

  const resp = await page.goto('https://www.facebook.com/saved', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);
  if (/\/login|\/checkpoint/.test(page.url())) { console.log('AUTH_FAILED'); await browser.close(); process.exit(2); }

  // raw body
  const raw = await resp.body();
  const rawStr = Buffer.from(raw).toString('utf8');
  fs.writeFileSync(path.join(ROOT, 'evidence', 'rerun', 'saved_ssr_raw.html'), redact(rawStr));
  console.log('raw html bytes:', rawStr.length, '| has all_saves:', rawStr.includes('all_saves'));

  // dtsg via require
  const dtsg = await page.evaluate(() => { try { return require('DTSG').getToken(); } catch (e) { return null; } });
  console.log('dtsg via require:', dtsg ? dtsg.slice(0, 12) + '...' : 'FAIL');

  // scroll to trigger pagination + capture saver queries
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1500);
  }
  await sleep(3000);
  console.log('graphql req/res pairs:', hits.length);
  const saverHits = hits.filter((h) => /saved|saver|collection/i.test((h.postData || '') + h.url));
  console.log('saver-related hits:', saverHits.length);
  const withQueries = hits.filter((h) => (h.postData || '').includes('queries'));
  console.log('hits with queries param:', withQueries.length);
  for (const h of withQueries.slice(0, 5)) console.log('---\n', h.postData.slice(0, 800));
  fs.writeFileSync(path.join(ROOT, 'evidence', 'rerun', 'full_traffic.json'), JSON.stringify(hits, null, 2));
  fs.writeFileSync(path.join(ROOT, 'evidence', 'rerun', 'dtsg.txt'), dtsg || '');
  console.log('saved evidence. total req/res:', hits.length);
  await browser.close();
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });

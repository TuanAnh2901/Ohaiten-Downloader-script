#!/usr/bin/env node
// SPIKE PROBE v6 — targeted: CollectionItems doc (RELAY_PV vars) + left-rail pagination
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const COOKIE_FILE = path.join(ROOT, '..', 'Facebook-cookies.txt');
const EVIDENCE = path.join(ROOT, 'evidence', 'rerun');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const DOC_LEFT_RAIL = '27602599562734455';
const DOC_COLLECTION_ITEMS = '26605228462486746';

const DELAY_MS = 2500;
let probeCount = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
function save(name, data) {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE, name), JSON.stringify(data, null, 2));
}
function parseResp(text) {
  const cleaned = text.replace(/^for \(;;\);\s*/, '').trim();
  if (!cleaned) return {};
  try { return JSON.parse(cleaned); } catch { return { __raw: cleaned.slice(0, 200) }; }
}
const RELAY_PV = {
  __relay_internal__pv__CometUFICommentAutoTranslationTyperelayprovider: null,
  __relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider: null,
  __relay_internal__pv__CometUFICommentActionLinksRewriteEnabledrelayprovider: null,
  __relay_internal__pv__IsWorkUserrelayprovider: null,
  __relay_internal__pv__CometUFIReactionsEnableShortNamerelayprovider: null,
  __relay_internal__pv__CometUFISingleLineUFIrelayprovider: null,
  __relay_internal__pv__CometUFIShareActionMigrationrelayprovider: null,
  __relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider: null,
};

async function main() {
  const cookies = loadCookies(COOKIE_FILE);
  const names = cookies.map((c) => c.name);
  if (cookies.length < 11 || !names.includes('c_user') || !names.includes('xs')) { console.log('AUTH_FAILED'); process.exit(2); }
  console.log('auth: ok');

  const { chromium } = await import('playwright');
  let browser;
  try { browser = await chromium.launch({ headless: false, channel: 'msedge' }); }
  catch { browser = await chromium.launch({ headless: false }); }
  const context = await browser.newContext({ userAgent: UA, locale: 'vi-VN', viewport: { width: 1280, height: 900 } });
  await context.addCookies(cookies.map((c) => ({
    name: c.name, value: c.value, domain: '.facebook.com', path: c.path || '/',
    secure: c.secure, httpOnly: false, sameSite: 'Lax',
  })));
  const page = await context.newPage();

  let template = null;
  page.on('request', (req) => {
    const pd = req.postData() || '';
    if (template || !req.url().includes('/api/graphql') || !pd.includes('CometSaveDashboardAllItemsPaginationQuery')) return;
    try { template = new URLSearchParams(pd); } catch {}
  });

  await page.goto('https://www.facebook.com/saved', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  if (/\/login|\/checkpoint/.test(page.url())) { console.log('AUTH_FAILED'); await browser.close(); process.exit(2); }

  const tokens = await page.evaluate(() => {
    try {
      return { dtsg: require('DTSG').getToken(), lsd: (document.querySelector('input[name="lsd"]') || {}).value || '', jazoest: (document.querySelector('input[name="jazoest"]') || {}).value || '' };
    } catch (e) { return { dtsg: null, lsd: '', jazoest: '', err: e.message }; }
  });
  console.log('tokens:', tokens.dtsg ? 'dtsg OK' : 'dtsg MISSING');
  if (!template) {
    template = new URLSearchParams();
    template.set('av', cookies.find((c) => c.name === 'c_user')?.value || '0');
    template.set('__user', cookies.find((c) => c.name === 'c_user')?.value || '0');
    template.set('__a', '1');
    template.set('__req', '1');
    template.set('dpr', '1');
  }

  const probeSingle = async (docId, variables, friendly) => {
    await sleep(DELAY_MS);
    probeCount++;
    const body = new URLSearchParams(template);
    body.set('doc_id', docId);
    body.set('variables', JSON.stringify(variables));
    body.set('fb_api_req_friendly_name', friendly);
    body.set('fb_dtsg', tokens.dtsg || '');
    if (tokens.lsd) body.set('lsd', tokens.lsd);
    if (tokens.jazoest) body.set('jazoest', tokens.jazoest);
    body.set('__comet_req', '1');
    const res = await page.evaluate(async (b) => {
      const r = await fetch('/api/graphql/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: b });
      return { status: r.status, text: await r.text() };
    }, body.toString());
    const parsed = parseResp(res.text);
    return { status: res.status, parsed, errors: parsed?.errors || parsed?.error || null, raw: redact(res.text).slice(0, 200) };
  };

  // ===== left-rail pagination (find ALL collections incl Game + Ăn cả thế giới) =====
  console.log('\n=== left-rail pagination ===');
  const collections = [];
  let cursor = null;
  for (let p = 0; p < 5; p++) {
    const r = await probeSingle(DOC_LEFT_RAIL, { contributorRoles: [], count: 10, cursor, scale: 1 }, 'CometSaveLeftRailPaginationQuery');
    if (r.errors || !r.parsed?.data) { console.log('left-rail page', p + 1, 'FAILED:', JSON.stringify(r.errors || r.parsed).slice(0, 200)); break; }
    const conn = r.parsed.data.viewer.saver_info.saver_content_collections || {};
    for (const e of conn.edges || []) {
      collections.push({ id: e.node?.id, title: e.node?.collection_title, cursor: e.cursor });
    }
    const hasNext = conn.page_info?.has_next_page;
    console.log(`left-rail p${p + 1}: +${(conn.edges || []).length} (total ${collections.length}), has_next=${hasNext}`);
    if (p === 0) save('34_leftrail_page1.json', { data: redact(JSON.stringify(r.parsed)).slice(0, 6000) });
    if (!hasNext) break;
    cursor = conn.page_info?.end_cursor || null;
  }
  const uniq = [];
  const seenIds = new Set();
  for (const c of collections) if (!seenIds.has(c.id)) { seenIds.add(c.id); uniq.push(c); }
  console.log('ALL collections:', uniq.length);
  for (const c of uniq) console.log('  -', c.id, c.title);
  save('34_leftrail_all.json', { collections: uniq, rawCount: collections.length });

  // ===== CollectionItems per collection =====
  console.log('\n=== CollectionItems per collection ===');
  const perCollection = [];
  for (const c of uniq) {
    const r = await probeSingle(DOC_COLLECTION_ITEMS, { collectionID: c.id, count: 10, cursor: null, feedLocation: null, feedbackSource: null, focusCommentID: null, scale: 1, useDefaultActor: null, ...RELAY_PV }, 'CometSaveCollectionAllItemsPaginationQuery');
    if (r.errors || !r.parsed?.data) {
      console.log(`  ${c.id} ${c.title} FAILED:`, JSON.stringify(r.errors || r.parsed).slice(0, 220));
      perCollection.push({ id: c.id, title: c.title, error: true, errors: r.errors || null });
      continue;
    }
    const ci = r.parsed.data.viewer.content_collection?.collection_items || {};
    const items = (ci.edges || []).map((e) => { const n = e.node || {}; const s = n.savable || {}; return { save_id: n.id, video_id: s.id || null, title: s.savable_title?.text || null }; });
    const hasNext = ci.page_info?.has_next_page;
    console.log(`  ${c.id} ${c.title}: ${items.length} items, has_next=${hasNext}`);
    perCollection.push({ id: c.id, title: c.title, count: items.length, has_next: hasNext, items });
  }
  save('35_per_collection_items.json', { collections: uniq, perCollection });
  const sum = perCollection.reduce((a, c) => a + (c.count || 0), 0);
  console.log('sum per-collection:', sum);

  save('99_summary_v6.json', { probeRequests: probeCount, collections: uniq, perCollection, sum });
  console.log('\n=== DONE === probe requests:', probeCount);
  await browser.close();
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });

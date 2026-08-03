#!/usr/bin/env node
// SPIKE PROBE v5 — FINAL. Incremental saves (no data loss on budget exit).
// A: all-saves pagination (saves each page as it goes). A2: left-rail + CollectionItems attempt.
// Captures one natural list_id page (raw HTML) as independent validation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const COOKIE_FILE = path.join(ROOT, '..', 'Facebook-cookies.txt');
const EVIDENCE = path.join(ROOT, 'evidence', 'rerun');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const DOC_ALL_ITEMS = '27174039202273427';
const DOC_LEFT_RAIL = '27602599562734455';
const DOC_COLLECTION_ITEMS = '26605228462486746';

const DELAY_MS = 2500;
const MAX_PROBE_REQUESTS = 22;
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
function itemFromEdge(e) {
  const n = e.node || {};
  const s = n.savable || {};
  return {
    save_id: n.id,
    video_id: s.id || null,
    title: s.savable_title?.text || null,
    permalink: s.savable_permalink || null,
    containing_count: n.containing_lists?.count ?? null,
    containing_lists: (n.containing_lists?.nodes || []).map((x) => ({ id: x.id, name: x.name })),
  };
}

async function main() {
  const cookies = loadCookies(COOKIE_FILE);
  const names = cookies.map((c) => c.name);
  if (cookies.length < 11 || !names.includes('c_user') || !names.includes('xs')) {
    console.log('AUTH_FAILED'); process.exit(2);
  }
  console.log('auth: ok —', cookies.length, 'cookies');

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
    try { template = new URLSearchParams(pd); console.log('template captured'); } catch {}
  });

  await page.goto('https://www.facebook.com/saved', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(5000);
  if (/\/login|\/checkpoint/.test(page.url())) { console.log('AUTH_FAILED'); await browser.close(); process.exit(2); }

  const tokens = await page.evaluate(() => {
    try {
      return { dtsg: require('DTSG').getToken(), lsd: (document.querySelector('input[name="lsd"]') || {}).value || '', jazoest: (document.querySelector('input[name="jazoest"]') || {}).value || '' };
    } catch (e) { return { dtsg: null, lsd: '', jazoest: '', err: e.message }; }
  });
  console.log('tokens:', tokens.dtsg ? 'dtsg OK' : 'dtsg MISSING', tokens.lsd ? '| lsd OK' : '| lsd MISSING', tokens.jazoest ? '| jazoest OK' : '| jazoest MISSING');
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
    if (probeCount > MAX_PROBE_REQUESTS) throw new Error('PROBE_BUDGET_' + probeCount);
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
    return { status: res.status, parsed, errors: parsed?.errors || parsed?.error || null, raw: redact(res.text).slice(0, 150) };
  };

  // ===== Probe A: all-saves pagination (incremental save) =====
  console.log('\n=== Probe A: all-saves pagination ===');
  const allItems = [];
  const seen = new Set();
  let cursor = null;
  const pages = [];
  try {
    for (let p = 0; p < 25; p++) {
      const r = await probeSingle(DOC_ALL_ITEMS, { content_filter: [], count: 10, cursor, scale: 1, use_case: 'SAVE_DEFAULT' }, 'CometSaveDashboardAllItemsPaginationQuery');
      if (r.errors || !r.parsed?.data) { console.log('A page', p + 1, 'FAILED:', JSON.stringify(r.errors || r.parsed).slice(0, 250)); break; }
      const all = r.parsed.data.viewer.saver_info.all_saves || {};
      const edges = all.edges || [];
      const pageItems = edges.map(itemFromEdge);
      let added = 0;
      for (const it of pageItems) if (!seen.has(it.save_id)) { seen.add(it.save_id); allItems.push(it); added++; }
      const hasNext = all.page_info?.has_next_page;
      pages.push({ page: p + 1, count: edges.length, has_next: hasNext, end_cursor: all.page_info?.end_cursor || null, items: pageItems });
      console.log(`A page ${p + 1}: +${edges.length} (+${added} new, total ${allItems.length}), has_next=${hasNext}`);
      save('30_probeA_pages.json', { pages, totalSoFar: allItems.length }); // incremental
      if (!hasNext) break;
      cursor = all.page_info?.end_cursor || null;
    }
  } catch (e) {
    console.log('probe loop stopped:', e.message);
  }
  console.log('Probe A DONE:', allItems.length, 'unique items over', pages.length, 'pages');
  save('30_probeA_all.json', { pages: pages.length, total: allItems.length, items: allItems });

  const uncat = allItems.filter((i) => !(i.containing_count > 0) && (!i.containing_lists || !i.containing_lists.length));
  const perCollFromAll = {};
  for (const i of allItems) for (const cl of i.containing_lists || []) perCollFromAll[cl.name] = (perCollFromAll[cl.name] || 0) + 1;
  console.log('uncategorized:', uncat.length, '| per-collection (containing_lists):', JSON.stringify(perCollFromAll));
  save('31_probeA_analysis.json', { total: allItems.length, uncategorized: uncat.map((i) => ({ save_id: i.save_id, video_id: i.video_id, title: i.title })), perCollectionFromContainingLists: perCollFromAll });

  // ===== Probe A2: collections + per-collection items =====
  console.log('\n=== Probe A2 ===');
  let collections = [];
  try {
    const r2 = await probeSingle(DOC_LEFT_RAIL, { contributorRoles: [], count: 50, cursor: null, scale: 1 }, 'CometSaveLeftRailPaginationQuery');
    if (!r2.errors && r2.parsed?.data) {
      collections = (r2.parsed.data.viewer.saver_info.saver_content_collections?.edges || []).map((e) => ({ id: e.node?.id, title: e.node?.collection_title }));
      console.log('collections:', collections.length);
      for (const c of collections) console.log('  -', c.id, c.title);
      save('32_leftrail.json', { collections });
    } else {
      console.log('A2 collections FAILED:', JSON.stringify(r2.errors).slice(0, 200));
    }
  } catch (e) { console.log('A2 collections skipped:', e.message); }

  // CollectionItems attempt (one collection first, then rest)
  const perCollection = [];
  for (const c of collections) {
    let r;
    try {
      r = await probeSingle(DOC_COLLECTION_ITEMS, { collectionID: c.id, count: 10, cursor: null, feedLocation: null, feedbackSource: null, focusCommentID: null, scale: 1, useDefaultActor: null, ...RELAY_PV }, 'CometSaveCollectionAllItemsPaginationQuery');
    } catch (e) { console.log('A2 budget stop:', e.message); break; }
    if (r.errors || !r.parsed?.data) {
      console.log(`  ${c.id} ${c.title} FAILED:`, JSON.stringify(r.errors || r.parsed).slice(0, 200), '| raw:', r.raw.slice(0, 100));
      perCollection.push({ id: c.id, title: c.title, error: true, errors: r.errors || null });
      continue;
    }
    const ci = r.parsed.data.viewer.content_collection?.collection_items || {};
    const items = (ci.edges || []).map((e) => { const n = e.node || {}; const s = n.savable || {}; return { save_id: n.id, video_id: s.id || null, title: s.savable_title?.text || null }; });
    console.log(`  ${c.id} ${c.title}: ${items.length} items, has_next=${ci.page_info?.has_next_page}`);
    perCollection.push({ id: c.id, title: c.title, count: items.length, has_next: ci.page_info?.has_next_page, items });
  }
  save('32_per_collection.json', { collections, perCollection });
  const sum = perCollection.reduce((a, c) => a + (c.count || 0), 0);
  console.log('sum per-collection:', sum, '| all-saves total:', allItems.length);

  // cross-check
  const allIds = new Set(allItems.map((i) => i.save_id));
  const missing = [];
  for (const c of perCollection) for (const it of c.items || []) if (it.save_id && !allIds.has(it.save_id)) missing.push({ coll: c.title, id: it.save_id });
  console.log('collection items MISSING from all-saves:', missing.length);
  save('33_crosscheck.json', { allSavesTotal: allItems.length, collectionSum: sum, missingFromAll: missing, perCollectionFromContainingLists: perCollFromAll, uncategorized: uncat.length, perCollection });

  // ===== natural list_id page capture for independent validation (not a probe) =====
  try {
    await page.goto('https://www.facebook.com/saved/?list_id=302722351189018', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4000);
    const html = await page.content();
    let red = redact(html);
    fs.writeFileSync(path.join(EVIDENCE, 'listid_302722351189018.html'), red);
    console.log('list_id page saved, size', red.length, '| has collection_items:', red.includes('collection_items'), '| has all_saves:', red.includes('all_saves'));
  } catch (e) { console.log('list_id capture failed:', e.message); }

  save('99_summary_v5.json', {
    probeRequests: probeCount,
    probeA: { total: allItems.length, pages: pages.length, lastHasNext: pages[pages.length - 1]?.has_next ?? null, uncategorized: uncat.length, perCollectionFromContainingLists: perCollFromAll },
    probeA2: { collectionSum: sum, perCollection },
    crosscheckMissing: missing.length,
  });
  console.log('\n=== DONE === probe requests:', probeCount, '/', MAX_PROBE_REQUESTS);
  await browser.close();
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });

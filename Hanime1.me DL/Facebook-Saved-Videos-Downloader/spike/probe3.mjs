#!/usr/bin/env node
// SPIKE PROBE v3 — Task 3 RE-RUN final. Replays the EXACT format captured from live /saved traffic.
// Single endpoint /api/graphql/ with doc_id + variables (form-urlencoded), full param set replicated.
// Writes: spike/evidence/rerun/*.json (cookie values REDACTED). Never modifies Facebook-cookies.txt.
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
const MAX_PROBE_REQUESTS = 12; // budget for MY probes (natural page load not counted)
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
  try { return JSON.parse(cleaned); } catch { return { __raw: cleaned.slice(0, 300) }; }
}

async function main() {
  const cookies = loadCookies(COOKIE_FILE);
  const names = cookies.map((c) => c.name);
  if (cookies.length < 11 || !names.includes('c_user') || !names.includes('xs')) {
    console.log('AUTH_FAILED: cookie file incomplete (', cookies.length, '):', names.join(','));
    process.exit(2);
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

  // capture one natural CometSaveDashboardAllItemsPaginationQuery request as the param TEMPLATE
  let template = null;
  page.on('request', (req) => {
    if (template) return;
    const pd = req.postData() || '';
    if (req.url().includes('/api/graphql') && pd.includes('CometSaveDashboardAllItemsPaginationQuery')) {
      try { template = new URLSearchParams(pd); console.log('template captured from natural traffic'); } catch {}
    }
  });

  await page.goto('https://www.facebook.com/saved', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(6000);
  if (/\/login|\/checkpoint/.test(page.url())) { console.log('AUTH_FAILED redirect to', page.url()); save('AUTH_FAILED.json', { url: page.url() }); await browser.close(); process.exit(2); }
  console.log('page url:', page.url());

  const tokens = await page.evaluate(() => {
    try {
      const dtsg = require('DTSG').getToken();
      const lsd = (document.querySelector('input[name="lsd"]') || {}).value || '';
      const jazoest = (document.querySelector('input[name="jazoest"]') || {}).value || '';
      return { dtsg, lsd, jazoest };
    } catch (e) { return { dtsg: null, lsd: '', jazoest: '', err: e.message }; }
  });
  console.log('tokens: dtsg', tokens.dtsg ? 'OK' : 'MISSING', '| lsd', tokens.lsd ? 'OK' : 'MISSING', '| jazoest', tokens.jazoest ? 'OK' : 'MISSING');

  if (!template) {
    // build from scratch with the params seen in captured traffic
    template = new URLSearchParams();
    template.set('av', cookies.find((c) => c.name === 'c_user')?.value || '0');
    template.set('__user', cookies.find((c) => c.name === 'c_user')?.value || '0');
    template.set('__a', '1');
    template.set('__req', '1');
    template.set('dpr', '1');
    console.log('built template from scratch (no natural saver query captured)');
  }

  // ---------- single-endpoint probe ----------
  const probeSingle = async (docId, variables, friendly) => {
    await sleep(DELAY_MS);
    probeCount++;
    if (probeCount > MAX_PROBE_REQUESTS) { console.log('PROBE BUDGET EXCEEDED'); process.exit(3); }
    const body = new URLSearchParams(template);
    body.set('doc_id', docId);
    body.set('variables', JSON.stringify(variables));
    body.set('fb_api_req_friendly_name', friendly);
    body.set('fb_dtsg', tokens.dtsg || '');
    if (tokens.lsd) body.set('lsd', tokens.lsd);
    if (tokens.jazoest) body.set('jazoest', tokens.jazoest);
    body.set('__comet_req', '1');
    const res = await page.evaluate(async (b) => {
      const r = await fetch('/api/graphql/', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: b,
      });
      return { status: r.status, text: await r.text() };
    }, body.toString());
    const parsed = parseResp(res.text);
    const errors = parsed?.errors || parsed?.error || null;
    return { status: res.status, parsed, errors, raw: redact(res.text).slice(0, 200) };
  };

  // ============ PROBE A: all-saves to END (coverage) ============
  console.log('\n=== Probe A: all-saves pagination to end ===');
  const allItems = [];
  let cursor = null;
  let aPages = 0;
  for (; aPages < 3; aPages++) {
    const r = await probeSingle(DOC_ALL_ITEMS, { content_filter: [], count: 100, cursor, scale: 1, use_case: 'SAVE_DEFAULT' }, 'CometSaveDashboardAllItemsPaginationQuery');
    if (r.errors || !r.parsed?.data) { console.log('A FAILED:', JSON.stringify(r.errors || r.parsed).slice(0, 300)); save('10_probeA_error.json', r); break; }
    const all = r.parsed.data.viewer.saver_info.all_saves || {};
    const edges = all.edges || [];
    for (const e of edges) {
      const n = e.node || {};
      const s = n.savable || {};
      allItems.push({
        save_id: n.id,
        video_id: s.id || null,
        title: s.savable_title?.text || null,
        permalink: s.savable_permalink || null,
        containing_lists: (n.containing_lists?.nodes || []).map((x) => ({ id: x.id, name: x.name })),
        containing_count: n.containing_lists?.count ?? null,
        node_fields: Object.keys(n),
      });
    }
    const hasNext = all.page_info?.has_next_page;
    console.log(`A page ${aPages + 1}: +${edges.length} (total ${allItems.length}), has_next=${hasNext}`);
    if (aPages === 0) save('10a_probeA_page1_raw.json', { variables: { content_filter: [], count: 100, cursor: null, scale: 1, use_case: 'SAVE_DEFAULT' }, parsed: redact(JSON.stringify(r.parsed)) });
    if (!hasNext) { aPages++; break; }
    cursor = all.page_info?.end_cursor || null;
  }
  console.log('Probe A DONE:', allItems.length, 'items over', aPages, 'pages');
  save('10_probeA_all.json', { pages: aPages, total: allItems.length, items: allItems });

  const uncategorized = allItems.filter((i) => !(i.containing_count > 0) && (!i.containing_lists || i.containing_lists.length === 0));
  console.log('uncategorized (no containing list):', uncategorized.length);
  save('10b_probeA_uncategorized.json', { count: uncategorized.length, items: uncategorized });

  // ============ PROBE A2: left-rail collections via GraphQL ============
  console.log('\n=== Probe A2: collections (doc 27602599562734455) ===');
  const r2 = await probeSingle(DOC_LEFT_RAIL, { contributorRoles: [], count: 50, cursor: null, scale: 1 }, 'CometSaveLeftRailPaginationQuery');
  let collections = [];
  if (r2.errors || !r2.parsed?.data) {
    console.log('A2 collections FAILED:', JSON.stringify(r2.errors || r2.parsed).slice(0, 300));
  } else {
    const colls = r2.parsed.data.viewer.saver_info.saver_content_collections || {};
    collections = (colls.edges || []).map((e) => ({ id: e.node?.id, title: e.node?.collection_title, typename: e.node?.__typename }));
    console.log('collections:', collections.length);
    for (const c of collections) console.log('  -', c.id, c.title);
    save('11_probeA2_collections_raw.json', { parsed: redact(JSON.stringify(r2.parsed)) });
  }

  // per-collection items
  console.log('\n=== Probe A2b: per-collection items (doc 26605228462486746) ===');
  const perCollection = [];
  for (const c of collections) {
    const r = await probeSingle(DOC_COLLECTION_ITEMS, { collectionID: c.id, count: 100, cursor: null, feedLocation: null, feedbackSource: null, focusCommentID: null, scale: 1, useDefaultActor: null }, 'CometSaveCollectionAllItemsPaginationQuery');
    if (r.errors || !r.parsed?.data) {
      console.log(`  ${c.id} ${c.title} FAILED:`, JSON.stringify(r.errors || r.parsed).slice(0, 200));
      perCollection.push({ id: c.id, title: c.title, error: true, raw: r.raw });
      continue;
    }
    const items = (r.parsed.data.viewer.content_collection?.collection_items?.edges || []).map((e) => {
      const n = e.node || {};
      const s = n.savable || {};
      return { save_id: n.id, video_id: s.id || null, title: s.savable_title?.text || null };
    });
    const hasNext = r.parsed.data.viewer.content_collection?.collection_items?.page_info?.has_next_page;
    console.log(`  ${c.id} ${c.title}: ${items.length} items, has_next=${hasNext}`);
    perCollection.push({ id: c.id, title: c.title, count: items.length, has_next: hasNext, items });
  }
  save('11_probeA2_per_collection.json', { collections, perCollection });

  const sum = perCollection.reduce((a, c) => a + (c.count || 0), 0);
  console.log('sum per-collection:', sum, '| all-saves total:', allItems.length);

  // cross-check
  const allIds = new Set(allItems.map((i) => i.save_id));
  const missing = [];
  for (const c of perCollection) for (const it of c.items || []) if (it.save_id && !allIds.has(it.save_id)) missing.push({ coll: c.title, id: it.save_id });
  console.log('collection items MISSING from all-saves:', missing.length, JSON.stringify(missing).slice(0, 300));
  save('12_crosscheck.json', { allSavesTotal: allItems.length, collectionSum: sum, missingFromAll: missing });

  // ============ PROBE B: timestamp candidates via raw query (batch endpoint accepts q?) ============
  console.log('\n=== Probe B: timestamp candidates ===');
  const tsHits = [];
  const fieldNames = new Set();
  // scan already-collected data (natural responses + all-saves items)
  const scan = (o, p) => {
    if (o && typeof o === 'object') {
      for (const k of Object.keys(o)) {
        fieldNames.add(k);
        if (/time|date|saved_at|created|updated/i.test(p + '.' + k) && typeof o[k] !== 'object' && o[k] !== null) tsHits.push({ path: p + '.' + k, value: o[k] });
        scan(o[k], p + '.' + k);
      }
    }
  };
  for (const i of allItems) scan(i, 'item');
  for (const c of perCollection) for (const it of c.items || []) scan(it, 'collitem');
  // natural traffic bodies from previous run
  try {
    const traffic = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'full_traffic.json'), 'utf8'));
    for (const t of traffic) if (t.kind === 'res' && t.body) scan(parseResp(t.body), 'natural');
  } catch {}
  // SSR saver blobs
  try {
    const ssr = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'ssr_saver_analysis.json'), 'utf8'));
    scan(ssr, 'ssr');
  } catch {}
  console.log('field scan:', fieldNames.size, 'unique fields | time-ish hits:', tsHits.length);
  console.log('time-ish hits:', JSON.stringify(tsHits.filter((h) => !/server_metadata|request_start|time_at_flush/.test(h.path)).slice(0, 40)));

  // raw-query attempt via batch endpoint: candidate fields on the item node
  const bRes = await probeSingleRaw(page, tokens, template, cookies);
  save('13_probeB_timestamps.json', {
    node_field_candidates: ['saved_time', 'created_time', 'time_created', 'save_date', 'saved_at', 'created_at', 'creation_time', 'save_timestamp'],
    savable_field_candidates: ['creation_time', 'publish_time', 'created_time', 'updated_time', 'timestamp'],
    rawQueryAttempt: bRes,
    fieldScan: { uniqueFields: fieldNames.size, tsHits: tsHits.filter((h) => !/server_metadata|request_start|time_at_flush/.test(h.path)).slice(0, 100) },
  });

  save('99_summary.json', {
    probeRequests: probeCount,
    probeA: { total: allItems.length, pages: aPages, uncategorized: uncategorized.length },
    probeA2: { collectionSum: sum },
    crosscheckMissing: missing.length,
    tsHits: tsHits.length,
    tokensFound: { dtsg: !!tokens.dtsg, lsd: !!tokens.lsd, jazoest: !!tokens.jazoest },
    format: { endpoint: 'POST /api/graphql/', params: ['doc_id', 'variables', 'fb_api_req_friendly_name', 'fb_dtsg', 'lsd', 'jazoest', '__comet_req', ...(template ? [...template.keys()] : [])] },
  });
  console.log('\n=== DONE === probe requests:', probeCount);
  await browser.close();
}

// batch-endpoint raw query attempt (1 request, 3 candidate ops)
async function probeSingleRaw(page, tokens, template, cookies) {
  await sleep(DELAY_MS);
  probeCount++;
  const frag = (f) => `savable{id __typename ${f}}`;
  const ops = [
    { q: `query($count:Int,$cursor:String,$content_filter:Int,$use_case:String){viewer{saver_info{all_saves(first:$count,after:$cursor,content_filter:$content_filter,use_case:$use_case){edges{node{id __typename saved_time created_time time_created save_date}}}}}}` },
    { q: `query($count:Int,$cursor:String,$content_filter:Int,$use_case:String){viewer{saver_info{all_saves(first:$count,after:$cursor,content_filter:$content_filter,use_case:$use_case){edges{node{id __typename savable{id __typename creation_time publish_time created_time}}}}}}` },
    { q: `query($count:Int,$cursor:String,$content_filter:Int,$use_case:String){viewer{saver_info{all_saves(first:$count,after:$cursor,content_filter:$content_filter,use_case:$use_case){edges{node{id __typename story_pointer{id __typename} savable{id}}}}}}` },
  ];
  const body = new URLSearchParams(template);
  body.set('queries', JSON.stringify(ops.map((o) => ({ q: o.q, query_params: { content_filter: [], count: 3, cursor: null, use_case: 'SAVE_DEFAULT' }, query_variables: {} }))));
  body.set('fb_api_req_friendly_name', 'CometSaveDashboardAllItemsPaginationQuery');
  body.set('fb_dtsg', tokens.dtsg || '');
  if (tokens.lsd) body.set('lsd', tokens.lsd);
  if (tokens.jazoest) body.set('jazoest', tokens.jazoest);
  body.delete('doc_id');
  body.delete('variables');
  const res = await page.evaluate(async (b) => {
    const r = await fetch('/api/graphqlbatch/', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: b,
    });
    return { status: r.status, text: await r.text() };
  }, body.toString());
  const parsed = parseBatch(res.text);
  return { status: res.status, parsed, raw: redact(res.text).slice(0, 600) };
}

function parseBatch(text) {
  const cleaned = text.replace(/^for \(;;\);\s*/, '').trim();
  if (!cleaned) return [];
  try { const w = JSON.parse(cleaned); return Array.isArray(w) ? w : [w]; } catch {}
  return cleaned.split(/\r?\n/).filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return { __raw: l.slice(0, 200) }; } });
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });

#!/usr/bin/env node
// SPIKE PROBE v2 — Task 3 RE-RUN (valid cookies). NOT production code.
// Strategy: launch HEADED Playwright with the live cookies, navigate to /saved,
// INTERCEPT the real /api/graphqlbatch/ requests the page makes (ground truth format),
// then replay that exact format via same-origin in-page fetch for the controlled probes.
// Writes: spike/evidence/rerun/*.json (cookie values REDACTED). Never writes to Facebook-cookies.txt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const COOKIE_FILE = path.join(ROOT, '..', 'Facebook-cookies.txt');
const EVIDENCE = path.join(ROOT, 'evidence', 'rerun');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const DOC_ALL_ITEMS = '27174039202273427';        // CometSaveDashboardAllItemsPaginationQuery
const DOC_LEFT_RAIL = '27602599562734455';        // CometSaveLeftRailPaginationQuery
const DOC_COLLECTION_ITEMS = '26605228462486746'; // CometSaveCollectionAllItemsPaginationQuery

const DELAY_MS = 2500;
const MAX_GRAPHQL_REQUESTS = 20; // hard budget, ALL graphql hits (natural + probes) counted
let graphqlHitCount = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- cookies ----------
function loadCookies(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const cookies = [];
  for (const line of lines) {
    if (!line || line.startsWith('#') || line.startsWith('#HttpOnly_')) continue;
    const p = line.split('\t');
    if (p.length < 7) continue;
    const [domain, , cookiePath, secure, , name, value] = p;
    cookies.push({ name, value, domain, path: cookiePath, secure: secure === 'TRUE' });
  }
  return cookies;
}

// ---------- redaction ----------
function redact(s) {
  if (typeof s !== 'string') return s;
  let out = s;
  for (const c of loadCookies(COOKIE_FILE)) {
    if (c.value && c.value.length >= 4) out = out.split(c.value).join('[REDACTED]');
  }
  return out;
}
function save(name, data) {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE, name), JSON.stringify(data, null, 2));
}

// ---------- response parsing (for (;;); prefix + CRLF-separated per-op JSON) ----------
function parseBatchResponse(text) {
  const cleaned = text.replace(/^for \(;;\);\s*/, '').trim();
  if (!cleaned) return [];
  try {
    const whole = JSON.parse(cleaned);
    return Array.isArray(whole) ? whole : [whole];
  } catch { /* fall through to line split */ }
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((l) => {
    try { return JSON.parse(l); } catch { return { __raw: l.slice(0, 400) }; }
  });
}

function walk(o, path2, cb) {
  if (o && typeof o === 'object') {
    for (const k of Object.keys(o)) {
      cb(path2 + '.' + k, o[k]);
      walk(o[k], path2 + '.' + k, cb);
    }
  }
}

// ---------- main ----------
async function main() {
  // Phase 0: auth assert
  const cookies = loadCookies(COOKIE_FILE);
  const names = cookies.map((c) => c.name);
  if (cookies.length < 11 || !names.includes('c_user') || !names.includes('xs')) {
    console.log('AUTH_FAILED: cookie file missing session cookies (have', cookies.length, '):', names.join(','));
    process.exit(2);
  }
  console.log('auth: ok —', cookies.length, 'cookies incl c_user/xs');

  const { chromium } = await import('playwright');
  let browser;
  try { browser = await chromium.launch({ headless: false, channel: 'msedge' }); }
  catch { browser = await chromium.launch({ headless: false }); }

  const context = await browser.newContext({
    userAgent: UA,
    locale: 'vi-VN',
    viewport: { width: 1280, height: 900 },
  });
  await context.addCookies(cookies.map((c) => ({
    name: c.name, value: c.value, domain: '.facebook.com', path: c.path || '/',
    secure: c.secure, httpOnly: false, sameSite: 'Lax',
  })));
  const page = await context.newPage();

  // ---------- capture ALL graphql traffic ----------
  const captured = []; // {seq, url, status, postData, body, probe}
  const register = (kind, data) => {
    graphqlHitCount++;
    if (graphqlHitCount > MAX_GRAPHQL_REQUESTS) console.log('WARN: graphql hit budget exceeded', graphqlHitCount);
    captured.push({ seq: graphqlHitCount, kind, ...data });
  };
  page.on('request', (req) => {
    if (req.url().includes('/api/graphql')) register('req', { url: req.url(), postData: redact(req.postData() || '') });
  });
  let resSeq = 0;
  page.on('response', (res) => {
    if (res.url().includes('/api/graphql')) {
      const rid = 'res' + (++resSeq);
      register('res', { rid, url: res.url(), status: res.status(), body: '' });
      res.text().then((t) => {
        const c = captured.find((x) => x.rid === rid);
        if (c) c.body = redact(t);
      }).catch(() => {});
    }
  });

  // ---------- navigate to /saved ----------
  console.log('navigating to /saved ...');
  await page.goto('https://www.facebook.com/saved', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(8000);

  const pageUrl = page.url();
  if (/\/login|\/checkpoint/.test(pageUrl)) {
    console.log('AUTH_FAILED: redirected to', pageUrl);
    save('AUTH_FAILED.json', { url: pageUrl, graphqlHits: graphqlHitCount });
    await browser.close();
    process.exit(2);
  }
  console.log('page url:', pageUrl);
  await page.waitForTimeout(2000); // let async response bodies land

  // ---------- extract tokens from live page ----------
  const tokens = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const dtsg = (html.match(/"DTSGInitialData":\[\],"token":"([^"]+)"/) || [])[1]
      || (document.querySelector('input[name="fb_dtsg"]') || {}).value || null;
    const lsd = (html.match(/"LSD",\[\],\{"token":"([^"]+)"/) || [])[1]
      || (document.querySelector('input[name="lsd"]') || {}).value || null;
    const jazoest = (document.querySelector('input[name="jazoest"]') || {}).value || null;
    return { dtsg, lsd, jazoest };
  });
  console.log('tokens: dtsg', tokens.dtsg ? 'OK' : 'MISSING', '| lsd', tokens.lsd ? 'OK' : 'MISSING', '| jazoest', tokens.jazoest ? 'OK' : 'MISSING');

  // snapshot natural traffic BEFORE our probes
  const natural = captured.filter((c) => !c.probe).map((c) => ({ seq: c.seq, kind: c.kind, url: c.url, status: c.status, postData: c.postData, body: c.body }));
  save('01_natural_capture.json', { url: pageUrl, tokens, graphqlHits: graphqlHitCount, requests: natural });
  console.log('natural graphql requests captured:', natural.length);

  // ---------- derive format from a real graphqlbatch request ----------
  const batchReq = natural.find((c) => c.kind === 'req' && c.url.includes('graphqlbatch') && c.postData);
  let baseParams = null;      // full URLSearchParams of the real request
  let queriesShape = null;    // parsed queries JSON
  if (batchReq) {
    try {
      baseParams = new URLSearchParams(batchReq.postData);
      const q = baseParams.get('queries');
      if (q) queriesShape = JSON.parse(q);
    } catch (e) { console.log('could not parse natural batch request:', e.message); }
  }
  if (baseParams) {
    console.log('natural batch params:', [...baseParams.keys()].join(', '));
    console.log('natural queries shape:', JSON.stringify(queriesShape).slice(0, 400));
  } else {
    console.log('NO natural graphqlbatch request captured — will construct from scratch');
  }

  // ---------- in-page batch probe ----------
  // ops: [{doc_id?, q?, query_params, query_variables?}] — mirrors captured shape
  const inPageBatch = async (ops, name) => {
    await sleep(DELAY_MS);
    const queries = JSON.stringify(ops.map((o) => ({ doc_id: o.doc_id, q: o.q, query_params: o.query_params, query_variables: o.query_variables || {} })));
    const body = new URLSearchParams();
    body.set('queries', queries);
    body.set('batch_name', name);
    body.set('fb_api_req_friendly_name', name);
    body.set('__a', '1');
    body.set('__user', cookies.find((c) => c.name === 'c_user')?.value || '0');
    body.set('fb_dtsg', tokens.dtsg || '');
    body.set('jazoest', tokens.jazoest || '');
    if (tokens.lsd) body.set('lsd', tokens.lsd);
    // copy any additional params the real page sent (__dyn, __req, __pc, dpr, __beoa, ...)
    if (baseParams) {
      for (const [k, v] of baseParams) {
        if (!body.has(k)) body.set(k, v);
      }
    }
    const res = await page.evaluate(async (b) => {
      const r = await fetch('/api/graphqlbatch/', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: b,
      });
      return { status: r.status, text: await r.text() };
    }, body.toString());
    return res;
  };

  // ============ PROBE 0: format validation (1 request, 2 ops: doc_id + raw q) ============
  console.log('\n=== Probe 0: format validation ===');
  const validateOps = [
    { doc_id: DOC_ALL_ITEMS, query_params: { content_filter: null, count: 3, cursor: null, scale: 1, use_case: 'SAVE_DEFAULT' } },
    { q: `query($count:Int,$cursor:String,$content_filter:Int,$use_case:String){viewer{saver_info{all_saves(first:$count,after:$cursor,content_filter:$content_filter,use_case:$use_case){edges{node{id __typename}}}}}}`,
      query_params: { content_filter: null, count: 3, cursor: null, use_case: 'SAVE_DEFAULT' } },
  ];
  let v0 = await inPageBatch(validateOps, 'CometSaveDashboardAllItemsPaginationQuery');
  let v0Parsed = parseBatchResponse(v0.text);
  save('02_format_validation.json', { status: v0.status, parsed: v0Parsed, rawHead: redact(v0.text.slice(0, 500)) });
  console.log('probe0 status', v0.status, '->', JSON.stringify(v0Parsed).slice(0, 600));

  const docIdWorks = v0Parsed.some((o) => o?.o0?.data || o?.data || o?.['0']?.data);
  const rawQWorks = v0Parsed.some((o) => o?.o1?.data || o?.data || o?.['1']?.data);
  console.log('doc_id op works:', docIdWorks, '| raw q op works:', rawQWorks);
  // determine which response shape maps to which op (o0/o1 or array index)
  const opData = (parsed, idx) => {
    if (!Array.isArray(parsed)) return null;
    return parsed[idx] || null;
  };

  // ============ PROBE B: timestamp fields (1 request, many candidate ops) ============
  console.log('\n=== Probe B: timestamp candidate fields ===');
  const tsNodeCands = ['saved_time', 'created_time', 'time_created', 'save_date', 'saved_at', 'created_at', 'creation_time', 'save_timestamp'];
  const tsSavableCands = ['creation_time', 'publish_time', 'created_time', 'updated_time', 'timestamp'];
  const bOps = [];
  const bMeta = [];
  const addTsOp = (name, field, onSavable) => {
    const frag = onSavable
      ? `savable{id __typename ${field}}`
      : `savable{id __typename} ${field}`;
    bOps.push({
      q: `query($count:Int,$cursor:String,$content_filter:Int,$use_case:String){viewer{saver_info{all_saves(first:$count,after:$cursor,content_filter:$content_filter,use_case:$use_case){edges{node{id __typename ${frag}}}}}}}`,
      query_params: { content_filter: null, count: 3, cursor: null, use_case: 'SAVE_DEFAULT' },
    });
    bMeta.push({ name, field, onSavable });
  };
  for (const f of tsNodeCands) addTsOp('node.' + f, f, false);
  for (const f of tsSavableCands) addTsOp('savable.' + f, f, true);
  let bRes = await inPageBatch(bOps, 'CometSaveDashboardAllItemsPaginationQuery');
  let bParsed = parseBatchResponse(bRes.text);
  const bResults = bParsed.map((p, i) => ({ ...bMeta[i], parsed: p }));
  save('03_probeB_timestamps.json', { status: bRes.status, results: bResults.map((r) => ({ name: r.name, errors: r.parsed?.o0?.errors || r.parsed?.errors || null, hasData: !!(r.parsed?.o0?.data || r.parsed?.data), data: r.parsed?.o0?.data || r.parsed?.data || null })) });
  for (const r of bResults) {
    const err = r.parsed?.o0?.errors || r.parsed?.errors || null;
    const data = r.parsed?.o0?.data || r.parsed?.data || null;
    console.log(`B: ${r.name} ->`, err ? 'ERR: ' + JSON.stringify(err).slice(0, 180) : JSON.stringify(data).slice(0, 300));
  }

  // ============ PROBE A: all-saves coverage ============
  console.log('\n=== Probe A: all-saves pagination ===');
  const allItems = [];
  let cursor = null;
  let pages = 0;
  const MAX_PAGES = 5;
  for (; pages < MAX_PAGES; pages++) {
    const ops = [{ doc_id: DOC_ALL_ITEMS, query_params: { content_filter: null, count: 100, cursor, scale: 1, use_case: 'SAVE_DEFAULT' } }];
    const r = await inPageBatch(ops, 'CometSaveDashboardAllItemsPaginationQuery');
    const parsed = parseBatchResponse(r.text);
    const line = opData(parsed, 0) || {};
    const data = line.o0?.data || line.data || null;
    const errs = line.o0?.errors || line.errors || null;
    if (errs || !data) {
      console.log(`A page ${pages + 1} FAILED:`, JSON.stringify(errs || data).slice(0, 400));
      save('04_probeA_error.json', { page: pages + 1, status: r.status, parsed });
      break;
    }
    const allSaves = data?.viewer?.saver_info?.all_saves || {};
    const edges = allSaves?.edges || [];
    for (const e of edges) {
      const n = e?.node || {};
      const sav = n?.savable || {};
      allItems.push({ save_id: n.id, type: n.__typename, video_id: sav?.id || null, title: sav?.savable_title?.text || null, permalink: sav?.savable_permalink || null });
    }
    const hasNext = allSaves?.page_info?.has_next_page;
    console.log(`A page ${pages + 1}: +${edges.length} items (${allItems.length} total), has_next=${hasNext}`);
    if (pages === 0) save('04a_probeA_page1.json', { query_params: ops[0].query_params, data });
    if (!hasNext) { pages++; break; }
    cursor = allSaves?.page_info?.end_cursor || null;
  }
  console.log('Probe A DONE:', allItems.length, 'items over', pages, 'pages');
  save('04_probeA_all.json', { pages, total: allItems.length, items: allItems });

  // ============ PROBE A2: per-collection counts ============
  console.log('\n=== Probe A2: collections + per-collection items ===');
  const a2Ops = [{ doc_id: DOC_LEFT_RAIL, query_params: { contributorRoles: null, count: 50, cursor: null, scale: 1 } }];
  const r2 = await inPageBatch(a2Ops, 'CometSaveLeftRailPaginationQuery');
  const parsed2 = parseBatchResponse(r2.text);
  const line2 = opData(parsed2, 0) || {};
  const data2 = line2.o0?.data || line2.data || null;
  const errs2 = line2.o0?.errors || line2.errors || null;
  if (errs2 || !data2) {
    console.log('A2 collections FAILED:', JSON.stringify(errs2 || data2).slice(0, 400));
    save('05_probeA2_error.json', { status: r2.status, parsed: parsed2 });
  } else {
    const colls = (data2?.viewer?.saver_info?.saver_content_collections?.edges || []).map((e) => ({ id: e?.node?.id, title: e?.node?.collection_title, typename: e?.node?.__typename }));
    save('05a_probeA2_collections.json', { data: data2 });
    console.log('collections:', colls.length);
    for (const c of colls) console.log('  -', c.id, c.title);

    const perCollection = [];
    for (const c of colls) {
      await sleep(DELAY_MS);
      const ops = [{ doc_id: DOC_COLLECTION_ITEMS, query_params: { collectionID: c.id, count: 100, cursor: null, feedLocation: null, feedbackSource: null, focusCommentID: null, scale: 1, useDefaultActor: null } }];
      const r = await inPageBatch(ops, 'CometSaveCollectionAllItemsPaginationQuery');
      const parsed = parseBatchResponse(r.text);
      const line = opData(parsed, 0) || {};
      const data = line.o0?.data || line.data || null;
      const errs = line.o0?.errors || line.errors || null;
      if (errs || !data) {
        console.log(`  collection ${c.id} (${c.title}) FAILED:`, JSON.stringify(errs || data).slice(0, 300));
        perCollection.push({ id: c.id, title: c.title, error: true, parsed });
        continue;
      }
      const items = (data?.viewer?.content_collection?.collection_items?.edges || []).map((e) => {
        const n = e?.node || {};
        const sav = n?.savable || {};
        return { save_id: n.id, video_id: sav?.id || null, title: sav?.savable_title?.text || null };
      });
      console.log(`  collection ${c.id} (${c.title}): ${items.length} items`);
      perCollection.push({ id: c.id, title: c.title, count: items.length, items });
    }
    save('05_probeA2_collections.json', { collections: colls, perCollection });
    const sum = perCollection.reduce((a, c) => a + (c.count || 0), 0);
    console.log('A2 DONE: sum of per-collection counts =', sum, '| all-saves total =', allItems.length);

    // cross-check: do all-saves IDs cover every collection item?
    const allIds = new Set(allItems.map((i) => i.save_id || i.video_id));
    let missingFromAll = [];
    for (const c of perCollection) {
      for (const it of c.items || []) {
        const id = it.save_id || it.video_id;
        if (id && !allIds.has(id)) missingFromAll.push({ collection: c.title, id });
      }
    }
    console.log('collection items missing from all-saves:', missingFromAll.length, JSON.stringify(missingFromAll).slice(0, 400));
    save('05b_probeA2_crosscheck.json', { allSavesTotal: allItems.length, collectionSum: sum, missingFromAll });
  }

  // ============ evidence: full natural response field scan for time-ish keys ============
  const tsHits = [];
  const allFieldNames = new Set();
  for (const c of natural) {
    if (c.kind !== 'res' || !c.body) continue;
    const parsed = parseBatchResponse(c.body);
    for (const p of parsed) {
      walk(p, '', (pth, v) => {
        allFieldNames.add(pth.split('.').pop());
        if (/time|date|saved_at|created|updated/i.test(pth)) tsHits.push({ path: pth, value: typeof v === 'object' ? JSON.stringify(v).slice(0, 120) : v });
      });
    }
  }
  save('06_natural_field_scan.json', { fieldNames: [...allFieldNames].sort(), tsHits: tsHits.slice(0, 100) });
  console.log('natural field scan:', allFieldNames.size, 'unique fields,', tsHits.length, 'time-ish hits');
  if (tsHits.length) console.log('time-ish hits:', JSON.stringify(tsHits.slice(0, 30)));

  // summary
  save('07_summary.json', {
    graphqlHits: graphqlHitCount,
    budget: MAX_GRAPHQL_REQUESTS,
    probeA: { total: allItems.length, pages },
    probeA2: { sum: null, note: 'see 05b' },
    probeB: bResults.map((r) => ({ name: r.name, ok: !!(r.parsed?.o0?.data || r.parsed?.data), errors: r.parsed?.o0?.errors || r.parsed?.errors || null })),
    tokensFound: { dtsg: !!tokens.dtsg, lsd: !!tokens.lsd, jazoest: !!tokens.jazoest },
  });

  console.log('\n=== DONE === total graphql hits:', graphqlHitCount, '/', MAX_GRAPHQL_REQUESTS);
  await browser.close();
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });

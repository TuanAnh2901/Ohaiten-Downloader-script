#!/usr/bin/env node
// SPIKE PROBE — Facebook Saved GraphQL endpoint probe (NOT production code)
// T3 architecture gate: does all-saves cover old items? does a save-timestamp field exist?
// Usage: node spike/probe.mjs
// Reads: Facebook-cookies.txt (Netscape). Writes: spike/evidence/*.json (redacted).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const COOKIE_FILE = path.join(ROOT, '..', 'Facebook-cookies.txt');
const EVIDENCE_DIR = path.join(ROOT, 'evidence');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const BATCH_API = 'https://www.facebook.com/api/graphqlbatch/';
const SINGLE_API = 'https://www.facebook.com/api/graphql/';
const DOC_ALL_ITEMS = '27174039202273427';   // CometSaveDashboardAllItemsPaginationQuery
const DOC_LEFT_RAIL = '27602599562734455';   // CometSaveLeftRailPaginationQuery
const DELAY_MS = 2000;
const MAX_PAGES = 20;
const MAX_REQUESTS = 20;

let requestCount = 0;
let FB_DTSG = null; // CSRF token, extracted once from homepage HTML
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- fb_dtsg extraction ----------
async function getFbDtsg() {
  if (FB_DTSG) return FB_DTSG;
  const cookies = loadCookies(COOKIE_FILE);
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const res = await fetch('https://www.facebook.com/', {
    headers: { 'user-agent': UA, cookie: cookieHeader },
  });
  const html = await res.text();
  // token in DTSGInitialData / LSD / hidden input
  const m = html.match(/"DTSGInitialData":\[\],"token":"([^"]+)"/)
    || html.match(/name="fb_dtsg" value="([^"]+)"/)
    || html.match(/"LSD",\[\],\{"token":"([^"]+)"/);
  if (m) FB_DTSG = m[1];
  return FB_DTSG;
}

// ---------- cookies ----------
function loadCookies(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const cookies = [];
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const p = line.split('\t');
    if (p.length < 7) continue;
    const [domain, , cookiePath, secure, , name, value] = p;
    cookies.push({ name, value, domain, path: cookiePath, secure: secure === 'TRUE' });
  }
  return cookies;
}

// ---------- request ----------
async function postGraphQLBatch(docId, variables, friendlyName) {
  if (requestCount >= MAX_REQUESTS) throw new Error(`request budget exhausted (${MAX_REQUESTS})`);
  requestCount++;
  const cookies = loadCookies(COOKIE_FILE);
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const dtsg = await getFbDtsg();
  const queries = JSON.stringify({ o0: { doc_id: docId, query_params: variables } });
  const body = new URLSearchParams({
    queries,
    batch_name: friendlyName,
    fb_api_req_friendly_name: friendlyName,
    __a: '1',
    __user: cookies.find((c) => c.name === 'c_user')?.value || '0',
    fb_dtsg: dtsg || '',
    jazoest: '',
  }).toString();
  const res = await fetch(BATCH_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': UA,
      cookie: cookieHeader,
      origin: 'https://www.facebook.com',
      referer: 'https://www.facebook.com/',
    },
    body,
  });
  const text = await res.text();
  // strip for(;;); prefix, split CRLF JSON lines
  const cleaned = text.replace(/^for \(;;\);\s*/, '');
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  const parsed = lines.map((l) => {
    try { return JSON.parse(l); } catch { return { __raw: l.slice(0, 200) }; }
  });
  const entry = parsed[0]?.['o0'] || parsed[0];
  return { status: res.status, entry, raw: text.slice(0, 600), parsed };
}

async function postGraphQLSingle(queryText, variables, friendlyName) {
  if (requestCount >= MAX_REQUESTS) throw new Error(`request budget exhausted (${MAX_REQUESTS})`);
  requestCount++;
  const cookies = loadCookies(COOKIE_FILE);
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const body = new URLSearchParams({
    q: queryText,
    variables: JSON.stringify(variables),
    fb_api_req_friendly_name: friendlyName,
    __a: '1',
    __user: cookies.find((c) => c.name === 'c_user')?.value || '0',
    fb_dtsg: FB_DTSG || '',
    jazoest: '',
  }).toString();
  const res = await fetch(SINGLE_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': UA,
      cookie: cookieHeader,
      origin: 'https://www.facebook.com',
      referer: 'https://www.facebook.com/',
    },
    body,
  });
  const text = await res.text();
  return { status: res.status, text: text.slice(0, 800) };
}

function saveEvidence(name, data) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(path.join(EVIDENCE_DIR, name), JSON.stringify(data, null, 2));
}

// ---------- Probe A: all-saves pagination ----------
async function probeA() {
  console.log('\n=== Probe A: all-saves coverage (doc ' + DOC_ALL_ITEMS + ') ===');
  let cursor = null;
  const items = [];
  let pages = 0;
  for (; pages < MAX_PAGES; pages++) {
    const variables = { count: 10, cursor, scale: 1, use_case: 'SAVE_DEFAULT', content_filter: null };
    const r = await postGraphQLBatch(DOC_ALL_ITEMS, variables, 'CometSaveDashboardAllItemsPaginationQuery');
    if (r.status !== 200) { console.log('HTTP', r.status, r.raw); saveEvidence('A_error.json', r); return null; }
    const err = r.entry?.errors;
    if (err) { console.log('GraphQL errors:', JSON.stringify(err).slice(0, 500)); saveEvidence('A_error.json', r); return null; }
    const data = r.entry?.data?.viewer?.saver_info?.all_saves;
    if (!data) { console.log('Unexpected shape:', r.raw); saveEvidence('A_error.json', r); return null; }
    for (const edge of data.edges || []) {
      const n = edge?.node;
      const sav = n?.savable;
      items.push({
        save_id: n?.id,
        type: n?.__typename,
        savable_id: sav?.id,
        title: sav?.savable_title?.text || null,
        permalink: sav?.savable_permalink || null,
        duration: sav?.playable_duration ?? null,
      });
    }
    if (pages === 0) saveEvidence('A_page0.json', { variables, data });
    const hasNext = data.page_info?.has_next_page;
    console.log(`page ${pages + 1}: +${(data.edges || []).length} items, has_next=${hasNext}`);
    if (!hasNext) break;
    cursor = data.page_info?.end_cursor;
    await sleep(DELAY_MS);
  }
  saveEvidence('A_all.json', { pages: pages + 1, total: items.length, items });
  console.log(`Probe A DONE: ${items.length} items over ${pages + 1} pages`);
  return items;
}

// ---------- Probe A2: collections ----------
async function probeA2() {
  console.log('\n=== Probe A2: collections (doc ' + DOC_LEFT_RAIL + ') ===');
  let cursor = null;
  const collections = [];
  for (let page = 0; page < 5; page++) {
    const variables = { count: 5, cursor, scale: 1 };
    const r = await postGraphQLBatch(DOC_LEFT_RAIL, variables, 'CometSaveLeftRailPaginationQuery');
    if (r.status !== 200) { console.log('HTTP', r.status, r.raw); saveEvidence('A2_error.json', r); return null; }
    const err = r.entry?.errors;
    if (err) { console.log('GraphQL errors:', JSON.stringify(err).slice(0, 500)); saveEvidence('A2_error.json', r); return null; }
    const data = r.entry?.data?.viewer?.saver_info?.saver_content_collections;
    if (!data) { console.log('Unexpected shape:', r.raw); saveEvidence('A2_error.json', r); return null; }
    for (const edge of data.edges || []) {
      const n = edge?.node;
      collections.push({ id: n?.id, title: n?.collection_title, type: n?.__typename });
    }
    if (page === 0) saveEvidence('A2_page0.json', { variables, data });
    const hasNext = data.page_info?.has_next_page;
    console.log(`page ${page + 1}: +${(data.edges || []).length} collections, has_next=${hasNext}`);
    if (!hasNext) break;
    cursor = data.page_info?.end_cursor;
    await sleep(DELAY_MS);
  }
  saveEvidence('A2_all.json', { total: collections.length, collections });
  console.log('Probe A2 DONE:', collections.length, 'collections');
  return collections;
}

// ---------- Probe B: timestamp fields ----------
const TS_FIELDS = ['saved_time', 'created_time', 'time_created', 'save_date'];
const OP_FRAGMENT = `
  viewer {
    saver_info {
      all_saves(first: $count, after: $cursor, content_filter: $content_filter, use_case: $use_case) {
        edges { node {
          id
          __typename
          ... on ContentCollectionItem {
            savable {
              id
              __typename
              savable_title { text }
              ... on Video { playable_duration }
              __FIELD__
            }
          }
        } cursor }
        page_info { has_next_page end_cursor }
      }
    }
  }
`;

async function probeB() {
  console.log('\n=== Probe B: timestamp fields ===');
  const results = {};
  const vars = { count: 3, cursor: null, scale: 1, use_case: 'SAVE_DEFAULT', content_filter: null };
  for (const field of TS_FIELDS) {
    const queryText = `query CometSaveDashboardAllItemsPaginationQuery($count:Int,$cursor:String,$scale:Int,$use_case:String,$content_filter:Int){` +
      OP_FRAGMENT.replace('__FIELD__', field) + `}`;
    const r = await postGraphQLSingle(queryText, vars, 'CometSaveDashboardAllItemsPaginationQuery');
    console.log(`field "${field}": HTTP ${r.status} -> ${r.text.slice(0, 200)}`);
    results[field] = r;
    // stop early if endpoint rejects arbitrary query text (all will fail the same way)
    if (r.status === 200 && (r.text.includes('does not exist') || r.text.includes('Query') && r.text.includes('not'))) {
      console.log('  (arbitrary query text rejected; rest will fail identically)');
      break;
    }
    await sleep(DELAY_MS);
  }
  saveEvidence('B_timestamps.json', results);
  return results;
}

// ---------- Playwright fallback: intercept live GraphQL responses ----------
async function probePlaywright() {
  console.log('\n=== Probe PW: Playwright interception fallback ===');
  try {
    const { chromium } = await import('playwright');
    const cookies = loadCookies(COOKIE_FILE).map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: false,
    }));
    const browser = await chromium.launch({ headless: false, channel: 'msedge' });
    const context = await browser.newContext({ userAgent: UA });
    await context.addCookies(cookies);
    const page = await context.newPage();
    const graphqlResponses = [];
    page.on('response', async (res) => {
      const url = res.url();
      if (url.includes('/api/graphql') || url.includes('graphqlbatch')) {
        const text = await res.text().catch(() => '');
        graphqlResponses.push({ url: url.slice(0, 150), status: res.status(), body: text.slice(0, 3000) });
      }
    });
    await page.goto('https://www.facebook.com/saved', { waitUntil: 'domcontentloaded', timeout: 60000 });
    // scroll to trigger pagination
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1500);
    }
    await sleep(2000);
    // extract fb_dtsg from the live page
    const dtsg = await page.evaluate(() => {
      const m = document.documentElement.innerHTML.match(/"DTSGInitialData":\[\],"token":"([^"]+)"/)
        || document.documentElement.innerHTML.match(/name="fb_dtsg" value="([^"]+)"/);
      return m ? m[1] : null;
    });
    console.log('PW: live fb_dtsg:', dtsg ? dtsg.slice(0, 30) + '...' : 'NOT FOUND');
    // run timestamp probes from INSIDE the page (same-origin fetch, live session)
    const inPageProbe = async (field) => {
      return page.evaluate(async ({ field, docId, queryFragment }) => {
        const queryText = `query CometSaveDashboardAllItemsPaginationQuery($count:Int,$cursor:String,$scale:Int,$use_case:String,$content_filter:Int){` +
          queryFragment.replace('__FIELD__', field) + `}`;
        const dtsgTok = (document.documentElement.innerHTML.match(/"DTSGInitialData":\[\],"token":"([^"]+)"/) || [])[1];
        const body = new URLSearchParams({
          q: queryText,
          variables: JSON.stringify({ count: 3, cursor: null, scale: 1, use_case: 'SAVE_DEFAULT', content_filter: null }),
          fb_api_req_friendly_name: 'CometSaveDashboardAllItemsPaginationQuery',
          __a: '1',
          fb_dtsg: dtsgTok || '',
          jazoest: '',
        });
        const res = await fetch('/api/graphql/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString() });
        return { status: res.status, text: (await res.text()).slice(0, 1200) };
      }, { field, docId: DOC_ALL_ITEMS, queryFragment: OP_FRAGMENT });
    };
    const inPageResults = {};
    for (const field of TS_FIELDS) {
      const r = await inPageProbe(field);
      console.log(`PW in-page field "${field}": HTTP ${r.status} -> ${r.text.slice(0, 300)}`);
      inPageResults[field] = r;
      await sleep(1500);
    }
    // collect field names + look for timestamp-ish keys in response bodies
    const fieldNames = new Set();
    const tsHits = {};
    for (const g of graphqlResponses) {
      let json;
      try {
        const cleaned = g.body.replace(/^for \(;;\);\s*/, '');
        json = JSON.parse(cleaned.split(/\r?\n/)[0]);
      } catch { continue; }
      const walk = (o, path2) => {
        if (o && typeof o === 'object') {
          for (const k of Object.keys(o)) {
            fieldNames.add(k);
            if (/time|date|created|saved|updated/i.test(k)) tsHits[k] = o[k];
            walk(o[k], path2 + '.' + k);
          }
        }
      };
      walk(json, '');
    }
    saveEvidence('PW_fields.json', { responseCount: graphqlResponses.length, fieldNames: [...fieldNames], tsHits });
    saveEvidence('PW_inpage.json', inPageResults);
    console.log('PW: captured', graphqlResponses.length, 'graphql responses');
    console.log('PW: field names seen:', [...fieldNames].join(', '));
    console.log('PW: timestamp-ish hits:', JSON.stringify(tsHits));
    await browser.close();
    return { responseCount: graphqlResponses.length, fieldNames: [...fieldNames], tsHits, inPageResults, dtsgFound: !!dtsg };
  } catch (e) {
    console.log('PW failed:', e.message);
    return null;
  }
}

// ---------- main ----------
async function main() {
  const summary = { docAllItems: DOC_ALL_ITEMS, docLeftRail: DOC_LEFT_RAIL, probes: {} };

  const items = await probeA();
  summary.probes.A = items ? { total: items.length } : { error: true };

  await sleep(DELAY_MS);
  const collections = await probeA2();
  summary.probes.A2 = collections ? { total: collections.length, names: collections.map((c) => c.title) } : { error: true };

  await sleep(DELAY_MS);
  const ts = await probeB();
  summary.probes.B = ts;

  // Playwright fallback only if B was inconclusive (no field appeared)
  const anyFieldAppeared = Object.values(ts || {}).some((r) => r.status === 200 && !/error|not found|does not exist/i.test(r.text));
  if (!anyFieldAppeared && requestCount < MAX_REQUESTS) {
    await sleep(DELAY_MS);
    const pw = await probePlaywright();
    summary.probes.PW = pw ? { responseCount: pw.responseCount, tsHits: pw.tsHits } : null;
  }

  saveEvidence('summary.json', summary);
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log('evidence saved to', EVIDENCE_DIR);
  console.log('total requests:', requestCount);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });

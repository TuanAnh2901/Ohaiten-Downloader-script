#!/usr/bin/env node
// Extract Relay-prefetched JSON blobs from the /saved SSR HTML and analyze saver structure
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(ROOT, 'evidence', 'rerun', 'saved_ssr_raw.html'), 'utf8');

// find "result":{"data": ... and brace-balance to extract JSON
function extractBlobs(html) {
  const blobs = [];
  const needle = '"result":{"data":';
  let idx = 0;
  while ((idx = html.indexOf(needle, idx)) >= 0) {
    const start = html.lastIndexOf('{', idx);
    // walk from start, balance braces accounting for strings
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
      } else {
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { blobs.push(html.slice(start, i + 1)); break; } }
      }
    }
    idx += needle.length;
  }
  return blobs;
}

const blobs = extractBlobs(html);
console.log('blobs found:', blobs.length);
const parsed = [];
for (const b of blobs) { try { parsed.push(JSON.parse(b)); } catch (e) { console.log('parse fail:', e.message.slice(0, 80)); } }

const out = { blobs: parsed.map((p) => ({
  keys: Object.keys((p.result?.data) || {}),
  viewerKeys: Object.keys(p.result?.data?.viewer || {}),
})) };
fs.writeFileSync(path.join(ROOT, 'evidence', 'rerun', 'ssr_blobs_index.json'), JSON.stringify(out, null, 2));

// find the saver_info blob (there can be two: collections left-rail + all-saves dashboard)
const savers = parsed.filter((p) => p.result?.data?.viewer?.saver_info);
const saver = savers.find((p) => p.result.data.viewer.saver_info.all_saves) || savers[0];
if (!saver) { console.log('NO saver_info blob'); process.exit(1); }
const si = saver.result.data.viewer.saver_info;
console.log('saver_info keys:', Object.keys(si));

// all_saves
const allSaves = si.all_saves;
console.log('\nall_saves edges:', allSaves?.edges?.length, '| page_info:', JSON.stringify(allSaves?.page_info));
const allItems = (allSaves?.edges || []).map((e) => {
  const n = e.node || {};
  const s = n.savable || {};
  return { save_id: n.id, typename: s.__typename, video_id: s.id || null, title: s.savable_title?.text || null, permalink: s.savable_permalink || null };
});
console.log('all-saves item ids:', allItems.map((i) => i.save_id).join(', '));
console.log('all-saves video ids:', allItems.map((i) => i.video_id).join(', '));

// collections
const colls = (si.saver_content_collections?.edges || []).map((e) => ({ id: e.node?.id, title: e.node?.collection_title, typename: e.node?.__typename }));
console.log('\ncollections:', colls.length);
for (const c of colls) console.log('  -', c.id, c.title);

// walk entire saver_info for time-ish fields
const tsHits = [];
const walk = (o, p) => {
  if (o && typeof o === 'object') {
    for (const k of Object.keys(o)) {
      if (/time|date|saved|created|updated/i.test(k) && typeof o[k] !== 'object') tsHits.push({ path: p + '.' + k, value: o[k] });
      walk(o[k], p + '.' + k);
    }
  }
};
walk(si, 'saver_info');
console.log('\ntime-ish scalar fields in saver_info:', JSON.stringify(tsHits, null, 2));

// full node dump of first item (all fields)
const firstEdge = allSaves?.edges?.[0];
console.log('\nfirst item full node:', JSON.stringify(firstEdge, null, 2).slice(0, 3000));

// any 'saved' related keys anywhere in saver blob
const allKeys = new Set();
walk(si, '');
for (const k of allKeys) {}
// collect all keys
const keys = [];
const walkK = (o, p) => { if (o && typeof o === 'object') { for (const k of Object.keys(o)) { keys.push(p + '.' + k); walkK(o[k], p + '.' + k); } } };
walkK(si, 'saver_info');
console.log('\ntotal keys:', keys.length);

fs.writeFileSync(path.join(ROOT, 'evidence', 'rerun', 'ssr_saver_analysis.json'), {
  allSaves: { total: allItems.length, items: allItems, page_info: allSaves?.page_info },
  collections: colls,
  tsHits,
  firstItemFullNode: firstEdge,
}, null, 2);

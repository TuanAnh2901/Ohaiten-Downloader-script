#!/usr/bin/env node
// Offline: extract Ahihi collection_items edges from listid SSR bbox blobs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE = path.join(ROOT, 'evidence', 'rerun');
const html = fs.readFileSync(path.join(EVIDENCE, 'listid_302722351189018.html'), 'utf8');

// every application/json script tag
const scriptRe = /<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
let m;
let found = 0;
const allEdges = [];
const allBlobs = [];

while ((m = scriptRe.exec(html))) {
  const body = m[1];
  if (!body.includes('collection_items')) continue;
  found++;
  let root;
  try { root = JSON.parse(body); } catch (e) { console.log('script', found, 'parse fail:', e.message.slice(0, 80)); continue; }
  const blobs = [];
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (o.__bbox && typeof o.__bbox === 'object') blobs.push(o.__bbox);
    if (Array.isArray(o)) { o.forEach(walk); return; }
    for (const k of Object.keys(o)) walk(o[k]);
  };
  walk(root);
  for (const b of blobs) {
    const data = b.result?.data;
    if (!data || typeof data !== 'object') continue;
    const ci = data.content_collection?.collection_items || data.viewer?.content_collection?.collection_items;
    if (!ci || !ci.edges) continue;
    const id = data.content_collection?.id || data.viewer?.content_collection?.id || null;
    const name = data.content_collection?.name || data.content_collection?.collection_title || null;
    for (const e of ci.edges || []) {
      const n = e.node || {};
      const s = n.savable || {};
      allEdges.push({
        save_id: n.id,
        node_type: n.__typename,
        is_content_collection_item: n.__isContentCollectionItem,
        video_id: s.id || null,
        savable_type: s.__typename || null,
        title: s.savable_title?.text || null,
        permalink: s.savable_permalink || null,
        default_category: s.savable_default_category || null,
        attributes: (s.savable_attributes || []).map((a) => a.text),
        duration: s.playable_duration ?? null,
        containing_lists: (n.containing_lists?.nodes || []).map((l) => ({ id: l.id, name: l.name })),
        story_pointer_type: n.story_pointer?.__typename || null,
      });
    }
    allBlobs.push({ bbox_type: b.bbox_type || null, collection_id: id, collection_name: name, edge_count: (ci.edges || []).length, page_info: ci.page_info || null });
  }
}
console.log('scripts with collection_items:', found);
console.log('blobs:', allBlobs.length);
for (const b of allBlobs) console.log('  blob: coll', b.collection_id, JSON.stringify(b.collection_name), 'edges', b.edge_count, 'has_next', b.page_info?.has_next_page, 'total', b.page_info?.count || b.page_info?.total_count || null);
console.log('total edges:', allEdges.length);
const uniq = [];
const seen = new Set();
for (const e of allEdges) if (!seen.has(e.save_id)) { seen.add(e.save_id); uniq.push(e); }
console.log('unique:', uniq.length);
for (const u of uniq) console.log(' -', u.save_id, u.video_id, (u.title || '').slice(0, 50), '| lists:', (u.containing_lists || []).map((l) => l.name).join(',') || 'NONE');
fs.writeFileSync(path.join(EVIDENCE, '36_ahihi_listid_items.json'), JSON.stringify({ blobs: allBlobs, raw: allEdges.length, unique: uniq }, null, 2));
console.log('saved 36_ahihi_listid_items.json');

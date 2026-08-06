/**
 * Saved-item enumeration.
 *
 * Iterates the ALL-saves GraphQL stream (doc 27174039202273427 — covers 100%
 * of saves incl. uncategorized, per spike T3) via src/graphql.ts
 * paginateAllSaves, parses each relay node into a typed SavedItem, and
 * defensively drops non-video nodes (PHOTO/LINK) whose permalink carries no
 * video id. FB's server-side content_filter:[] already returns only
 * videos+reels; the permalink check is belt-and-braces.
 */

import type { Page } from 'playwright';
import { paginateAllSaves, paginateCollectionItems, type PaginateOpts } from './graphql.js';

export interface SavedItem {
  /** Numeric video id (savable.id, digits only). */
  videoId: string;
  title: string;
  /** Absolute permalink (rebuilds https://www.facebook.com + path if relative). */
  permalink: string;
  /** Collection (list) ids this item belongs to; empty = uncategorized. */
  collectionIds: string[];
  /** Save id (node.id) — dedupe across pages. */
  saveId?: string;
}

const WATCH_RE = /\/watch\/?\??.*[?&]v=(\d+)/;
const REEL_RE = /\/reel\/(\d+)/;
const BARE_V_RE = /v=(\d+)/;

/** Extract the numeric video id from a permalink, or null if not a video URL. */
export function extractVideoId(permalink: string): string | null {
  const watch = permalink.match(WATCH_RE);
  if (watch) return watch[1];
  const reel = permalink.match(REEL_RE);
  if (reel) return reel[1];
  const bare = permalink.match(BARE_V_RE);
  return bare ? bare[1] : null;
}

interface ItemNode {
  id?: unknown;
  savable?: {
    id?: unknown;
    savable_title?: { text?: unknown };
    savable_permalink?: unknown;
  };
  containing_lists?: { nodes?: Array<{ id?: unknown }> };
}

/**
 * Parse one all-saves relay node into a SavedItem. Returns null for
 * non-video nodes (permali without a watch/reel video id) or malformed nodes.
 */
export function parseItemNode(node: unknown): SavedItem | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as ItemNode;
  const savable = n.savable;
  const rawPermalink = savable?.savable_permalink;
  if (!savable || typeof rawPermalink !== 'string' || rawPermalink === '') return null;

  // Defensive filter: the permalink MUST carry a video id. Do not rely on
  // savable_default_category alone (reels may report differently).
  const permalinkId = extractVideoId(rawPermalink);
  if (!permalinkId) return null;

  const permalink = rawPermalink.startsWith('/')
    ? `https://www.facebook.com${rawPermalink}`
    : rawPermalink;

  // videoId: savable.id with any non-digit prefix stripped; fall back to the
  // permalink-extracted id when savable.id is absent.
  const savableId =
    typeof savable.id === 'string' ? savable.id.replace(/\D+/g, '') : '';
  const videoId = savableId || permalinkId;

  const collectionIds = (n.containing_lists?.nodes ?? [])
    .filter((c): c is { id: string } => typeof c.id === 'string' && c.id !== '')
    .map((c) => c.id);

  const item: SavedItem = {
    videoId,
    title: typeof savable.savable_title?.text === 'string' ? savable.savable_title.text : '',
    permalink,
    collectionIds,
  };
  if (typeof n.id === 'string' && n.id !== '') item.saveId = n.id;
  return item;
}

/**
 * Enumerate ALL saved items: cursor-paginate the all-saves stream and parse
 * every node. Preserves the relay edge order (newest-first per spike).
 */
export async function listAllSaves(
  page: Page,
  opts: PaginateOpts = {},
): Promise<SavedItem[]> {
  const nodes = await paginateAllSaves(page, opts);
  const items: SavedItem[] = [];
  for (const node of nodes) {
    const item = parseItemNode(node);
    if (item) items.push(item);
  }
  return items;
}

/**
 * Enumerate the items of ONE collection (doc 27440094105689641) — the fast
 * path for download-collection, which must NOT walk the whole all-saves
 * stream. The collection doc does not select `containing_lists`, so every
 * parsed item gets collectionIds forced to the queried collection (they are
 * members by definition).
 */
export async function listCollectionItems(
  page: Page,
  collectionId: string,
  opts: PaginateOpts = {},
): Promise<SavedItem[]> {
  const nodes = await paginateCollectionItems(page, collectionId, opts);
  const items: SavedItem[] = [];
  for (const node of nodes) {
    const item = parseItemNode(node);
    if (item) {
      item.collectionIds = [collectionId];
      items.push(item);
    }
  }
  return items;
}

/** Per-collection counts for the confirmation report. Uncategorized items
 * contribute to no key. */
export function countByCollection(items: SavedItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const id of item.collectionIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

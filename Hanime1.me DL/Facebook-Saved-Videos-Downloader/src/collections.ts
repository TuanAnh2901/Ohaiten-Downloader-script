/**
 * Saved-collection enumeration for the Facebook saved-videos CLI.
 *
 * Two sources (spike T3):
 * - `containing_lists` embedded in every all-saves item node → per-collection
 *   counts (pure aggregation, no network).
 * - LeftRail GraphQL doc 27602599562734455 → the authoritative full list
 *   INCLUDING empty collections that never appear in containing_lists.
 *   Response path: data.viewer.saver_info.saver_content_collections.edges.
 *
 * NOTE (spike superseded the plan's DOM fallback): LeftRail GraphQL works and
 * the all-saves single stream is the primary path — the DOM fallback is not
 * built. Add it only if LeftRail ever breaks.
 */

import type { Page } from 'playwright';
import { FbSavedCliError, PAGINATION_LOOP } from './errors.js';
import { collectRelayEdges, queryGraphQL } from './graphql.js';

export const LEFT_RAIL_DOC_ID = '27602599562734455';
export const LEFT_RAIL_FRIENDLY_NAME = 'CometSaveLeftRailPaginationQuery';

export interface CollectionSummary {
  id: string;
  name: string;
  count?: number;
}

export interface ContainingListItem {
  id: string;
  name: string;
}

/** Item shape accepted by the aggregation — containing_lists normalized to an array. */
export type ItemWithCollections = { containingLists?: ContainingListItem[] };

export interface ListCollectionsOpts {
  /** All-saves items used to fill per-collection counts (optional). */
  items?: ItemWithCollections[];
  /** Hard page cap for LeftRail pagination (default 50). */
  maxPages?: number;
  /** Pacing delay between pages (default 500ms — LeftRail is the fast refresh
   *  path; the all-saves walk keeps its own slower 2000ms pacing). */
  delayMs?: number;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Aggregate collection names/ids from items' `containing_lists`. Each
 * collection's count = number of distinct items listing it. Pure function —
 * no network. Result sorted by name (stable output for user confirmation).
 */
export function listCollectionsFromItems(
  items: ItemWithCollections[],
): CollectionSummary[] {
  const byId = new Map<string, CollectionSummary>();
  for (const item of items) {
    for (const cl of item.containingLists ?? []) {
      const existing = byId.get(cl.id);
      if (existing) existing.count = (existing.count ?? 0) + 1;
      else byId.set(cl.id, { id: cl.id, name: cl.name, count: 1 });
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

interface LeftRailPageInfo {
  end_cursor?: string;
  has_next_page?: boolean;
}

/** LeftRail page_info — graphql.ts findPageInfo doesn't know
 *  saver_info.saver_content_collections, so extract it locally. */
function leftRailPageInfo(data: unknown): LeftRailPageInfo {
  const conn = (data as {
    viewer?: { saver_info?: { saver_content_collections?: { page_info?: LeftRailPageInfo } } };
  })?.viewer?.saver_info?.saver_content_collections;
  return conn?.page_info ?? {};
}

/**
 * Full collection list via the LeftRail GraphQL doc (cursor-paginated).
 * LeftRail is the authoritative set (incl. empty collections); counts are
 * merged in from the containing_lists aggregation when `opts.items` is given.
 * LeftRail collection_title wins over the containing_lists name.
 */
export async function listCollections(
  page: Page,
  opts: ListCollectionsOpts = {},
): Promise<CollectionSummary[]> {
  const maxPages = opts.maxPages ?? 50;
  const delayMs = opts.delayMs ?? 500;
  const byId = new Map<string, CollectionSummary>();
  const seenCursors = new Set<string>();
  let cursor: string | null = null;

  for (let n = 0; n < maxPages; n++) {
    const data = await queryGraphQL(page, {
      docId: LEFT_RAIL_DOC_ID,
      variables: { contributorRoles: [], count: 25, cursor, scale: 1 },
      friendlyName: LEFT_RAIL_FRIENDLY_NAME,
    });
    for (const edge of collectRelayEdges(data)) {
      const node = edge.node as { id?: string; collection_title?: string };
      if (node.id) byId.set(node.id, { id: node.id, name: node.collection_title ?? node.id });
    }
    const pageInfo = leftRailPageInfo(data);
    if (!pageInfo.has_next_page) break;
    const next = pageInfo.end_cursor;
    if (!next) break;
    if (seenCursors.has(next)) {
      throw new FbSavedCliError(
        PAGINATION_LOOP,
        `LeftRail end_cursor "${next}" repeated while has_next_page=true — pagination loop`,
      );
    }
    seenCursors.add(next);
    cursor = next;
    if (delayMs > 0) await sleep(delayMs);
  }

  for (const agg of listCollectionsFromItems(opts.items ?? [])) {
    const existing = byId.get(agg.id);
    if (existing) existing.count = agg.count;
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

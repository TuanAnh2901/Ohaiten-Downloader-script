/**
 * Facebook GraphQL client for saved-content iteration.
 *
 * Executes the relay query IN-PAGE via `page.evaluate(fetch)` — raw Node
 * fetch is WAF-blocked (error 1357054). The `page` is the authenticated one
 * from src/auth.ts. Request format (ground truth from spike T3 live traffic):
 *
 *   POST https://www.facebook.com/api/graphql/   (SINGLE endpoint, NOT graphqlbatch)
 *   Content-Type: application/x-www-form-urlencoded
 *     doc_id + variables(JSON string, content_filter is an ARRAY) +
 *     fb_api_req_friendly_name + fb_dtsg + lsd + jazoest + __comet_req=1
 *
 * Response: data.viewer.saver_info.all_saves.edges[].node with page_info
 * {end_cursor, has_next_page}.
 */

import type { Page } from 'playwright';
import { FbSavedCliError, FETCH_GRAPHQL, PAGINATION_LOOP } from './errors.js';

export const ALL_SAVES_DOC_ID = '27174039202273427';
export const ALL_SAVES_FRIENDLY_NAME = 'CometSaveDashboardAllItemsPaginationQuery';
const GRAPHQL_ENDPOINT = 'https://www.facebook.com/api/graphql/';

export interface GraphQLQueryOpts {
  docId: string;
  variables: Record<string, unknown>;
  friendlyName: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 15000;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Scrape the anti-CSRF tokens the live page exposes: fb_dtsg from
 * require('DTSG').getToken() (spike-proven), lsd/jazoest from hidden inputs.
 * All optional — the spike proved doc_id+variables+fb_dtsg suffice.
 */
async function fetchTokens(
  page: Page,
): Promise<{ fb_dtsg: string; lsd: string; jazoest: string }> {
  return page.evaluate(() => {
    let fb_dtsg = '';
    try {
      fb_dtsg =
        (globalThis as { require?: (m: string) => { getToken: () => string } }).require?.(
          'DTSG',
        )?.getToken() ?? '';
    } catch {
      // require('DTSG') unavailable on non-FB pages (tests) — empty token.
    }
    const input = (name: string): string =>
      document.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value ?? '';
    return { fb_dtsg, lsd: input('lsd'), jazoest: input('jazoest') };
  });
}

interface RawResponse {
  status: number;
  text: string;
}

/** POST one relay query from inside the authenticated page (WAF-safe). */
async function postGraphQL(page: Page, opts: GraphQLQueryOpts): Promise<RawResponse> {
  const { fb_dtsg, lsd, jazoest } = await fetchTokens(page);
  const form = new URLSearchParams();
  form.set('doc_id', opts.docId);
  form.set('variables', JSON.stringify(opts.variables));
  form.set('fb_api_req_friendly_name', opts.friendlyName);
  form.set('fb_dtsg', fb_dtsg);
  form.set('lsd', lsd);
  form.set('jazoest', jazoest);
  form.set('__comet_req', '1');
  return page.evaluate(
    async (arg: { url: string; body: string }): Promise<RawResponse> => {
      const res = await fetch(arg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: arg.body,
      });
      return { status: res.status, text: await res.text() };
    },
    { url: GRAPHQL_ENDPOINT, body: form.toString() },
  );
}

/** FB guards some JSON payloads with a `for (;;);` prefix. */
function stripJsonPrefix(text: string): string {
  return text.replace(/^for\s*\(;;\)\s*/, '');
}

/** Detect an error payload: top-level `error` field or non-empty `errors` array. */
function errorMessage(json: unknown): string | null {
  const j = json as { error?: unknown; errors?: Array<{ message?: string }> };
  if (j && typeof j === 'object' && j.error != null) {
    return `GraphQL error: ${JSON.stringify(j.error).slice(0, 200)}`;
  }
  if (j && Array.isArray(j.errors) && j.errors.length > 0) {
    return `GraphQL errors: ${j.errors.map((e) => e?.message ?? '?').join('; ').slice(0, 200)}`;
  }
  return null;
}

/**
 * POST a single GraphQL query with exponential retry/backoff. Resolves with
 * the parsed `data` field. Throws FbSavedCliError(FETCH_GRAPHQL) once retries
 * are exhausted.
 */
export async function queryGraphQL(
  page: Page,
  opts: GraphQLQueryOpts,
): Promise<unknown> {
  let lastError = 'unknown failure';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS));
    }
    let raw: RawResponse;
    try {
      raw = await postGraphQL(page, opts);
    } catch (err) {
      // In-page fetch rejection (network drop / WAF reset) must retry too,
      // not escape attempt 0 — the retry contract's original blind spot.
      lastError = `transport: ${err instanceof Error ? err.message : String(err)}`;
      continue;
    }
    const { status, text } = raw;
    if (status >= 400) {
      lastError = `HTTP ${status}`;
      continue;
    }
    let json: unknown;
    try {
      json = JSON.parse(stripJsonPrefix(text));
    } catch {
      lastError = `non-JSON body (${text.slice(0, 80)})`;
      continue;
    }
    const err = errorMessage(json);
    if (err) {
      lastError = err;
      continue;
    }
    return (json as { data: unknown }).data;
  }
  throw new FbSavedCliError(
    FETCH_GRAPHQL,
    `GraphQL request failed after ${MAX_RETRIES + 1} attempts: ${lastError}`,
  );
}

export interface RelayEdge {
  cursor: string;
  node: Record<string, unknown>;
}

/**
 * Tolerant relay-edge extraction: tries the known all-saves/collections
 * shapes first, then walks viewer.* for the first object holding an `edges`
 * array. Returns `{cursor, node}[]`.
 */
export function collectRelayEdges(data: unknown): RelayEdge[] {
  const d = data as {
    viewer?: Record<string, unknown>;
  };
  const viewer = d?.viewer;
  if (!viewer || typeof viewer !== 'object') return [];

  const knownPaths = [
    (viewer.saver_info as { all_saves?: unknown } | undefined)?.all_saves,
    viewer.saver_content_collections,
    (viewer.content_collection as { collection_items?: unknown } | undefined)
      ?.collection_items,
  ];

  const hasEdges = (o: unknown): o is { edges: unknown } =>
    !!o && typeof o === 'object' && Array.isArray((o as { edges?: unknown }).edges);

  let container: unknown;
  for (const known of knownPaths) {
    if (hasEdges(known)) {
      container = known;
      break;
    }
  }
  if (!container) {
    for (const value of Object.values(viewer)) {
      if (!value || typeof value !== 'object') continue;
      if (hasEdges(value)) {
        container = value;
        break;
      }
      for (const nested of Object.values(value as Record<string, unknown>)) {
        if (hasEdges(nested)) {
          container = nested;
          break;
        }
      }
      if (container) break;
    }
  }
  if (!hasEdges(container)) return [];

  return (container.edges as Array<{ cursor?: string; node?: unknown }>)
    .filter((e) => e && e.node && typeof e.node === 'object')
    .map((e) => ({
      cursor: e.cursor ?? '',
      node: e.node as Record<string, unknown>,
    }));
}

interface PageInfo {
  end_cursor?: string;
  has_next_page?: boolean;
}

/** Find page_info next to whatever edges container was located. */
function findPageInfo(data: unknown): PageInfo {
  const d = data as {
    viewer?: {
      saver_info?: { all_saves?: { page_info?: PageInfo } };
      saver_content_collections?: { page_info?: PageInfo };
      content_collection?: { collection_items?: { page_info?: PageInfo } };
    };
  };
  const viewer = d?.viewer;
  const candidate =
    viewer?.saver_info?.all_saves?.page_info ??
    viewer?.saver_content_collections?.page_info ??
    viewer?.content_collection?.collection_items?.page_info ??
    {};
  return candidate ?? {};
}

export interface PaginateOpts {
  /** Hard page cap (default 200). */
  maxPages?: number;
  /** Pacing delay between pages (default 2000ms). */
  delayMs?: number;
  /** Called with each page's nodes as they arrive. */
  onPage?: (items: unknown[]) => void;
}

/**
 * Cursor-paginate ALL saved items (doc 27174039202273427 — covers 100% of
 * saves incl. uncategorized, per spike T3). Sequential + delay; never
 * parallel. Loop protection: a repeated end_cursor with has_next_page throws
 * PAGINATION_LOOP.
 */
export async function paginateAllSaves(
  page: Page,
  opts: PaginateOpts = {},
): Promise<unknown[]> {
  const maxPages = opts.maxPages ?? 200;
  const delayMs = opts.delayMs ?? 2000;
  const seenCursors = new Set<string>();
  const all: unknown[] = [];
  let cursor: string | null = null;

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    const data = await queryGraphQL(page, {
      docId: ALL_SAVES_DOC_ID,
      variables: {
        content_filter: [],
        count: 10,
        cursor,
        scale: 1,
        use_case: 'SAVE_DEFAULT',
      },
      friendlyName: ALL_SAVES_FRIENDLY_NAME,
    });
    const items = collectRelayEdges(data).map((e) => e.node);
    all.push(...items);
    opts.onPage?.(items);

    const pageInfo = findPageInfo(data);
    if (!pageInfo.has_next_page) break;
    const nextCursor = pageInfo.end_cursor;
    if (!nextCursor) break;
    if (seenCursors.has(nextCursor)) {
      throw new FbSavedCliError(
        PAGINATION_LOOP,
        `end_cursor "${nextCursor}" repeated while has_next_page=true — pagination loop`,
      );
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
    if (delayMs > 0 && pageNum < maxPages - 1) {
      await sleep(delayMs);
    }
  }
  // ponytail: cap exceeded → return collected pages, don't throw (partial
  // results beat none); caller can pass a higher maxPages.
  return all;
}

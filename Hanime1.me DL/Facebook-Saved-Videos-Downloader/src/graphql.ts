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
 *
 * Per-collection items: doc 26605228462486746
 * (CometSaveCollectionAllItemsPaginationQuery) — verified live: the /saved UI
 * issues the ROOT doc (27440094105689641) for page 1, then THIS doc for every
 * scroll page (captured via Playwright scroll-through). Cursor pagination
 * WORKS when the exact UI variables are sent: count:10 + feedLocation +
 * feedbackSource + focusCommentID + the __relay_internal__pv__* provider vars.
 * Omitting feedLocation/feedbackSource makes the server ignore the cursor and
 * return page 1 forever. Response is root-level
 * data.content_collection.collection_items.edges[].node with page_info under
 * the same collection_items object (NOT under viewer).
 */

import type { Page } from 'playwright';
import { FbSavedCliError, FETCH_GRAPHQL, PAGINATION_LOOP } from './errors.js';

export const ALL_SAVES_DOC_ID = '27174039202273427';
export const ALL_SAVES_FRIENDLY_NAME = 'CometSaveDashboardAllItemsPaginationQuery';
export const COLLECTION_ITEMS_DOC_ID = '26605228462486746';
export const COLLECTION_ITEMS_FRIENDLY_NAME = 'CometSaveCollectionAllItemsPaginationQuery';
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

/**
 * Edge/page_info extraction for the per-collection doc (27440094105689641).
 * Its response is ROOT-level data.content_collection.collection_items — NOT
 * under viewer — so the viewer-scoped collectRelayEdges/findPageInfo would
 * miss it entirely.
 */
function collectionItemsConn(data: unknown): {
  edges?: Array<{ cursor?: string; node?: unknown }>;
  page_info?: PageInfo;
} | null {
  return (data as {
    content_collection?: { collection_items?: { edges?: Array<{ cursor?: string; node?: unknown }>; page_info?: PageInfo } };
  })?.content_collection?.collection_items ?? null;
}

export interface PaginateOpts {
  /** Hard page cap (default 200). */
  maxPages?: number;
  /** Pacing delay between pages (default 750ms). */
  delayMs?: number;
  /** Called with each page's nodes as they arrive. */
  onPage?: (items: unknown[]) => void;
}

/**
 * Shared relay cursor-paginator. Sequential + delay; never parallel. Loop
 * protection: a repeated end_cursor with has_next_page throws PAGINATION_LOOP.
 */
async function paginateRelay(
  page: Page,
  opts: PaginateOpts,
  query: (
    cursor: string | null,
  ) => Promise<{ nodes: unknown[]; pageInfo: PageInfo }>,
): Promise<unknown[]> {
  const maxPages = opts.maxPages ?? 200;
  const delayMs = opts.delayMs ?? 750;
  const seenCursors = new Set<string>();
  const all: unknown[] = [];
  let cursor: string | null = null;

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    const { nodes, pageInfo } = await query(cursor);
    all.push(...nodes);
    opts.onPage?.(nodes);

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

/**
 * Cursor-paginate ALL saved items (doc 27174039202273427 — covers 100% of
 * saves incl. uncategorized, per spike T3).
 */
export async function paginateAllSaves(
  page: Page,
  opts: PaginateOpts = {},
): Promise<unknown[]> {
  return paginateRelay(page, opts, async (cursor) => {
    const data = await queryGraphQL(page, {
      docId: ALL_SAVES_DOC_ID,
      variables: {
        content_filter: [],
        count: 25,
        cursor,
        scale: 1,
        use_case: 'SAVE_DEFAULT',
      },
      friendlyName: ALL_SAVES_FRIENDLY_NAME,
    });
    return {
      nodes: collectRelayEdges(data).map((e) => e.node),
      pageInfo: findPageInfo(data),
    };
  });
}

/**
 * Cursor-paginate ONE collection's items (doc 27440094105689641,
 * CometSaveCollectionAllItemsPaginationQuery — the live UI's scroll doc) —
 * the fast path for download-collection. Cursor pagination works ONLY with
 * the exact UI variables (feedLocation/feedbackSource required — without them
 * the server ignores the cursor and repeats page 1). Root response:
 * data.content_collection.collection_items.edges/page_info.
 */
export async function paginateCollectionItems(
  page: Page,
  collectionId: string,
  opts: PaginateOpts = {},
): Promise<unknown[]> {
  return paginateRelay(page, opts, async (cursor) => {
    const data = await queryGraphQL(page, {
      docId: COLLECTION_ITEMS_DOC_ID,
      variables: {
        collectionID: collectionId,
        // UI uses count:10 per scroll page; larger counts still return 10.
        count: 10,
        cursor,
        scale: 1,
        // Exact variables the live /saved UI sends when scrolling a
        // collection (captured via Playwright): feedLocation/feedbackSource
        // make the server honor the cursor; the __relay_internal__pv__*
        // provider vars are REQUIRED (missing -> missing_required_variable_value).
        // Values are stable flags/enums.
        feedbackSource: 58,
        feedLocation: 'SAVED_DASHBOARD',
        focusCommentID: null,
        useDefaultActor: false,
        __relay_internal__pv__CometUFICommentAutoTranslationTyperelayprovider: 'ORIGINAL',
        __relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider: false,
        __relay_internal__pv__CometUFICommentActionLinksRewriteEnabledrelayprovider: true,
        __relay_internal__pv__IsWorkUserrelayprovider: false,
        __relay_internal__pv__CometUFIReactionsEnableShortNamerelayprovider: false,
        __relay_internal__pv__CometUFISingleLineUFIrelayprovider: true,
        __relay_internal__pv__CometUFIShareActionMigrationrelayprovider: true,
        __relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider: true,
      },
      friendlyName: COLLECTION_ITEMS_FRIENDLY_NAME,
    });
    const conn = collectionItemsConn(data);
    const nodes = (conn?.edges ?? [])
      .filter((e) => e && e.node && typeof e.node === 'object')
      .map((e) => e.node);
    return { nodes, pageInfo: conn?.page_info ?? {} };
  });
}

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page, type Route } from 'playwright';
import {
  ALL_SAVES_DOC_ID,
  ALL_SAVES_FRIENDLY_NAME,
  COLLECTION_ITEMS_DOC_ID,
  COLLECTION_ITEMS_FRIENDLY_NAME,
  collectRelayEdges,
  paginateAllSaves,
  paginateCollectionItems,
  queryGraphQL,
} from '../src/graphql.js';
import { PAGINATION_LOOP, FETCH_GRAPHQL, FbSavedCliError } from '../src/errors.js';

const P1 = readFileSync(
  fileURLToPath(new URL('./fixtures/graphql-items-page1.json', import.meta.url)),
  'utf-8',
);
const P2 = readFileSync(
  fileURLToPath(new URL('./fixtures/graphql-items-page2.json', import.meta.url)),
  'utf-8',
);
const CI = readFileSync(
  fileURLToPath(new URL('./fixtures/graphql-collection-items.json', import.meta.url)),
  'utf-8',
);

// Route-mocked only — never hits live Facebook. Page is on the facebook.com
// origin (served by a catch-all route) so the in-page fetch is same-origin.
let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.route('**/*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body></body></html>',
    }),
  );
  await page.goto('https://www.facebook.com/');
}, 30000);

afterEach(async () => {
  await page.unroute('**/api/graphql/**');
});

afterAll(async () => {
  await browser.close();
});

/** Register the GraphQL endpoint mock (takes precedence over the catch-all). */
async function mockGraphQL(
  handler: (route: Route) => void | Promise<void>,
): Promise<void> {
  await page.route('**/api/graphql/**', (route) => handler(route));
}

/** Parse the form-encoded POST body and return the `variables` JSON. */
function postedVariables(postData: string | null): {
  doc_id: string;
  fb_api_req_friendly_name: string;
  __comet_req: string;
  variables: { content_filter: unknown[]; cursor: string | null };
} {
  const params = new URLSearchParams(postData ?? '');
  return {
    doc_id: params.get('doc_id') ?? '',
    fb_api_req_friendly_name: params.get('fb_api_req_friendly_name') ?? '',
    __comet_req: params.get('__comet_req') ?? '',
    variables: JSON.parse(params.get('variables') ?? '{}') as {
      content_filter: unknown[];
      cursor: string | null;
    },
  };
}

describe('paginateAllSaves', () => {
  it('consumes pages in order via cursor', async () => {
    const requests: Array<ReturnType<typeof postedVariables>> = [];
    await mockGraphQL(async (route) => {
      const posted = postedVariables(route.request().postData());
      requests.push(posted);
      const body = posted.variables.cursor ? P2 : P1;
      await route.fulfill({ status: 200, contentType: 'application/json', body });
    });

    const pages: unknown[][] = [];
    const all = await paginateAllSaves(page, {
      delayMs: 0,
      onPage: (items) => pages.push(items),
    });

    // Real request format: single endpoint, form fields, cursor progression.
    expect(requests).toHaveLength(2);
    expect(requests[0].doc_id).toBe(ALL_SAVES_DOC_ID);
    expect(requests[0].fb_api_req_friendly_name).toBe(ALL_SAVES_FRIENDLY_NAME);
    expect(requests[0].__comet_req).toBe('1');
    expect(requests[0].variables.content_filter).toEqual([]);
    expect(requests[0].variables.cursor).toBeNull();
    expect(requests[1].variables.cursor).toBe('c5');

    // Page 1 (5) then page 2 (6 incl. synthetic PHOTO) — order preserved.
    expect(all).toHaveLength(11);
    expect((all[0] as { id: string }).id).toBe('1629146308546609');
    expect((all[10] as { id: string }).id).toBe('999999999999999');
    expect(pages).toHaveLength(2);
    expect((pages[0] as Array<{ id: string }>).map((n) => n.id)).toEqual([
      '1629146308546609',
      '1628520555275851',
      '1627841312010442',
      '1626476658813574',
      '1624263025701604',
    ]);
  }, 30000);

  it('retries with backoff on HTTP 500 then succeeds', async () => {
    let calls = 0;
    await mockGraphQL(async (route) => {
      calls++;
      if (calls === 1) {
        await route.fulfill({ status: 500, contentType: 'text/plain', body: 'boom' });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: P1 });
      }
    });

    const data = await queryGraphQL(page, {
      docId: ALL_SAVES_DOC_ID,
      variables: { content_filter: [], count: 25, cursor: null, scale: 1, use_case: 'SAVE_DEFAULT' },
      friendlyName: ALL_SAVES_FRIENDLY_NAME,
    });

    expect(calls).toBeGreaterThanOrEqual(2);
    expect(collectRelayEdges(data)).toHaveLength(5);
  }, 15000);

  it('retries with backoff on transport failure (route.abort) then throws FETCH_GRAPHQL', async () => {
    let calls = 0;
    await mockGraphQL(async (route) => {
      calls++;
      await route.abort(); // in-page fetch REJECTS — the E2E failure mode
    });

    const err = await queryGraphQL(page, {
      docId: ALL_SAVES_DOC_ID,
      variables: { content_filter: [], count: 25, cursor: null, scale: 1, use_case: 'SAVE_DEFAULT' },
      friendlyName: ALL_SAVES_FRIENDLY_NAME,
    }).catch((e: unknown) => e);

    expect(calls).toBe(4); // MAX_RETRIES + 1
    expect(err).toBeInstanceOf(FbSavedCliError);
    expect((err as { code: string }).code).toBe(FETCH_GRAPHQL);
    expect((err as Error).message).toContain('transport:');
  }, 30000);

  it('throws PAGINATION_LOOP when end_cursor repeats with has_next_page', async () => {
    // Same fixture every time: end_cursor c5 + has_next_page true forever.
    await mockGraphQL(async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: P1 });
    });

    const err = await paginateAllSaves(page, { delayMs: 0 }).catch((e: unknown) => e);
    expect((err as { code: string }).code).toBe(PAGINATION_LOOP);
  }, 30000);

  it('respects maxPages cap', async () => {
    let calls = 0;
    await mockGraphQL(async (route) => {
      calls++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: P1 });
    });

    const all = await paginateAllSaves(page, { maxPages: 1, delayMs: 0 });

    expect(calls).toBe(1);
    expect(all).toHaveLength(5);
  }, 30000);
});

describe('paginateCollectionItems', () => {
  it('queries the collection doc with collectionID and reads the root-level path', async () => {
    const requests: Array<{ doc_id: string; friendly: string; collectionID: string }> = [];
    await mockGraphQL(async (route) => {
      const params = new URLSearchParams(route.request().postData() ?? '');
      const vars = JSON.parse(params.get('variables') ?? '{}') as { collectionID: string };
      requests.push({
        doc_id: params.get('doc_id') ?? '',
        friendly: params.get('fb_api_req_friendly_name') ?? '',
        collectionID: vars.collectionID,
      });
      await route.fulfill({ status: 200, contentType: 'application/json', body: CI });
    });

    const nodes = await paginateCollectionItems(page, '165363141591607', { delayMs: 0 });

    expect(requests).toEqual([
      {
        doc_id: COLLECTION_ITEMS_DOC_ID,
        friendly: COLLECTION_ITEMS_FRIENDLY_NAME,
        collectionID: '165363141591607',
      },
    ]);
    // Root-level data.content_collection.collection_items edges, NOT viewer.
    expect(nodes).toHaveLength(2);
    expect((nodes[0] as { id: string }).id).toBe('1629146308546609');
  }, 30000);

  it('paginates through all pages when the server honors the cursor (verified live)', async () => {
    // Mirror of the live scroll capture: each page returns distinct edges +
    // a distinct end_cursor; the next page sends that cursor and gets the
    // following 10 videos until has_next_page=false.
    const pages = [
      { end: 'cursor-1', hasNext: true, first: '1629146308546609' },
      { end: 'cursor-2', hasNext: true, first: '1700000000000000' },
      { end: null, hasNext: false, first: '1800000000000000' },
    ];
    let call = 0;
    const sentCursors: Array<string | null> = [];
    await mockGraphQL(async (route) => {
      const params = new URLSearchParams(route.request().postData() ?? '');
      const vars = JSON.parse(params.get('variables') ?? '{}') as { cursor: string | null };
      sentCursors.push(vars.cursor);
      const page = pages[Math.min(call, pages.length - 1)];
      call++;
      const ci = JSON.parse(CI) as {
        data: { content_collection: { collection_items: { edges: Array<{ node: { id: string } }>; page_info: { end_cursor: string | null; has_next_page: boolean } } } };
      };
      ci.data.content_collection.collection_items.edges[0].node.id = page.first;
      ci.data.content_collection.collection_items.page_info = { end_cursor: page.end, has_next_page: page.hasNext };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ci) });
    });

    const nodes = await paginateCollectionItems(page, '165363141591607', { delayMs: 0 });

    // Cursor chain: null -> cursor-1 -> cursor-2 (3 pages, distinct content).
    expect(sentCursors).toEqual([null, 'cursor-1', 'cursor-2']);
    expect(nodes).toHaveLength(6); // 2 edges x 3 pages
  }, 30000);

  it('throws PAGINATION_LOOP for collection-items when end_cursor repeats', async () => {
    // Same fixture every time (end_cursor c5-ish + has_next_page true): a
    // repeating cursor is a real bug now that pagination works — must throw.
    const repeating = JSON.parse(CI) as {
      data: { content_collection: { collection_items: { page_info: { end_cursor: string; has_next_page: boolean } } } };
    };
    repeating.data.content_collection.collection_items.page_info = {
      end_cursor: 'same-cursor',
      has_next_page: true,
    };
    await mockGraphQL(async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(repeating) });
    });

    const err = await paginateCollectionItems(page, '165363141591607', { delayMs: 0 }).catch((e: unknown) => e);
    expect((err as { code: string }).code).toBe(PAGINATION_LOOP);
  }, 30000);

  it('throws PAGINATION_LOOP for all-saves on repeated end_cursor (unchanged)', async () => {
    await mockGraphQL(async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: P1 });
    });

    const err = await paginateAllSaves(page, { delayMs: 0 }).catch((e: unknown) => e);
    expect((err as { code: string }).code).toBe(PAGINATION_LOOP);
  }, 30000);
});

describe('collectRelayEdges', () => {
  it('extracts {cursor,node} from the real saver_info.all_saves path', () => {
    const data = JSON.parse(P1).data as unknown;
    const edges = collectRelayEdges(data);
    expect(edges).toHaveLength(5);
    expect(edges[0].cursor).toBe('c1');
    const node = edges[0].node as {
      savable: { savable_title: { text: string } };
    };
    expect(node.savable.savable_title.text).toBe('3 tay to đi tù sẽ như thế nào full vyron');
  });

  it('walks generic viewer.* containers when the known paths are absent', () => {
    const data = {
      viewer: {
        some_container: {
          edges: [{ cursor: 'x', node: { id: '1' } }],
        },
      },
    };
    expect(collectRelayEdges(data)).toEqual([{ cursor: 'x', node: { id: '1' } }]);
  });
});

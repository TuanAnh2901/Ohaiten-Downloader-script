import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page, type Route } from 'playwright';
import {
  ALL_SAVES_DOC_ID,
  ALL_SAVES_FRIENDLY_NAME,
  collectRelayEdges,
  paginateAllSaves,
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
      variables: { content_filter: [], count: 10, cursor: null, scale: 1, use_case: 'SAVE_DEFAULT' },
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
      variables: { content_filter: [], count: 10, cursor: null, scale: 1, use_case: 'SAVE_DEFAULT' },
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

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page, type Route } from 'playwright';
import {
  LEFT_RAIL_DOC_ID,
  LEFT_RAIL_FRIENDLY_NAME,
  listCollections,
  listCollectionsFromItems,
} from '../src/collections.js';

const LR_P1 = readFileSync(
  fileURLToPath(new URL('./fixtures/graphql-collections-page1.json', import.meta.url)),
  'utf-8',
);
const LR_P2 = readFileSync(
  fileURLToPath(new URL('./fixtures/graphql-collections-page2.json', import.meta.url)),
  'utf-8',
);

// Real LeftRail collection names (spike T3, 34_leftrail_all.json).
const REAL_NAMES = [
  'Ahihi',
  'Anime',
  'Download',
  'Khoa học & Công nghệ',
  'Để xem sau',
  'Game',
  'Ăn cả thế giới',
  'TV & Phim ảnh',
  'Trò chơi',
  'Sản phẩm',
];

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

async function mockGraphQL(handler: (route: Route) => void | Promise<void>): Promise<void> {
  await page.route('**/api/graphql/**', (route) => handler(route));
}

interface Posted {
  doc_id: string;
  fb_api_req_friendly_name: string;
  __comet_req: string;
  variables: { contributorRoles: unknown[]; count: number; cursor: string | null; scale: number };
}

function postedVariables(postData: string | null): Posted {
  const params = new URLSearchParams(postData ?? '');
  return {
    doc_id: params.get('doc_id') ?? '',
    fb_api_req_friendly_name: params.get('fb_api_req_friendly_name') ?? '',
    __comet_req: params.get('__comet_req') ?? '',
    variables: JSON.parse(params.get('variables') ?? '{}') as Posted['variables'],
  };
}

describe('listCollectionsFromItems', () => {
  it('aggregates collection counts from items containing_lists (5 collections)', () => {
    const items = [
      { containingLists: [{ id: '165363141591607', name: 'Anime' }] },
      {
        containingLists: [
          { id: '165363141591607', name: 'Anime' },
          { id: '426792272115358', name: 'Download' },
        ],
      },
      { containingLists: [{ id: '205843814210206', name: 'Khoa học & Công nghệ' }] },
      { containingLists: [{ id: '145653533562568', name: 'Để xem sau' }] },
      { containingLists: [{ id: '302722351189018', name: 'Ahihi' }] },
      { containingLists: [] },
      {},
    ];

    const result = listCollectionsFromItems(items);

    expect(result).toHaveLength(5);
    // Sorted by name (locale-aware) — output is stable for user confirmation.
    expect(result.map((c) => c.name)).toEqual(
      result.map((c) => c.name).slice().sort((a, b) => a.localeCompare(b)),
    );
    const byName = Object.fromEntries(result.map((c) => [c.name, c.count]));
    expect(byName).toEqual({
      Anime: 2,
      Download: 1,
      'Khoa học & Công nghệ': 1,
      'Để xem sau': 1,
      Ahihi: 1,
    });
  });

  it('returns [] for no items', () => {
    expect(listCollectionsFromItems([])).toEqual([]);
    expect(listCollectionsFromItems([{}, { containingLists: [] }])).toEqual([]);
  });
});

describe('listCollections', () => {
  it('paginates the LeftRail doc and merges containing_lists counts', async () => {
    const requests: Posted[] = [];
    await mockGraphQL(async (route) => {
      const posted = postedVariables(route.request().postData());
      requests.push(posted);
      const body = posted.variables.cursor ? LR_P2 : LR_P1;
      await route.fulfill({ status: 200, contentType: 'application/json', body });
    });

    const items = [
      { containingLists: [{ id: '302722351189018', name: 'Ahihi ಡ ͜ ʖ ಡ' }] },
      { containingLists: [{ id: '302722351189018', name: 'Ahihi ಡ ͜ ʖ ಡ' }] },
      { containingLists: [{ id: '165363141591607', name: 'Anime' }] },
      { containingLists: [] },
      {},
    ];
    const result = await listCollections(page, { items, delayMs: 0 });

    // Real request format: single endpoint, form fields, cursor progression.
    expect(requests).toHaveLength(2);
    expect(requests[0].doc_id).toBe(LEFT_RAIL_DOC_ID);
    expect(requests[0].fb_api_req_friendly_name).toBe(LEFT_RAIL_FRIENDLY_NAME);
    expect(requests[0].__comet_req).toBe('1');
    expect(requests[0].variables).toMatchObject({
      contributorRoles: [],
      count: 25,
      cursor: null,
      scale: 1,
    });
    expect(requests[1].variables.cursor).toBe('lr-c5');

    // 10 collections — the authoritative LeftRail set incl. the empty ones.
    expect(result).toHaveLength(10);
    expect(new Set(result.map((c) => c.name))).toEqual(new Set(REAL_NAMES));
    // Sorted by name (locale-aware).
    expect(result.map((c) => c.name)).toEqual(
      result.map((c) => c.name).slice().sort((a, b) => a.localeCompare(b)),
    );

    // Counts merged from containing_lists aggregation; LeftRail title wins.
    const ahihi = result.find((c) => c.id === '302722351189018');
    expect(ahihi?.name).toBe('Ahihi'); // LeftRail title beats the kaomoji containing_lists name
    expect(ahihi?.count).toBe(2);
    const anime = result.find((c) => c.id === '165363141591607');
    expect(anime?.count).toBe(1);
    // Empty collections present in LeftRail but absent from containing_lists → no count.
    expect(result.find((c) => c.id === '375610470566872')).toEqual({
      id: '375610470566872',
      name: 'Sản phẩm',
    });
  }, 30000);
});

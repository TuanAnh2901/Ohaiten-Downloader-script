import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page, type Route } from 'playwright';
import {
  countByCollection,
  extractVideoId,
  listAllSaves,
  listCollectionItems,
  parseItemNode,
  type SavedItem,
} from '../src/items.js';

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

describe('extractVideoId', () => {
  it('extracts from /watch/?v= permalinks (absolute + relative)', () => {
    expect(extractVideoId('https://www.facebook.com/watch/?ref=saved&v=1533958624489961')).toBe(
      '1533958624489961',
    );
    expect(extractVideoId('/watch/?ref=saved&v=1080214581010336')).toBe('1080214581010336');
  });

  it('extracts from /reel/{id} permalinks', () => {
    expect(extractVideoId('https://www.facebook.com/reel/1570312221305439/')).toBe(
      '1570312221305439',
    );
    expect(extractVideoId('/reel/1005655615768824')).toBe('1005655615768824');
  });

  it('extracts from bare /watch?v= form', () => {
    expect(extractVideoId('/watch?v=1365128951610696')).toBe('1365128951610696');
  });

  it('returns null for non-video permalinks (photo, link, group)', () => {
    expect(extractVideoId('https://www.facebook.com/photo/?fbid=999999999999999')).toBeNull();
    expect(extractVideoId('https://www.facebook.com/photo.php?fbid=123')).toBeNull();
    expect(extractVideoId('https://example.com/articles/123')).toBeNull();
    expect(extractVideoId('')).toBeNull();
  });
});

describe('parseItemNode', () => {
  it('parses a video node with /watch/ permalink (real shape)', () => {
    const node = {
      id: '1629146308546609',
      __isContentCollectionItem: 'Save',
      savable: {
        __typename: 'Video',
        id: '1533958624489961',
        savable_title: { text: '3 tay to đi tù sẽ như thế nào full vyron' },
        savable_permalink: 'https://www.facebook.com/watch/?ref=saved&v=1533958624489961',
        savable_default_category: 'VIDEO',
        playable_duration: 412,
      },
      containing_lists: { count: 1, nodes: [{ name: 'Anime', id: '165363141591607' }] },
    };
    expect(parseItemNode(node)).toEqual({
      videoId: '1533958624489961',
      title: '3 tay to đi tù sẽ như thế nào full vyron',
      permalink: 'https://www.facebook.com/watch/?ref=saved&v=1533958624489961',
      collectionIds: ['165363141591607'],
      saveId: '1629146308546609',
    });
  });

  it('parses a reel node via /reel/{id} permalink', () => {
    const item = parseItemNode({
      id: '1626476658813574',
      savable: {
        id: '1570312221305439',
        savable_title: { text: '🙏' },
        savable_permalink: 'https://www.facebook.com/reel/1570312221305439/',
      },
      containing_lists: { count: 0, nodes: [] },
    });
    expect(item?.videoId).toBe('1570312221305439');
    expect(item?.permalink).toBe('https://www.facebook.com/reel/1570312221305439/');
  });

  it('rebuilds absolute permalink for relative paths and falls back to permalink videoId', () => {
    const item = parseItemNode({
      savable: {
        savable_title: { text: 'x' },
        savable_permalink: '/watch/?ref=saved&v=1365128951610696',
      },
      containing_lists: { count: 0, nodes: [] },
    });
    expect(item?.permalink).toBe('https://www.facebook.com/watch/?ref=saved&v=1365128951610696');
    expect(item?.videoId).toBe('1365128951610696');
  });

  it('strips non-digit prefixes from savable.id', () => {
    const item = parseItemNode({
      savable: {
        id: 'video:1533958624489961',
        savable_title: { text: 'x' },
        savable_permalink: '/watch/?v=1533958624489961',
      },
    });
    expect(item?.videoId).toBe('1533958624489961');
  });

  it('excludes non-video nodes (PHOTO/LINK permalinks) defensively', () => {
    expect(
      parseItemNode({
        savable: {
          id: '999999999999999',
          savable_title: { text: 'Ảnh' },
          savable_permalink: 'https://www.facebook.com/photo.php?fbid=999999999999999',
          savable_default_category: 'PHOTO',
        },
        containing_lists: { count: 0, nodes: [] },
      }),
    ).toBeNull();
    expect(
      parseItemNode({
        savable: { savable_title: { text: 'link' }, savable_permalink: 'https://example.com/a/1' },
      }),
    ).toBeNull();
  });

  it('returns null when savable or permalink is missing', () => {
    expect(parseItemNode(null)).toBeNull();
    expect(parseItemNode({ id: '123' })).toBeNull();
    expect(parseItemNode({ savable: {} })).toBeNull();
    expect(parseItemNode('string')).toBeNull();
  });

  it('handles uncategorized items (empty containing_lists) → collectionIds []', () => {
    const item = parseItemNode({
      id: '1628520555275851',
      savable: {
        id: '1080214581010336',
        savable_title: { text: 'LiveCam Tay To Mobile Đi Tù' },
        savable_permalink: '/watch/?v=1080214581010336',
      },
      containing_lists: { count: 0, nodes: [] },
    });
    expect(item?.collectionIds).toEqual([]);
  });
});

describe('listAllSaves', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    await page.route('**/*', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body></body></html>' }),
    );
    await page.goto('https://www.facebook.com/');
  }, 30000);

  afterEach(async () => {
    await page.unroute('**/api/graphql/**');
  });

  afterAll(async () => {
    await browser.close();
  });

  it('paginates all saves via route mock, parses + filters, preserves order', async () => {
    let calls = 0;
    await page.route('**/api/graphql/**', (route: Route) => {
      calls++;
      const body = calls === 1 ? P1 : P2;
      void route.fulfill({ status: 200, contentType: 'application/json', body });
    });

    const items = await listAllSaves(page, { delayMs: 0 });

    expect(calls).toBe(2); // 2 pages consumed through the T8 paginator
    // 5 (page1) + 5 (page2) videos; page2's PHOTO node excluded defensively
    expect(items).toHaveLength(10);
    // order preserved (newest-first)
    expect(items.map((i) => i.videoId)).toEqual([
      '1533958624489961',
      '1080214581010336',
      '1564113441753478',
      '1570312221305439',
      '1365128951610696',
      '1036239645584654',
      '2904511416577621',
      '2138608167535448',
      '1616437686111850',
      '2244898599679122',
    ]);
    // no PHOTO node leaked through
    expect(items.some((i) => i.videoId === '999999999999999')).toBe(false);
    // collection tags attached
    expect(items[0].collectionIds).toEqual(['165363141591607']);
    expect(items[2].collectionIds).toEqual(['426792272115358']);
    expect(items[1].collectionIds).toEqual([]); // uncategorized surfaces
  }, 30000);
});

describe('listCollectionItems', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    await page.route('**/*', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body></body></html>' }),
    );
    await page.goto('https://www.facebook.com/');
  }, 30000);

  afterEach(async () => {
    await page.unroute('**/api/graphql/**');
  });

  afterAll(async () => {
    await browser.close();
  });

  it('reads the collection doc (root path) and forces collectionIds to the queried collection', async () => {
    await page.route('**/api/graphql/**', (route: Route) => {
      void route.fulfill({ status: 200, contentType: 'application/json', body: CI });
    });

    const items = await listCollectionItems(page, '165363141591607', { delayMs: 0 });

    expect(items).toHaveLength(2);
    expect(items[0].videoId).toBe('1533958624489961');
    expect(items[0].collectionIds).toEqual(['165363141591607']); // forced — doc has no containing_lists
    expect(items.every((i) => i.collectionIds.length === 1)).toBe(true);
  }, 30000);
});

describe('countByCollection', () => {
  it('counts items per collection id, ignoring uncategorized', () => {
    const items: SavedItem[] = [
      { videoId: '1', title: 'a', permalink: '/watch/?v=1', collectionIds: ['A', 'B'] },
      { videoId: '2', title: 'b', permalink: '/watch/?v=2', collectionIds: ['B'] },
      { videoId: '3', title: 'c', permalink: '/watch/?v=3', collectionIds: [] },
      { videoId: '4', title: 'd', permalink: '/watch/?v=4', collectionIds: ['A'] },
    ];
    const counts = countByCollection(items);
    expect(counts.get('A')).toBe(2);
    expect(counts.get('B')).toBe(2);
    expect(counts.has('C')).toBe(false);
    expect([...counts.entries()]).toEqual([
      ['A', 2],
      ['B', 2],
    ]);
  });
});

// ---------------------------------------------------------------------------
// Orchestrator tests — route-mocked GraphQL (headless chromium, no live
// Facebook), fake yt-dlp spawn (spawnFn DI seam), fake browser launch
// (launchFn DI seam). Verifies the download-all / download-collection flows:
// folder grouping (collection + _uncategorized), dedupe by videoId,
// newest-first queue order, dry-run plan, report file, and the
// listCollectionsService count aggregation.
// ---------------------------------------------------------------------------

import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { chromium, type Browser, type Route } from 'playwright';
import { collectRelayEdges, ALL_SAVES_DOC_ID, COLLECTION_ITEMS_DOC_ID } from '../src/graphql.js';
import { LEFT_RAIL_DOC_ID } from '../src/collections.js';
import { NO_VIDEOS } from '../src/errors.js';
import { parseItemNode, type SavedItem } from '../src/items.js';
import {
  downloadAll,
  downloadCollection,
  listCollectionsService,
  planDownloads,
  type OrchestratorOpts,
} from '../src/orchestrator.js';

// --- fixtures ---------------------------------------------------------------

const P1 = readFileSync(
  fileURLToPath(new URL('./fixtures/graphql-items-page1.json', import.meta.url)),
  'utf-8',
);
const P2 = readFileSync(
  fileURLToPath(new URL('./fixtures/graphql-items-page2.json', import.meta.url)),
  'utf-8',
);
const LR1 = readFileSync(
  fileURLToPath(new URL('./fixtures/graphql-collections-page1.json', import.meta.url)),
  'utf-8',
);
const LR2 = readFileSync(
  fileURLToPath(new URL('./fixtures/graphql-collections-page2.json', import.meta.url)),
  'utf-8',
);
const CI = readFileSync(
  fileURLToPath(new URL('./fixtures/graphql-collection-items.json', import.meta.url)),
  'utf-8',
);
const COOKIES = fileURLToPath(new URL('./fixtures/cookies.txt', import.meta.url));

// 10 video nodes across both items pages (page2's PHOTO node is excluded by
// parseItemNode); order = relay edge order (newest-first per spike T3).
const EXPECTED_ORDER = [
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
];

// Real items parsed from the fixtures (no browser needed).
function fixtureItems(): SavedItem[] {
  const data1 = JSON.parse(P1).data as unknown;
  const data2 = JSON.parse(P2).data as unknown;
  return [...collectRelayEdges(data1), ...collectRelayEdges(data2)]
    .map((e) => parseItemNode(e.node))
    .filter((i): i is SavedItem => i !== null);
}

// Expected per-folder filenames (title sanitized by src/filename.ts).
const F_ANIME = '3 tay to đi tù sẽ như thế nào full vyron.mp4';
const F_DL1 = 'Teaser bài thi giữa kì Mùa 4#ngọa #ngoatattoostudio #tattoos #mentor #ss4.mp4';
const F_DL2 = 'Version Anh da đen cao,to,đen,hôi và Liễu Như Yên.mp4';
const F_UNCAT1 = 'LiveCam Tay To Mobile Đi Tù.mp4';
const F_UNCAT_REEL = 'saved-video-1570312221305439.mp4';

// --- fake yt-dlp spawn (mirrors download.test.ts) --------------------------

class FakeChild extends EventEmitter {
  stdout = new PassThrough();
  stderr = new PassThrough();
  exited = false;
  constructor(
    public cmd: string,
    public args: string[],
  ) {
    super();
  }
  succeed(): void {
    if (this.exited) return;
    this.exited = true;
    this.stdout.write('[download] 100.0% of 10.00MiB at 1.00MiB/s\n');
    this.stdout.end();
    this.stderr.end();
    this.emit('close', 0);
  }
  failWith(stderr: string, code = 1): void {
    if (this.exited) return;
    this.exited = true;
    this.stderr.write(stderr);
    this.stderr.end();
    this.stdout.end();
    this.emit('close', code);
  }
}

function makeFakeSpawn(): {
  spawnFn: ReturnType<typeof vi.fn>;
  procs: FakeChild[];
} {
  const procs: FakeChild[] = [];
  const spawnFn = vi.fn((cmd: string, args: string[]) => {
    const p = new FakeChild(cmd, args);
    procs.push(p);
    return p;
  });
  return { spawnFn, procs };
}

/** Succeed every live proc until `total` spawned and all exited; `fail` marks
 *  procs that should fail instead. Spawn order is nondeterministic, so
 *  matching is per-proc, never positional. */
async function drainPool(
  procs: FakeChild[],
  total: number,
  fail?: (proc: FakeChild) => boolean,
): Promise<void> {
  for (let i = 0; i < 2000; i++) {
    if (procs.length >= total && procs.every((p) => p.exited)) return;
    const live = procs.find((p) => !p.exited);
    if (live) {
      if (fail?.(live)) live.failWith('ERROR: boom\n');
      else live.succeed();
    }
    await new Promise((r) => setTimeout(r, 2));
  }
  throw new Error('pool did not drain');
}

function cookiesArg(proc: FakeChild): string {
  const i = proc.args.indexOf('--cookies');
  if (i < 0) throw new Error('no --cookies in args: ' + proc.args.join(' '));
  return proc.args[i + 1];
}

function outPathArg(proc: FakeChild): string {
  const i = proc.args.indexOf('-o');
  if (i < 0) throw new Error('no -o in args: ' + proc.args.join(' '));
  return proc.args[i + 1];
}

// --- route-mocked browser (launchFn DI seam) --------------------------------

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, 30000);

afterAll(async () => {
  await browser.close();
});

function postedDocId(postData: string | null): string | null {
  return new URLSearchParams(postData ?? '').get('doc_id');
}

function postedCursor(postData: string | null): string | null {
  const vars = JSON.parse(
    new URLSearchParams(postData ?? '').get('variables') ?? '{}',
  ) as { cursor: string | null };
  return vars.cursor;
}

/** Serve the real fixtures: items doc → P1/P2 by cursor, LeftRail → LR1/LR2,
 *  collection-items doc → CI (single page, no cursor). */
function defaultGraphQL(route: Route): void {
  const post = route.request().postData();
  const docId = postedDocId(post);
  const cursor = postedCursor(post);
  let body: string;
  if (docId === ALL_SAVES_DOC_ID) body = cursor ? P2 : P1;
  else if (docId === LEFT_RAIL_DOC_ID) body = cursor ? LR2 : LR1;
  else if (docId === COLLECTION_ITEMS_DOC_ID) body = CI;
  else body = '{"data":{"viewer":{}}}';
  void route.fulfill({ status: 200, contentType: 'application/json', body });
}

/** Launch seam: a headless route-mocked context; records when the
 *  orchestrator closes it. */
function fakeLaunch(handler: (route: Route) => void | Promise<void> = defaultGraphQL): {
  launchFn: ReturnType<typeof vi.fn>;
  closed: boolean[];
} {
  const closed: boolean[] = [];
  const launchFn = vi.fn(async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route('**/*', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body></body></html>' }),
    );
    await page.route('**/api/graphql/**', (route) => handler(route));
    await page.goto('https://www.facebook.com/');
    const origClose = context.close.bind(context);
    context.close = async () => {
      closed.push(true);
      await origClose();
    };
    return { context, page };
  });
  return { launchFn, closed };
}

function baseOpts(dir: string, extra: Partial<OrchestratorOpts> = {}): OrchestratorOpts {
  return {
    cookiesFile: COOKIES,
    outputDir: dir,
    dryRun: false,
    jobs: 3,
    ytDlpPath: 'yt-dlp',
    delayMs: 0,
    ...extra,
  };
}

function readReport(dir: string): {
  summary: { downloaded: number; failed: number; skipped: number };
  failures: Array<{ videoId: string; reason: string }>;
  skipped: Array<{ videoId: string; reason: string }>;
} {
  const reportsDir = join(dir, 'reports');
  const file = readdirSync(reportsDir).find((f) => f.startsWith('report-'));
  if (!file) throw new Error(`no report file in ${reportsDir}`);
  return JSON.parse(readFileSync(join(reportsDir, file), 'utf-8')) as ReturnType<typeof readReport>;
}

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'orch-'));
}

// --- tests ------------------------------------------------------------------

describe('planDownloads', () => {
  it('preserves newest-first order and assigns per-collection / _uncategorized folders', () => {
    const items = fixtureItems();
    const collections = [
      { id: '165363141591607', name: 'Anime' },
      { id: '426792272115358', name: 'Download' },
    ];
    const { downloads, duplicates } = planDownloads(items, collections, '/out');

    expect(duplicates).toEqual([]);
    // Queue order == relay edge order (newest-first), not re-sorted.
    expect(downloads.map((d) => d.videoId)).toEqual(EXPECTED_ORDER);
    expect(downloads[0].outPath).toBe(join('/out', 'Anime', F_ANIME));
    expect(downloads[2].outPath).toBe(join('/out', 'Download', F_DL1));
    expect(downloads[9].outPath).toBe(join('/out', 'Download', F_DL2));
    expect(downloads[1].outPath).toBe(join('/out', '_uncategorized', F_UNCAT1));
    expect(downloads[3].outPath).toBe(join('/out', '_uncategorized', F_UNCAT_REEL));
  });

  it('dedupes by videoId (first wins), resolves multi-collection + filename collisions', () => {
    const items: SavedItem[] = [
      { videoId: '1', title: 'Zeta', permalink: 'https://fb.com/watch/?v=1', collectionIds: [] },
      { videoId: '2', title: 'Alpha', permalink: 'https://fb.com/watch/?v=2', collectionIds: ['165363141591607'] },
      { videoId: '3', title: 'Beta', permalink: 'https://fb.com/watch/?v=3', collectionIds: ['426792272115358', '165363141591607'] },
      { videoId: '2', title: 'Alpha dup', permalink: 'https://fb.com/watch/?v=2b', collectionIds: [] },
      { videoId: '4', title: 'Same Title', permalink: 'https://fb.com/watch/?v=4', collectionIds: [] },
      { videoId: '5', title: 'Same Title', permalink: 'https://fb.com/watch/?v=5', collectionIds: [] },
    ];
    const collections = [
      { id: '165363141591607', name: 'Anime' },
      { id: '426792272115358', name: 'Download' },
    ];
    const { downloads, duplicates } = planDownloads(items, collections, '/out');

    // First occurrence of videoId 2 wins; the later one is reported as dup.
    expect(downloads.map((d) => d.videoId)).toEqual(['1', '2', '3', '4', '5']);
    expect(duplicates.map((d) => d.videoId)).toEqual(['2']);
    // Multi-collection item → FIRST collection by sorted name (Anime < Download).
    expect(downloads[2].outPath).toBe(join('/out', 'Anime', 'Beta.mp4'));
    expect(downloads[0].outPath).toBe(join('/out', '_uncategorized', 'Zeta.mp4'));
    // Filename collision: second "Same Title" gets the _{videoId} tiebreaker.
    expect(downloads[3].outPath).toBe(join('/out', '_uncategorized', 'Same Title.mp4'));
    expect(downloads[4].outPath).toBe(join('/out', '_uncategorized', 'Same Title_5.mp4'));
  });
});

describe('downloadAll', () => {
  it('downloads every save into collection folders + _uncategorized with 0 failures and a report', async () => {
    const dir = tempDir();
    try {
      const { spawnFn, procs } = makeFakeSpawn();
      const { launchFn, closed } = fakeLaunch();
      const progress: Array<{ completed: number; failed?: number; total: number }> = [];
      const p = downloadAll(baseOpts(dir, { spawnFn, launchFn, jobs: 2, onProgress: (event) => progress.push(event) }));
      await drainPool(procs, 10);
      const result = await p;

      expect(result).toEqual({ downloaded: 10, failed: 0, skipped: 0 });
      expect(progress.at(-1)).toMatchObject({ completed: 10, failed: 0, total: 10 });
      expect(progress.filter((event) => event.percent === 100)).toHaveLength(10);
      expect(closed).toHaveLength(1); // browser session closed after the run

      // Every queued item: temp cookie copy (never the master file).
      expect(procs).toHaveLength(10);
      for (const proc of procs) {
        const cookieArg = cookiesArg(proc);
        expect(cookieArg).not.toBe(COOKIES);
        expect(cookieArg.startsWith(tmpdir())).toBe(true);
        expect(cookieArg).toContain('fb-saved-dl-cookies-');
      }

      // Folder placement: per-collection folders + _uncategorized.
      const outPaths = new Set(procs.map((p) => outPathArg(p)));
      expect(outPaths.size).toBe(10);
      for (const expected of [
        join(dir, 'Anime', F_ANIME),
        join(dir, 'Download', F_DL1),
        join(dir, 'Download', F_DL2),
        join(dir, '_uncategorized', F_UNCAT1),
        join(dir, '_uncategorized', F_UNCAT_REEL),
      ]) {
        expect(outPaths.has(expected)).toBe(true);
      }

      // Report written next to the downloads with 0 failures.
      const report = readReport(dir);
      expect(report.summary).toEqual({ downloaded: 10, failed: 0, skipped: 0 });
      expect(report.failures).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);

  it('writes counts.json cache with real counts from the walk', async () => {
    const dir = tempDir();
    try {
      const { spawnFn, procs } = makeFakeSpawn();
      const { launchFn, closed } = fakeLaunch();
      const p = downloadAll(baseOpts(dir, { spawnFn, launchFn }));
      await drainPool(procs, 10);
      const result = await p;

      expect(result).toEqual({ downloaded: 10, failed: 0, skipped: 0 });
      const cache = JSON.parse(readFileSync(join(dir, 'counts.json'), 'utf-8')) as {
        counts: Record<string, number>;
      };
      // Same counts the old full-walk listCollectionsService returned.
      expect(cache.counts['165363141591607']).toBe(1); // Anime
      expect(cache.counts['426792272115358']).toBe(2); // Download
      expect(closed).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);

  it('dedupes within the run — later duplicate videoId is skipped as duplicate', async () => {
    const dir = tempDir();
    try {
      const { spawnFn, procs } = makeFakeSpawn();
      const { launchFn } = fakeLaunch(async (route) => {
        const post = route.request().postData();
        const docId = postedDocId(post);
        const cursor = postedCursor(post);
        let body: string;
        if (docId === ALL_SAVES_DOC_ID) {
          if (!cursor) {
            // Make save c2 a duplicate of c1's video (same videoId).
            const doc = JSON.parse(P1) as {
              data: { viewer: { saver_info: { all_saves: { edges: Array<{ node: any }> } } } };
            };
            const nodes = doc.data.viewer.saver_info.all_saves.edges.map((e) => e.node);
            nodes[1].savable.id = '1533958624489961';
            nodes[1].savable.savable_permalink =
              'https://www.facebook.com/watch/?ref=saved&v=1533958624489961';
            nodes[1].savable.savable_title.text = 'LiveCam Tay To Mobile Đi Tù (dup save)';
            body = JSON.stringify(doc);
          } else {
            body = P2;
          }
        } else if (docId === LEFT_RAIL_DOC_ID) {
          body = cursor ? LR2 : LR1;
        } else {
          body = '{"data":{"viewer":{}}}';
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body });
      });
      const p = downloadAll(baseOpts(dir, { spawnFn, launchFn, jobs: 3 }));
      await drainPool(procs, 9); // 10 saves, one dup → 9 unique downloads
      const result = await p;

      expect(result).toEqual({ downloaded: 9, failed: 0, skipped: 1 });
      const report = readReport(dir);
      expect(report.summary).toEqual({ downloaded: 9, failed: 0, skipped: 1 });
      expect(report.skipped).toEqual([{ videoId: '1533958624489961', reason: 'duplicate' }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);

  it('dry-run prints the yt-dlp plan without downloading or writing a report', async () => {
    const dir = tempDir();
    try {
      const { spawnFn, procs } = makeFakeSpawn();
      const { launchFn, closed } = fakeLaunch();
      const result = await downloadAll(
        baseOpts(dir, { spawnFn, launchFn, dryRun: true }),
      );

      expect(result.dryRun).toBe(true);
      expect(result.downloaded).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(closed).toHaveLength(1);

      const lines = (result.plan ?? '').split('\n');
      expect(lines).toHaveLength(10); // one line per unique item
      for (let i = 0; i < EXPECTED_ORDER.length; i++) {
        // videoId appears in every permalink (watch/?v= OR /reel/{id}/).
        expect(lines[i]).toContain(EXPECTED_ORDER[i]);
        expect(lines[i]).toContain('-o');
        expect(lines[i]).toContain('--cookies');
      }

      expect(procs).toHaveLength(0); // nothing spawned
      expect(existsSync(join(dir, 'reports'))).toBe(false); // no report written
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);

  it('records per-item failures into the report', async () => {
    const dir = tempDir();
    try {
      const { spawnFn, procs } = makeFakeSpawn();
      const { launchFn } = fakeLaunch();
      const failUrl = 'https://www.facebook.com/watch/?ref=saved&v=1036239645584654';
      const p = downloadAll(baseOpts(dir, { spawnFn, launchFn, jobs: 3 }));
      await drainPool(procs, 10, (proc) => proc.args.includes(failUrl));
      const result = await p;

      expect(result).toEqual({ downloaded: 9, failed: 1, skipped: 0 });
      const report = readReport(dir);
      expect(report.summary).toEqual({ downloaded: 9, failed: 1, skipped: 0 });
      expect(report.failures).toHaveLength(1);
      expect(report.failures[0].videoId).toBe('1036239645584654');
      expect(report.failures[0].reason).toContain('boom');
      expect(report.failures[0].url).toBe(failUrl);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);

});

describe('downloadCollection', () => {
  it('walks ONLY the collection doc (never all-saves) and downloads into its folder', async () => {
    const dir = tempDir();
    try {
      const { spawnFn, procs } = makeFakeSpawn();
      const docIds: string[] = [];
      const { launchFn, closed } = fakeLaunch((route) => {
        docIds.push(postedDocId(route.request().postData()) ?? '');
        defaultGraphQL(route);
      });
      const p = downloadCollection('165363141591607', baseOpts(dir, { spawnFn, launchFn }));
      await drainPool(procs, 2); // both Anime videos from the CI fixture
      const result = await p;

      expect(result).toEqual({ downloaded: 2, failed: 0, skipped: 0 });
      expect(closed).toHaveLength(1);
      // Regression (user complaint): download-collection must NOT walk the
      // all-saves stream — only the per-collection doc + LeftRail names.
      expect(docIds).not.toContain(ALL_SAVES_DOC_ID);
      expect(docIds).toContain(COLLECTION_ITEMS_DOC_ID);
      expect(docIds).toContain(LEFT_RAIL_DOC_ID);
      // Both videos land in the Anime folder (name from LeftRail).
      const outPaths = procs.map((p) => outPathArg(p));
      for (const out of outPaths) {
        expect(out.startsWith(join(dir, 'Anime', ''))).toBe(true);
      }
      expect(outPaths).toContain(join(dir, 'Anime', F_ANIME));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);

  it('emits onStatus phase messages from launch through downloads', async () => {
    const dir = tempDir();
    try {
      const { spawnFn, procs } = makeFakeSpawn();
      const { launchFn } = fakeLaunch();
      const messages: string[] = [];
      const p = downloadCollection('165363141591607', baseOpts(dir, { spawnFn, launchFn, onStatus: (m) => messages.push(m) }));
      await drainPool(procs, 2);
      await p;

      expect(messages[0]).toBe('Launching browser and signing in...');
      expect(messages.some((m) => m.startsWith('Scanning collection videos — page 1'))).toBe(true);
      expect(messages.some((m) => /^Found \d+ videos in collection/.test(m))).toBe(true);
      expect(messages[messages.length - 1]).toBe('Preparing downloads...');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);

  it('throws NO_VIDEOS for an unknown collection id (belt-and-braces)', async () => {
    const dir = tempDir();
    try {
      const { spawnFn, procs } = makeFakeSpawn();
      const { launchFn, closed } = fakeLaunch();
      const err = await downloadCollection('nope', baseOpts(dir, { spawnFn, launchFn })).catch(
        (e: unknown) => e,
      );
      expect((err as { code: string }).code).toBe(NO_VIDEOS);
      expect((err as { message: string }).message).toContain('collection not found: nope');
      expect(procs).toHaveLength(0);
      expect(closed).toHaveLength(1); // browser closed even on error
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);
});

describe('listCollectionsService', () => {
  it('is LeftRail-only and merges cached counts', async () => {
    const dir = tempDir();
    try {
      writeFileSync(
        join(dir, 'counts.json'),
        JSON.stringify({ counts: { '375610470566872': 4, bogus: 'x', negative: -1 } }),
      );
      const docIds: string[] = [];
      const { launchFn, closed } = fakeLaunch((route) => {
        docIds.push(postedDocId(route.request().postData()) ?? '');
        defaultGraphQL(route);
      });
      const collections = await listCollectionsService(COOKIES, dir, launchFn);

      expect(collections).toHaveLength(10); // authoritative LeftRail set incl. empty
      // Option 1: no all-saves walk — only the two LeftRail pages.
      expect(docIds).toEqual(Array(2).fill(LEFT_RAIL_DOC_ID));
      // Cache merged; invalid entries dropped.
      expect(collections.find((c) => c.id === '375610470566872')?.count).toBe(4);
      expect(closed).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);

  it('returns LeftRail collections with undefined counts when no cache exists', async () => {
    const dir = tempDir();
    try {
      const { launchFn, closed } = fakeLaunch();
      const collections = await listCollectionsService(COOKIES, dir, launchFn);

      expect(collections).toHaveLength(10);
      expect(collections.every((c) => c.count === undefined)).toBe(true);
      expect(closed).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);
});

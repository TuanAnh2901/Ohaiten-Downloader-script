// ---------------------------------------------------------------------------
// download module tests — spawn is dependency-injected (fake), no real yt-dlp.
// Verifies the cookie-safety rule (temp copy, never the master file), arg
// structure, skip logic, login-error detection, and pool concurrency.
// ---------------------------------------------------------------------------

import { EventEmitter } from 'node:events';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_FAILED } from '../src/errors.js';
import {
  buildYtDlpArgs,
  downloadMany,
  downloadVideo,
  hasDoneMarker,
} from '../src/download.js';

// --- fake spawn --------------------------------------------------------------

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
  /** Simulate a successful run: close with code 0. */
  succeed(): void {
    if (this.exited) return;
    this.exited = true;
    this.stdout.end();
    this.stderr.end();
    this.emit('close', 0);
  }
  /** Simulate a failed run: write stderr, close with non-zero code. */
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
  maxConcurrent: { value: number };
} {
  const procs: FakeChild[] = [];
  const maxConcurrent = { value: 0 };
  let active = 0;
  const spawnFn = vi.fn((cmd: string, args: string[]) => {
    const p = new FakeChild(cmd, args);
    procs.push(p);
    active++;
    maxConcurrent.value = Math.max(maxConcurrent.value, active);
    p.on('close', () => active--);
    return p;
  });
  return { spawnFn, procs, maxConcurrent };
}

/** Exit live procs one at a time until all `total` spawned and finished. */
async function drainPool(procs: FakeChild[], total: number): Promise<void> {
  for (let i = 0; i < 2000; i++) {
    if (procs.length >= total && procs.every((p) => p.exited)) return;
    const live = procs.find((p) => !p.exited);
    if (live) live.succeed();
    await new Promise((r) => setTimeout(r, 2));
  }
  throw new Error('pool did not drain');
}

async function waitForProcs(
  procs: FakeChild[],
  n: number,
): Promise<FakeChild[]> {
  for (let i = 0; i < 200; i++) {
    if (procs.length >= n) return procs.slice(0, n);
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`expected ${n} spawned processes, got ${procs.length}`);
}

function cookiesArg(proc: FakeChild): string {
  const i = proc.args.indexOf('--cookies');
  if (i < 0) throw new Error('no --cookies in args: ' + proc.args.join(' '));
  return proc.args[i + 1];
}

/**
 * Spawn order is nondeterministic (workers hit async copyFile before spawn),
 * so locate a proc by its unique URL instead of array position.
 */
function procFor(procs: FakeChild[], videoId: number): FakeChild {
  const url = `https://www.facebook.com/watch/?v=${videoId}`;
  const p = procs.find((x) => x.args.includes(url));
  if (!p) {
    throw new Error(
      `no proc for ${url}; got: ${procs.map((x) => x.args.join(' ')).join(' | ')}`,
    );
  }
  return p;
}

// --- fixtures ----------------------------------------------------------------

let dir: string;
let master: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'dl-test-'));
  master = join(dir, 'master-cookies.txt');
  writeFileSync(
    master,
    '# Netscape HTTP Cookie File\n.facebook.com\tTRUE\t/\tTRUE\t0\tc_user\t123\n',
  );
});

function item(i: number, name = 'v') {
  return {
    videoId: `${name}${i}`,
    url: `https://www.facebook.com/watch/?v=${i}`,
    outPath: join(dir, `${name}${i}.mp4`),
  };
}

function markerPath(outPath: string): string {
  return `${outPath}.done.json`;
}

// --- tests -------------------------------------------------------------------

describe('buildYtDlpArgs', () => {
  it('mirrors the AnimehayCLI arg list: cookies, format, merge, URL last', () => {
    const args = buildYtDlpArgs({
      cookiesFile: '/tmp/c.txt',
      outPath: '/out/a.mp4',
      url: 'https://fb.com/v',
    });
    expect(args).toEqual([
      '--cookies',
      '/tmp/c.txt',
      '-f',
      'bv*[height<=1080]+ba/b[height<=1080]',
      '--merge-output-format',
      'mp4',
      '--remux-video',
      'mp4',
      '--no-playlist',
      '-N',
      '4',
      '--retries',
      '3',
      '--fragment-retries',
      '10',
      '--skip-unavailable-fragments',
      '-o',
      '/out/a.mp4',
      '--no-overwrites',
      '--print',
      'after_move:filepath',
      'https://fb.com/v',
    ]);
    expect(args[args.length - 1]).toBe('https://fb.com/v');
    expect(args).toContain('bv*[height<=1080]+ba/b[height<=1080]');
  });
});

describe('cookie safety (temp copy, never the master)', () => {
  it('passes a temp copy of cookies to yt-dlp and deletes it after', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const outPath = join(dir, 'v0.mp4');
    const p = downloadVideo({
      cookiesFile: master,
      outPath,
      url: 'https://fb.com/v0',
      spawnFn,
    });
    const [proc] = await waitForProcs(procs, 1);

    const cookieArg = cookiesArg(proc);
    expect(cookieArg).not.toBe(master); // master NEVER passed
    expect(proc.args).not.toContain(master);
    expect(cookieArg.startsWith(tmpdir())).toBe(true);
    expect(cookieArg).toContain('fb-saved-dl-cookies-');
    expect(existsSync(cookieArg)).toBe(true); // the copy exists
    expect(readFileSync(cookieArg, 'utf-8')).toContain('c_user'); // content copied

    proc.succeed();
    const result = await p;
    expect(result.ok).toBe(true);
    expect(existsSync(cookieArg)).toBe(false); // temp copy cleaned up
  });

  it('downloadMany passes temp copies to yt-dlp for every item', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const items = [item(0), item(1)];
    const p = downloadMany(items, { jobs: 2, cookiesFile: master, spawnFn });
    const spawned = await waitForProcs(procs, 2);
    for (const proc of spawned) {
      const cookieArg = cookiesArg(proc);
      expect(cookieArg).not.toBe(master);
      expect(cookieArg).toContain('fb-saved-dl-cookies-');
    }
    spawned[0].succeed();
    spawned[1].succeed();
    const results = await p;
    expect(results.map((r) => r.status)).toEqual(['downloaded', 'downloaded']);
    for (const proc of spawned) {
      expect(existsSync(cookiesArg(proc))).toBe(false); // all temp copies cleaned up
    }
  });
});

describe('skip logic', () => {
  it('skips when a .done.json marker exists — yt-dlp not spawned', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const it0 = item(0);
    writeFileSync(markerPath(it0.outPath), JSON.stringify({ videoId: it0.videoId }));
    const results = await downloadMany([it0], { jobs: 1, cookiesFile: master, spawnFn });
    expect(results).toEqual([{ videoId: it0.videoId, status: 'skipped' }]);
    expect(procs).toHaveLength(0);
    expect(hasDoneMarker(it0.outPath)).toBe(true);
  });

  it('skips an existing file >=1MB without a marker (pre-marker downloads)', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const it0 = item(0);
    writeFileSync(it0.outPath, Buffer.alloc(2 * 1024 * 1024)); // 2MB
    const results = await downloadMany([it0], { jobs: 1, cookiesFile: master, spawnFn });
    expect(results).toEqual([{ videoId: it0.videoId, status: 'skipped' }]);
    expect(procs).toHaveLength(0);
  });

  it('downloads a small file WITHOUT a marker (Metis fix)', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const it0 = item(0);
    writeFileSync(it0.outPath, Buffer.alloc(10)); // 10 bytes < 1MB
    const p = downloadMany([it0], { jobs: 1, cookiesFile: master, spawnFn });
    const [proc] = await waitForProcs(procs, 1);
    proc.succeed();
    const results = await p;
    expect(results).toEqual([{ videoId: it0.videoId, status: 'downloaded' }]);
    expect(procs).toHaveLength(1);
    expect(existsSync(markerPath(it0.outPath))).toBe(true); // marker written
  });

  it('writes a marker with videoId, url, timestamp and size', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const it0 = item(0);
    const p = downloadMany([it0], { jobs: 1, cookiesFile: master, spawnFn });
    const [proc] = await waitForProcs(procs, 1);
    proc.succeed();
    await p;
    const marker = JSON.parse(readFileSync(markerPath(it0.outPath), 'utf-8'));
    expect(marker.videoId).toBe(it0.videoId);
    expect(marker.url).toBe(it0.url);
    expect(marker.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof marker.size).toBe('number');
  });
});

describe('error handling', () => {
  it('throws AUTH_FAILED when yt-dlp fails and output mentions login', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const outPath = join(dir, 'v0.mp4');
    const p = downloadVideo({
      cookiesFile: master,
      outPath,
      url: 'https://fb.com/v0',
      spawnFn,
    });
    const [proc] = await waitForProcs(procs, 1);
    proc.failWith("ERROR: [Facebook] Sign in to confirm you're not a bot\n");
    await expect(p).rejects.toMatchObject({ code: AUTH_FAILED });
  });

  it('detects login problem via "cookies" mention in stderr', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const outPath = join(dir, 'v0.mp4');
    const p = downloadVideo({
      cookiesFile: master,
      outPath,
      url: 'https://fb.com/v0',
      spawnFn,
    });
    const [proc] = await waitForProcs(procs, 1);
    proc.failWith('ERROR: unable to extract cookies: session expired\n');
    await expect(p).rejects.toMatchObject({ code: AUTH_FAILED });
  });

  it('does NOT treat every failure as auth — plain failure returns ok:false', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const outPath = join(dir, 'v0.mp4');
    const p = downloadVideo({
      cookiesFile: master,
      outPath,
      url: 'https://fb.com/v0',
      spawnFn,
    });
    const [proc] = await waitForProcs(procs, 1);
    proc.failWith('ERROR: Unsupported URL: https://fb.com/v0\n', 2);
    const result = await p;
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Unsupported URL');
  });

  it('downloadMany isolates per-item failure (never throws for one bad item)', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const items = [item(0), item(1), item(2)];
    const p = downloadMany(items, { jobs: 3, cookiesFile: master, spawnFn });
    const spawned = await waitForProcs(procs, 3);
    procFor(spawned, 0).succeed();
    procFor(spawned, 1).failWith('ERROR: boom\n');
    procFor(spawned, 2).succeed();
    const results = await p;
    expect(results.map((r) => r.status)).toEqual(['downloaded', 'failed', 'downloaded']);
    expect(results[1].error).toBeTruthy();
  });
});

describe('downloadMany pool', () => {
  it('runs at most `jobs` (3) concurrent spawns for 6 items', async () => {
    const { spawnFn, procs, maxConcurrent } = makeFakeSpawn();
    const items = Array.from({ length: 6 }, (_, i) => item(i));
    const p = downloadMany(items, { jobs: 3, cookiesFile: master, spawnFn });
    await drainPool(procs, 6);
    const results = await p;

    expect(maxConcurrent.value).toBeLessThanOrEqual(3);
    expect(maxConcurrent.value).toBe(3);
    expect(procs).toHaveLength(6);
    expect(results).toHaveLength(6);
    expect(results.every((r) => r.status === 'downloaded')).toBe(true);
    // one marker per downloaded item
    expect(items.every((i) => existsSync(markerPath(i.outPath)))).toBe(true);
  });

  it('respects jobs=1 (serial)', async () => {
    const { spawnFn, procs, maxConcurrent } = makeFakeSpawn();
    const items = Array.from({ length: 3 }, (_, i) => item(i));
    const p = downloadMany(items, { jobs: 1, cookiesFile: master, spawnFn });
    await drainPool(procs, 3);
    const results = await p;
    expect(maxConcurrent.value).toBe(1);
    expect(results.every((r) => r.status === 'downloaded')).toBe(true);
  });

  it('reports progress and done callbacks per video', async () => {
    const { spawnFn, procs } = makeFakeSpawn();
    const items = [item(0), item(1)];
    const lines: Array<[string, string]> = [];
    const done: string[] = [];
    const p = downloadMany(items, {
      jobs: 2,
      cookiesFile: master,
      spawnFn,
      onProgress: (videoId, line) => lines.push([videoId, line]),
      onDone: (videoId) => done.push(videoId),
    });
    const spawned = await waitForProcs(procs, 2);
    procFor(spawned, 0).stdout.write('[download]  0.0% of 10.00MiB at 0.00B/s\n');
    procFor(spawned, 0).succeed();
    procFor(spawned, 1).succeed();
    await p;
    expect(lines.some(([id, l]) => id === 'v0' && l.includes('0.0%'))).toBe(true);
    expect(done.sort()).toEqual(['v0', 'v1']);
  });
});

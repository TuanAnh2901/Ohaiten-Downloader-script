/**
 * Orchestrator: the download-all / download-collection flows.
 *
 * download-all enumerates via ONE all-saves GraphQL stream (doc
 * 27174039202273427) which covers 100% of saves INCLUDING uncategorized
 * items (spike T3). download-collection uses the per-collection doc
 * 26605228462486746 (CometSaveCollectionAllItemsPaginationQuery, root path
 * data.content_collection.collection_items) — fast path, walks only the one
 * collection, never the all-saves stream. Collections come from the LeftRail
 * doc (27602599562734455) with counts merged from the containing_lists
 * aggregation. No save-timestamp field exists on any item node (B=NONE);
 * filename.ts already omits the prefix when absent.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Page } from 'playwright';
import type {
  CollectionSummary as CliCollectionSummary,
  DownloadOptions,
  DownloadResult,
} from './index.js';
import { launchAuthenticated } from './auth.js';
import {
  listCollections,
  type CollectionSummary as ScrapeCollectionSummary,
  type ItemWithCollections,
} from './collections.js';
import { buildYtDlpArgs, downloadMany, type DownloadItem } from './download.js';
import { FbSavedCliError, NO_VIDEOS } from './errors.js';
import { buildFileName } from './filename.js';
import { listAllSaves, listCollectionItems, type SavedItem } from './items.js';
import { MultiProgress, type ProgressSlot } from './multiprogress.js';
import { parseYtDlpLine } from './progress.js';
import { Report } from './report.js';

type LaunchFn = typeof launchAuthenticated;

/** Orchestrator options: DownloadOptions + test seams (DI, no vi.mock). */
export interface OrchestratorOpts extends DownloadOptions {
  /** Pagination pacing for items + LeftRail (test seam; default 2000ms). */
  delayMs?: number;
  /** Test seam: fake yt-dlp spawn. Defaults to node:child_process.spawn. */
  spawnFn?: typeof spawn;
  /** Test seam: fake browser launch. Defaults to launchAuthenticated. */
  launchFn?: LaunchFn;
}

async function withBrowser<T>(
  cookiesFile: string,
  launchFn: LaunchFn,
  fn: (page: Page) => Promise<T>,
): Promise<T> {
  const { context, page } = await launchFn(cookiesFile);
  try {
    return await fn(page);
  } finally {
    await context.close();
  }
}

/** SavedItem.collectionIds are bare ids; listCollections' count aggregation
 *  needs the containingLists {id, name} shape (LeftRail name wins anyway). */
function aggregateItems(items: SavedItem[]): ItemWithCollections[] {
  return items.map((i) => ({
    containingLists: i.collectionIds.map((id) => ({ id, name: '' })),
  }));
}

/** PaginateOpts.onPage that reports walk progress through opts.onStatus —
 *  without it the GUI sits silent for minutes before the first progress
 *  event and looks frozen. */
function statusScanner(opts: OrchestratorOpts, label: string) {
  let pageNum = 0;
  let found = 0;
  return (pageItems: unknown[]): void => {
    pageNum += 1;
    found += pageItems.length;
    opts.onStatus?.(`${label} — page ${pageNum} (${found} found so far)...`);
  };
}

// ---------------------------------------------------------------------------
// Counts cache (counts.json)
// ---------------------------------------------------------------------------
// The fast list-collections refresh walks LeftRail only (no per-item counts).
// Download runs DO walk the all-saves stream, so they persist real counts
// here and the refresh merges them — stale-by-design until the next download.
const COUNTS_CACHE_FILE = 'counts.json';

function readCountsCache(outputDir: string): Record<string, number> {
  try {
    const parsed = JSON.parse(
      readFileSync(join(outputDir, COUNTS_CACHE_FILE), 'utf-8'),
    ) as { counts?: Record<string, unknown> };
    const counts = parsed.counts;
    if (!counts || typeof counts !== 'object') return {};
    const result: Record<string, number> = {};
    for (const [id, count] of Object.entries(counts)) {
      if (typeof count === 'number' && Number.isInteger(count) && count >= 0) result[id] = count;
    }
    return result;
  } catch {
    return {};
  }
}

function writeCountsCache(outputDir: string, summaries: CliCollectionSummary[]): void {
  try {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(outputDir, COUNTS_CACHE_FILE),
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          counts: Object.fromEntries(summaries.map((c) => [c.id, c.count ?? 0])),
        },
        null,
        2,
      ) + '\n',
    );
  } catch {
    // Best-effort: a cache write failure must never fail the run.
  }
}

/** Persist real counts and hand the collection list to the engine (option 9:
 *  the walk already has counts — no second enumeration needed). */
function emitCollections(
  opts: OrchestratorOpts,
  collections: ScrapeCollectionSummary[],
): CliCollectionSummary[] {
  const summaries = collections.map((c) => ({ id: c.id, name: c.name, count: c.count }));
  writeCountsCache(opts.outputDir, summaries);
  opts.onCollections?.(summaries);
  return summaries;
}

// ---------------------------------------------------------------------------
// Download planning (pure)
// ---------------------------------------------------------------------------

export interface PlannedDownloads {
  /** Deduped download queue, newest-first (item order preserved). */
  downloads: DownloadItem[];
  /** Later items with a repeated videoId — skipped with reason 'duplicate'. */
  duplicates: SavedItem[];
}

/**
 * Turn scraped items into a deduped, folder-assigned download queue.
 * - Folder = collection name; `_uncategorized/` when the item has no
 *   collection. An item saved to MULTIPLE collections lands in the FIRST by
 *   sorted name (deterministic — one video, one folder).
 * - Dedupe by videoId across the whole run: first occurrence wins.
 * - Filename collisions inside a folder get the `_{videoId}` tiebreaker via
 *   buildFileName.
 */
export function planDownloads(
  items: SavedItem[],
  collections: ScrapeCollectionSummary[],
  outputDir: string,
  collectionId?: string,
): PlannedDownloads {
  const nameById = new Map(collections.map((c) => [c.id, c.name]));
  const seen = new Set<string>();
  const downloads: DownloadItem[] = [];
  const duplicates: SavedItem[] = [];
  const folderNames = new Map<string, Set<string>>();

  for (const item of items) {
    if (collectionId !== undefined && !item.collectionIds.includes(collectionId)) continue;
    if (seen.has(item.videoId)) {
      duplicates.push(item);
      continue;
    }
    seen.add(item.videoId);

    let folder: string;
    if (collectionId !== undefined) {
      // Single-collection run: always the target collection's folder.
      folder = nameById.get(collectionId) ?? collectionId;
    } else {
      const names = item.collectionIds
        .map((id) => nameById.get(id) ?? id)
        .sort((a, b) => a.localeCompare(b));
      folder = names[0] ?? '_uncategorized';
    }

    const set = folderNames.get(folder) ?? new Set<string>();
    folderNames.set(folder, set);
    const name = buildFileName(item, { existingNames: set });
    set.add(name);
    downloads.push({
      videoId: item.videoId,
      url: item.permalink,
      outPath: join(outputDir, folder, name),
      collectionId: collectionId ?? item.collectionIds[0] ?? '',
    });
  }
  return { downloads, duplicates };
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

/** Dry-run plan: one yt-dlp command line per queued item. */
function buildPlanText(downloads: DownloadItem[], opts: OrchestratorOpts): string {
  return downloads
    .map((d) =>
      `${opts.ytDlpPath} ${buildYtDlpArgs({
        cookiesFile: opts.cookiesFile,
        outPath: d.outPath,
        url: d.url,
        resolution: opts.resolution,
      }).join(' ')}`,
    )
    .join('\n');
}

async function runDownloads(
  downloads: DownloadItem[],
  duplicates: SavedItem[],
  opts: OrchestratorOpts,
): Promise<DownloadResult> {
  const report = new Report();
  for (const dup of duplicates) report.addSkipped(dup.videoId, 'duplicate');

  // writeDoneMarker does NOT mkdir — create every per-collection folder up
  // front or the marker write fails with ENOENT and every item is lost.
  const dirs = new Set(downloads.map((d) => dirname(d.outPath)));
  for (const dir of dirs) mkdirSync(dir, { recursive: true });

  // One progress slot per queued video (mirrors AnimehayCLI series.ts).
  const mp = new MultiProgress();
  const slots = new Map<string, ProgressSlot>();
  for (const d of downloads) slots.set(d.videoId, mp.createSlot(d.videoId));

  const urlById = new Map(downloads.map((d) => [d.videoId, d.url]));
  const completedIds = new Set<string>();
  let completed = 0;
  let failed = 0;
  const results = await downloadMany(downloads, {
    jobs: opts.jobs,
    cookiesFile: opts.cookiesFile,
    ytDlpPath: opts.ytDlpPath,
    spawnFn: opts.spawnFn,
    onProgress: (videoId, line) => {
      const p = parseYtDlpLine(line);
      if (p) {
        slots.get(videoId)?.update(p.percent, p.size, '', p.speed, p.eta);
        if (p.percent >= 100 && !completedIds.has(videoId)) {
          completedIds.add(videoId);
          opts.onProgress?.({
            collectionId: downloads.find((d) => d.videoId === videoId)?.collectionId ?? '',
            videoId,
            completed,
            failed,
            total: downloads.length,
            percent: p.percent,
            speed: p.speed,
            eta: p.eta,
          });
        }
      }
    },
    onDone: (videoId, result) => {
      slots.get(videoId)?.finish('done');
      if (result.status === 'failed') failed += 1;
      else completed += 1;
      opts.onProgress?.({
        collectionId: downloads.find((d) => d.videoId === videoId)?.collectionId ?? '',
        videoId,
        completed,
        failed,
        total: downloads.length,
      });
    },
    signal: opts.signal,
    resolution: opts.resolution,
  });
  for (const r of results) {
    if (r.status === 'downloaded') report.addDownloaded(r.videoId);
    else if (r.status === 'failed') {
      report.addFailure(r.videoId, r.error ?? 'unknown error', urlById.get(r.videoId));
    } else {
      report.addSkipped(r.videoId, 'already downloaded');
    }
  }
  // ponytail: reports live under the output dir next to the downloads.
  report.writeReportFile(join(opts.outputDir, 'reports'));
  return {
    downloaded: report.downloadedCount,
    failed: report.failedCount,
    skipped: report.skippedCount,
  };
}

async function execute(
  opts: OrchestratorOpts,
  items: SavedItem[],
  collections: ScrapeCollectionSummary[],
  collectionId?: string,
): Promise<DownloadResult> {
  const { downloads, duplicates } = planDownloads(
    items,
    collections,
    opts.outputDir,
    collectionId,
  );
  if (opts.dryRun) {
    // Dry run: plan only — no downloads, no report file.
    return {
      dryRun: true,
      plan: buildPlanText(downloads, opts),
      downloaded: 0,
      failed: 0,
      skipped: 0,
    };
  }
  return runDownloads(downloads, duplicates, opts);
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/** Download every saved video into per-collection folders + `_uncategorized/`. */
export async function downloadAll(opts: OrchestratorOpts): Promise<DownloadResult> {
  opts.onStatus?.('Launching browser and signing in...');
  return withBrowser(opts.cookiesFile, opts.launchFn ?? launchAuthenticated, async (page) => {
    const items = await listAllSaves(page, {
      delayMs: opts.delayMs,
      onPage: statusScanner(opts, 'Scanning saved items'),
    });
    opts.onStatus?.(`Found ${items.length} videos — organizing collections...`);
    const collections = await listCollections(page, {
      items: aggregateItems(items),
      delayMs: opts.delayMs,
    });
    emitCollections(opts, collections);
    opts.onStatus?.('Preparing downloads...');
    return execute(opts, items, collections);
  });
}

/** Download the videos of a single collection (fast path: walks ONLY that
 *  collection via its own GraphQL doc — never the all-saves stream). Counts
 *  cache is NOT written here: a single-collection walk has no counts for the
 *  other collections and would clobber the cache with zeros. */
export async function downloadCollection(
  collectionId: string,
  opts: OrchestratorOpts,
): Promise<DownloadResult> {
  opts.onStatus?.('Launching browser and signing in...');
  return withBrowser(opts.cookiesFile, opts.launchFn ?? launchAuthenticated, async (page) => {
    const items = await listCollectionItems(page, collectionId, {
      delayMs: opts.delayMs,
      onPage: statusScanner(opts, 'Scanning collection videos'),
    });
    opts.onStatus?.(`Found ${items.length} videos in collection — organizing...`);
    const collections = await listCollections(page, { delayMs: opts.delayMs });
    // index.ts checks existence before calling; this is belt-and-braces.
    if (!collections.some((c) => c.id === collectionId)) {
      throw new FbSavedCliError(NO_VIDEOS, `collection not found: ${collectionId}`);
    }
    opts.onStatus?.('Preparing downloads...');
    return execute(opts, items, collections, collectionId);
  });
}

/** {id, name, count?} — LeftRail-only refresh (option 1: ~15s, not minutes).
 *  Counts come from the counts.json cache written by download runs; absent
 *  until the first download. No all-saves walk, no count aggregation. */
export async function listCollectionsService(
  cookiesFile: string,
  outputDir: string = './downloads',
  launchFn: LaunchFn = launchAuthenticated,
): Promise<CliCollectionSummary[]> {
  return withBrowser(cookiesFile, launchFn, async (page) => {
    const collections = await listCollections(page);
    const cached = readCountsCache(outputDir);
    return collections.map((c) => ({ id: c.id, name: c.name, count: cached[c.id] }));
  });
}

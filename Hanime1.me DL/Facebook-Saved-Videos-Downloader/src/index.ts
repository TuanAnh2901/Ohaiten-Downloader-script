#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { Command, CommanderError } from 'commander';
import {
  COOKIES_INVALID,
  EXIT_OK,
  EXIT_PARTIAL,
  EXIT_FATAL,
  EXIT_NOTHING,
  FbSavedCliError,
  NO_VIDEOS,
  exitCodeFor,
} from './errors.js';
import {
  downloadAll as runDownloadAll,
  downloadCollection as runDownloadCollection,
  listCollectionsService,
} from './orchestrator.js';
import { runEngineJsonl } from './engine-jsonl.js';

// ---------------------------------------------------------------------------
// Public types — the CLI layer talks to scrape services through this seam so
// parsing/confirmation/exit codes are testable with fake services before the
// real collections/items/download modules land.
// ---------------------------------------------------------------------------

export interface CollectionSummary {
  id: string;
  name: string;
  count: number;
}

export interface DownloadOptions {
  cookiesFile: string;
  outputDir: string;
  dryRun: boolean;
  jobs: number;
  ytDlpPath: string;
  resolution?: number;
  signal?: AbortSignal;
  onProgress?: (progress: { collectionId: string; videoId: string; completed: number; total: number }) => void;
}

export interface DownloadResult {
  dryRun?: boolean;
  plan?: string;
  downloaded: number;
  failed: number;
  skipped: number;
}

export interface CliServices {
  listCollections(cookiesFile: string): Promise<CollectionSummary[]>;
  downloadAll(opts: DownloadOptions): Promise<DownloadResult>;
  downloadCollection(collectionId: string, opts: DownloadOptions): Promise<DownloadResult>;
}

export interface CliIo {
  confirm(question: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const int = (v: string) => parseInt(v, 10);
const COOKIES_DEFAULT = 'Facebook-cookies.txt';

function assertCookiesFile(path: string): void {
  if (!existsSync(path)) {
    throw new FbSavedCliError(
      COOKIES_INVALID,
      `cookies file not found: ${path} (export cookies with your browser or pass --cookies)`,
    );
  }
}

function printCollectionTable(collections: CollectionSummary[]): void {
  const rows = collections.map((c) => [c.id, c.name, String(c.count)]);
  const widths = [0, 1, 2].map((i) =>
    Math.max('ID'.length, 'NAME'.length, 'COUNT'.length, ...rows.map((r) => r[i].length)),
  );
  const fmt = (r: string[]) => r.map((v, i) => v.padEnd(widths[i])).join('  ').trimEnd();
  process.stdout.write(fmt(['ID', 'NAME', 'COUNT']) + '\n');
  for (const r of rows) process.stdout.write(fmt(r) + '\n');
}

async function confirmDownload(
  collections: CollectionSummary[],
  yes: boolean,
  io: CliIo,
): Promise<boolean> {
  const total = collections.reduce((s, c) => s + c.count, 0);
  process.stderr.write(
    `${collections.length} collection${collections.length === 1 ? '' : 's'}, ${total} videos total\n`,
  );
  for (const c of collections) {
    process.stderr.write(`  [${c.id}] ${c.name}: ${c.count} videos\n`);
  }
  return yes || io.confirm('Proceed? (y/N): ');
}

function reportResult(r: DownloadResult): void {
  if (r.dryRun) {
    if (r.plan) process.stdout.write(r.plan + '\n');
    return;
  }
  process.stdout.write(`[DONE] ${r.downloaded} downloaded, ${r.failed} failed, ${r.skipped} skipped\n`);
}

// Mirrors Report.exitCode: partial failures → 1, nothing at all → 3.
function exitForResult(r: DownloadResult): number {
  if (r.dryRun) return EXIT_OK;
  if (r.failed > 0) return EXIT_PARTIAL;
  if (r.downloaded === 0 && r.skipped === 0) return EXIT_NOTHING;
  return EXIT_OK;
}

interface DownloadFlags {
  cookies: string;
  outputDir: string;
  dryRun: boolean;
  yes: boolean;
  jobs: number;
  ytDlpPath: string;
  verbose: boolean;
}

function toDownloadOptions(f: DownloadFlags): DownloadOptions {
  return {
    cookiesFile: f.cookies,
    outputDir: f.outputDir,
    dryRun: f.dryRun,
    jobs: f.jobs,
    ytDlpPath: f.ytDlpPath,
  };
}

async function runDownload(
  services: CliServices,
  io: CliIo,
  flags: DownloadFlags,
  collectionId?: string,
): Promise<void> {
  const opts = toDownloadOptions(flags);
  assertCookiesFile(opts.cookiesFile);

  if (flags.verbose) {
    process.stderr.write(
      `[VERBOSE] cookies=${opts.cookiesFile} outputDir=${opts.outputDir} jobs=${opts.jobs} ytDlpPath=${opts.ytDlpPath} dryRun=${opts.dryRun}\n`,
    );
  }

  const collections = await services.listCollections(opts.cookiesFile);
  let targets = collections;
  if (collectionId !== undefined) {
    const match = collections.filter((c) => c.id === collectionId);
    if (match.length === 0) {
      throw new FbSavedCliError(NO_VIDEOS, `collection not found: ${collectionId}`);
    }
    targets = match;
  }

  if (opts.dryRun) {
    const result =
      collectionId !== undefined
        ? await services.downloadCollection(collectionId, opts)
        : await services.downloadAll(opts);
    reportResult(result);
    process.exitCode = EXIT_OK;
    return;
  }

  const proceed = await confirmDownload(targets, flags.yes, io);
  if (!proceed) {
    process.stderr.write('[ABORTED] nothing downloaded\n');
    process.exitCode = EXIT_OK;
    return;
  }

  const result =
    collectionId !== undefined
      ? await services.downloadCollection(collectionId, opts)
      : await services.downloadAll(opts);
  reportResult(result);
  process.exitCode = exitForResult(result);
}

// ---------------------------------------------------------------------------
// Program factory
// ---------------------------------------------------------------------------

export function createProgram(services: CliServices, io: CliIo = defaultIo): Command {
  const program = new Command();
  program
    .name('fb-saved-dl')
    .description('Download videos from Facebook saved collections')
    .version('0.1.0')
    .option('--verbose', 'Verbose output', false)
    .showHelpAfterError()
    .exitOverride();

  program
    .command('list-collections')
    .description('List saved collections with video counts')
    .option('--cookies <file>', 'Netscape-format cookie file', COOKIES_DEFAULT)
    .option('--output <json>', 'Write JSON output to file')
    .action(async (flags: { cookies: string; output?: string }) => {
      assertCookiesFile(flags.cookies);
      const collections = await services.listCollections(flags.cookies);
      if (flags.output) {
        await writeFile(flags.output, JSON.stringify(collections, null, 2) + '\n', 'utf-8');
        process.stderr.write(`[OK] wrote ${collections.length} collections to ${flags.output}\n`);
        return;
      }
      printCollectionTable(collections);
    });

  const downloadCommand = (name: string, description: string, hasArg: boolean) => {
    const cmd = program.command(name).description(description);
    if (hasArg) cmd.argument('<collectionId>', 'Saved collection ID');
    cmd
      .option('--cookies <file>', 'Netscape-format cookie file', COOKIES_DEFAULT)
      .option('--output-dir <dir>', 'Output directory', './downloads')
      .option('--dry-run', 'Print the download plan without downloading', false)
      .option('--yes', 'Skip the confirmation prompt', false)
      .option('--jobs <n>', 'Concurrent downloads', int, 3)
      .option('--yt-dlp-path <path>', 'yt-dlp binary path', 'yt-dlp')
      .action(
        hasArg
          ? async (collectionId: string, flags: DownloadFlags) => {
              await runDownload(
                services,
                io,
                { ...flags, verbose: Boolean(program.opts().verbose) },
                collectionId,
              );
            }
          : async (flags: DownloadFlags) => {
              await runDownload(services, io, {
                ...flags,
                verbose: Boolean(program.opts().verbose),
              });
            },
      );
    return cmd;
  };

  downloadCommand('download-all', 'Download all videos from every saved collection', false);
  downloadCommand('download-collection', 'Download all videos from one saved collection', true);

  return program;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function run(
  argv: string[],
  services: CliServices,
  io: CliIo = defaultIo,
): Promise<number> {
  process.exitCode = EXIT_OK;
  if (argv.includes('--engine-jsonl')) return runEngineJsonl(argv.filter((arg) => arg !== '--engine-jsonl'), services);
  const program = createProgram(services, io);
  try {
    await program.parseAsync(argv);
    return process.exitCode;
  } catch (err) {
    if (err instanceof CommanderError) return err.exitCode;
    if (err instanceof FbSavedCliError) {
      process.stderr.write(`[ERROR] ${err.message}\n`);
      return exitCodeFor(err.code);
    }
    process.stderr.write(`[ERROR] ${err instanceof Error ? err.message : String(err)}\n`);
    return EXIT_PARTIAL;
  }
}

// Real scrape services (Task 16). Each call launches its own authenticated
// browser session (T15 seam design) and closes it when done.
export const defaultServices: CliServices = {
  listCollections: (cookiesFile) => listCollectionsService(cookiesFile),
  downloadAll: (opts) => runDownloadAll(opts),
  downloadCollection: (collectionId, opts) => runDownloadCollection(collectionId, opts),
};

export const defaultIo: CliIo = {
  async confirm(question: string): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    const answer = (await rl.question(question)).trim().toLowerCase();
    rl.close();
    return answer === 'y' || answer === 'yes';
  },
};

// Global error handlers (mirror AnimehayCLI): never let a rejection or
// exception escape silently — always surface and exit non-zero.
process.on('unhandledRejection', (err: unknown) => {
  console.error(`[ERROR] Unhandled rejection: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
process.on('uncaughtException', (err: Error) => {
  console.error(`[ERROR] Uncaught exception: ${err.message}`);
  process.exit(1);
});

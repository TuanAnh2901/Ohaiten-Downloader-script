import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { CollectionSummary, CliServices, DownloadOptions, DownloadResult } from './index.js';
import {
  AUTH_FAILED,
  COOKIES_INVALID,
  EXIT_FATAL,
  EXIT_NOTHING,
  EXIT_OK,
  EXIT_PARTIAL,
  FbSavedCliError,
  exitCodeFor,
} from './errors.js';

export type TerminalType = 'completed' | 'partial' | 'failed' | 'cancelled' | 'timeout' | 'error';
export type EngineEvent = CollectionEvent | ProgressEvent | TerminalEvent;
export interface CollectionEvent { type: 'collections'; operationId: string; collections: CollectionSummary[] }
export interface ProgressEvent { type: 'progress'; operationId: string; collectionId: string; videoId: string; completed: number; total: number }
export type TerminalEvent =
  | { type: 'completed' | 'partial'; operationId: string; successCount: number; failureCount: number; exitCode: 0 | 1 }
  | { type: 'failed' | 'cancelled' | 'timeout' | 'error'; operationId: string; message: string; exitCode: 3 | 130 | 124 | 3 };

const TERMINALS = new Set<TerminalType>(['completed', 'partial', 'failed', 'cancelled', 'timeout', 'error']);
const PROGRESS_FIELDS = ['collectionId', 'videoId', 'completed', 'total'] as const;

function protocolError(message: string): Error { return new Error(`engine protocol: ${message}`); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function nonNegativeInt(value: unknown): value is number { return Number.isInteger(value) && (value as number) >= 0; }
function requiredString(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }

export function validateEngineEvent(value: unknown, terminalSeen: boolean): EngineEvent {
  if (!isRecord(value) || !requiredString(value.type) || !requiredString(value.operationId)) throw protocolError('missing type or operationId');
  if (terminalSeen) throw protocolError('event after terminal');
  if (value.type === 'collections') {
    if (!Array.isArray(value.collections)) throw protocolError('collections must be an array');
    for (const item of value.collections) {
      if (!isRecord(item) || !requiredString(item.id) || typeof item.name !== 'string' || !nonNegativeInt(item.count)) throw protocolError('invalid collection');
    }
    return value as unknown as CollectionEvent;
  }
  if (value.type === 'progress') {
    for (const field of PROGRESS_FIELDS) if (!(field in value)) throw protocolError(`progress missing ${field}`);
    if (!requiredString(value.collectionId) || !requiredString(value.videoId) || !nonNegativeInt(value.completed) || !nonNegativeInt(value.total)) throw protocolError('invalid progress');
    return value as unknown as ProgressEvent;
  }
  if (!TERMINALS.has(value.type as TerminalType)) throw protocolError(`unknown event type: ${value.type}`);
  if (value.type === 'completed' || value.type === 'partial') {
    if (!nonNegativeInt(value.successCount) || !nonNegativeInt(value.failureCount) || (value.exitCode !== 0 && value.exitCode !== 1)) throw protocolError('invalid result terminal');
  } else if (!requiredString(value.message) || ![3, 130, 124].includes(value.exitCode as number)) throw protocolError('invalid error terminal');
  return value as unknown as TerminalEvent;
}

export function parseEngineJsonl(input: string): EngineEvent[] {
  const events: EngineEvent[] = [];
  let terminalSeen = false;
  let collectionsSeen = false;
  let progressSeen = false;
  const lines = input.split(/\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  for (const raw of lines) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (line.length === 0) throw protocolError('blank line');
    let value: unknown;
    try { value = JSON.parse(line); } catch { throw protocolError('malformed JSON'); }
    const event = validateEngineEvent(value, terminalSeen);
    if (event.type === 'collections') {
      if (collectionsSeen || progressSeen) throw protocolError('duplicate or misplaced collections event');
      collectionsSeen = true;
    } else if (event.type === 'progress') {
      progressSeen = true;
    }
    if (TERMINALS.has(event.type as TerminalType)) terminalSeen = true;
    events.push(event);
  }
  if (!terminalSeen) throw protocolError('EOF before terminal');
  return events;
}

function diagnostic(message: unknown): string {
  const text = message instanceof Error ? message.message : String(message);
  return text.replace(/[\r\n]+/g, ' ').replace(/\b(cookie|cookies|xs|c_user|presence|fb_dtsg)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]').slice(0, 500);
}

function emit(event: EngineEvent): void { process.stdout.write(JSON.stringify(event) + '\n'); }

function assertCollections(collections: CollectionSummary[]): void {
  validateEngineEvent({ type: 'collections', operationId: 'validation', collections }, false);
}

export interface EngineArgs {
  command: 'list-collections' | 'download-all' | 'download-collection';
  collectionId?: string;
  cookies: string;
  outputDir: string;
  ytDlpPath: string;
  jobs: number;
  resolution: number;
  dryRun: boolean;
}

function valueAfter(args: string[], flag: string, fallback: string): string {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
export function parseEngineArgs(args: string[]): EngineArgs {
  const command = args.find((arg) => ['list-collections', 'download-all', 'download-collection'].includes(arg)) as EngineArgs['command'] | undefined;
  if (!command) throw protocolError('missing command');
  const collectionId = command === 'download-collection' ? args[args.indexOf(command) + 1] : undefined;
  if (command === 'download-collection' && !requiredString(collectionId)) throw protocolError('missing collection ID');
  const jobs = Number(valueAfter(args, '--jobs', '3'));
  const resolution = Number(valueAfter(args, '--resolution', '720'));
  if (!Number.isInteger(jobs) || jobs < 1 || !Number.isInteger(resolution) || resolution < 1) throw protocolError('jobs and resolution must be positive integers');
  return { command, collectionId, cookies: valueAfter(args, '--cookies', 'Facebook-cookies.txt'), outputDir: valueAfter(args, '--output-dir', './downloads'), ytDlpPath: valueAfter(args, '--yt-dlp-path', process.env.FB_SAVED_DLP_YT_DLP_PATH ?? 'yt-dlp'), jobs, resolution, dryRun: args.includes('--dry-run') };
}

function resultTerminal(operationId: string, result: DownloadResult): TerminalEvent {
  if (result.failed > 0) return { type: 'partial', operationId, successCount: result.downloaded, failureCount: result.failed, exitCode: 1 };
  if (!result.dryRun && result.downloaded === 0 && result.skipped === 0) return { type: 'error', operationId, message: 'nothing to download', exitCode: 3 };
  return { type: 'completed', operationId, successCount: result.downloaded, failureCount: 0, exitCode: 0 };
}

export async function runEngineJsonl(argv: string[], services: CliServices): Promise<number> {
  const operationId = randomUUID();
  const controller = new AbortController();
  let terminal = false;
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  const finish = (event: TerminalEvent): number => { if (!terminal) { terminal = true; emit(event); } return event.exitCode; };
  try {
    const parsed = parseEngineArgs(argv);
    if (!existsSync(parsed.cookies)) throw new FbSavedCliError(COOKIES_INVALID, `cookies file not found: ${parsed.cookies}`);
    if (parsed.command === 'list-collections') {
      const collections = await services.listCollections(parsed.cookies);
      assertCollections(collections);
      emit({ type: 'collections', operationId, collections });
      return finish({ type: 'completed', operationId, successCount: collections.length, failureCount: 0, exitCode: 0 });
    }
    const collections = await services.listCollections(parsed.cookies);
    assertCollections(collections);
    emit({ type: 'collections', operationId, collections });
    if (controller.signal.aborted) return finish({ type: 'cancelled', operationId, message: 'operation cancelled', exitCode: 130 });
    const options: DownloadOptions = {
      cookiesFile: parsed.cookies,
      outputDir: parsed.outputDir,
      dryRun: parsed.dryRun,
      jobs: parsed.jobs,
      ytDlpPath: parsed.ytDlpPath,
      resolution: parsed.resolution,
      signal: controller.signal,
      onProgress: (progress) => emit({ type: 'progress', operationId, ...progress }),
    };
    const resultPromise = parsed.command === 'download-collection' ? services.downloadCollection(parsed.collectionId!, options) : services.downloadAll(options);
    const result = await Promise.race([
      resultPromise,
      new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('operation cancelled')), { once: true })),
    ]);
    if (controller.signal.aborted) return finish({ type: 'cancelled', operationId, message: 'operation cancelled', exitCode: 130 });
    return finish(resultTerminal(operationId, result));
  } catch (err) {
    if (controller.signal.aborted) return finish({ type: 'cancelled', operationId, message: 'operation cancelled', exitCode: 130 });
    const code = err instanceof FbSavedCliError ? exitCodeFor(err.code) : EXIT_PARTIAL;
    return finish({ type: 'error', operationId, message: diagnostic(err), exitCode: code === EXIT_FATAL ? 3 : code === EXIT_NOTHING ? 3 : 3 });
  } finally { process.removeListener('SIGINT', cancel); }
}

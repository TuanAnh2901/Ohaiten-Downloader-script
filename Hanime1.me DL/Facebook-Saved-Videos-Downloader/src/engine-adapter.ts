import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { spawn as realSpawn, type ChildProcess } from 'node:child_process';
import { validateEngineEvent, type EngineEvent, type TerminalEvent } from './engine-jsonl.js';

const execFileAsync = promisify(execFile);
export const DEFAULT_ENGINE_TIMEOUT_MS = 120_000;
export const ENGINE_CLEANUP_TIMEOUT_MS = 5_000;

export type EngineState = 'completed' | 'partial' | 'failed' | 'timeout' | 'cancelled' | 'error' | 'missing-engine';
export type EngineOperationEvent = EngineEvent;
export interface EngineRequest {
  command: 'download-all' | 'download-collection';
  collectionId?: string;
  cookiesPath: string;
  outputDir: string;
  ytDlpPath: string;
  jobs: number;
  resolution: number;
  dryRun: boolean;
}
export interface EngineResult { operationId: string; state: EngineState; terminal: TerminalEvent; diagnostic?: string }
export interface SpawnedEngine extends ChildProcess { pid: number; stdout: NonNullable<ChildProcess['stdout']>; stderr: NonNullable<ChildProcess['stderr']> }
export interface EngineAdapterOptions {
  spawn?: (file: string, args: string[]) => SpawnedEngine;
  terminateTree?: (child: SpawnedEngine) => Promise<void>;
  timeoutMs?: number;
  onEvent?: (event: EngineOperationEvent) => void;
}

function redact(value: unknown): string {
  return String(value).replace(/[\r\n]+/g, ' ').replace(/\b(cookie|cookies|xs|c_user|presence|fb_dtsg)\s*[=:]\s*[^\s,;]+/gi, '$1=[redacted]').slice(0, 500);
}

async function killTree(child: SpawnedEngine): Promise<void> {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32' && child.pid) {
    await execFileAsync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { timeout: ENGINE_CLEANUP_TIMEOUT_MS }).catch(() => undefined);
  } else child.kill('SIGKILL');
  await new Promise<void>((resolve) => {
    if (child.exitCode !== null) return resolve();
    const timer = setTimeout(resolve, ENGINE_CLEANUP_TIMEOUT_MS);
    child.once('close', () => { clearTimeout(timer); resolve(); });
  });
}

function argsFor(request: EngineRequest): string[] {
  if (request.command === 'download-collection' && !request.collectionId) throw new Error('collectionId required');
  const args = ['--engine-jsonl', request.command];
  if (request.collectionId) args.push(request.collectionId);
  args.push('--cookies', request.cookiesPath, '--output-dir', request.outputDir, '--yt-dlp-path', request.ytDlpPath, '--jobs', String(request.jobs), '--resolution', String(request.resolution));
  if (request.dryRun) args.push('--dry-run');
  return args;
}

interface Operation {
  operationId: string;
  child?: SpawnedEngine;
  cancelRequested: boolean;
  terminal?: TerminalEvent;
  protocolError?: string;
  buffer: string;
  timedOut: boolean;
  settled: boolean;
}

export function createEngineAdapter(options: EngineAdapterOptions = {}) {
  const spawn = options.spawn ?? ((file, args) => realSpawn(file, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }) as SpawnedEngine);
  const terminateTree = options.terminateTree ?? killTree;
  const operations = new Set<Operation>();

  const emit = (operation: Operation, event: EngineOperationEvent) => {
    if (event.type === 'completed' || event.type === 'partial' || event.type === 'failed' || event.type === 'cancelled' || event.type === 'timeout' || event.type === 'error') {
      if (operation.terminal) return;
      operation.terminal = event;
      return;
    }
    options.onEvent?.(event);
  };

  const makeTerminal = (operation: Operation, state: EngineState, message: string, exitCode: 0 | 1 | 3 | 124 | 130): TerminalEvent => {
    const type = state === 'completed' || state === 'partial' ? state : state === 'missing-engine' ? 'error' : state;
    if (type === 'completed' || type === 'partial') {
      return { type, operationId: operation.operationId, successCount: state === 'completed' ? 1 : 0, failureCount: state === 'partial' ? 1 : 0, exitCode: exitCode === 1 ? 1 : 0 };
    }
    return { type, operationId: operation.operationId, message, exitCode: exitCode === 124 ? 124 : exitCode === 130 ? 130 : 3 };
  };

  const finish = (operation: Operation, state: EngineState, message: string, exitCode: 0 | 1 | 3 | 124 | 130): EngineResult => {
    const event = state === 'completed' || state === 'partial' || state === 'failed'
      ? operation.terminal ?? makeTerminal(operation, state, message, exitCode)
      : makeTerminal(operation, state, message, exitCode);
    options.onEvent?.(event);
    const resultState = state === 'missing-engine' ? state : event.type === 'partial' ? 'partial' : event.type === 'failed' ? 'failed' : event.type === 'completed' ? 'completed' : state;
    return { operationId: operation.operationId, state: resultState, terminal: event, diagnostic: message };
  };

  const parseLine = (operation: Operation, raw: string) => {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (!line) { operation.protocolError = 'engine protocol: blank line'; return; }
    try { emit(operation, validateEngineEvent(JSON.parse(line), Boolean(operation.terminal))); }
    catch (error) { operation.protocolError = redact(error); }
  };

  const cancelOperation = (operation: Operation) => {
    if (operation.settled || operation.cancelRequested) return false;
    operation.cancelRequested = true;
    if (operation.child) void terminateTree(operation.child);
    return true;
  };

  async function start(request: EngineRequest): Promise<EngineResult> {
    const operation: Operation = { operationId: `gui-${Date.now()}-${Math.random().toString(36).slice(2)}`, cancelRequested: false, buffer: '', timedOut: false, settled: false };
    operations.add(operation);
    let child: SpawnedEngine;
    try {
      child = spawn('fb-saved-dl.exe', argsFor(request));
      operation.child = child;
    } catch (error) {
      operation.settled = true;
      operations.delete(operation);
      return finish(operation, 'missing-engine', redact(error), 3);
    }

    child.stdout.setEncoding('utf8');
    child.stderr.on('data', () => undefined);
    child.stdout.on('data', (chunk: string) => {
      if (operation.settled) return;
      operation.buffer += chunk;
      const lines = operation.buffer.split('\n');
      operation.buffer = lines.pop() ?? '';
      for (const line of lines) parseLine(operation, line);
    });
    const timer = setTimeout(() => {
      if (operation.settled) return;
      operation.timedOut = true;
      void terminateTree(child);
    }, options.timeoutMs ?? DEFAULT_ENGINE_TIMEOUT_MS);

    const capture = await new Promise<{ code: number | null; error?: NodeJS.ErrnoException }>((resolve) => {
      let resolved = false;
      const resolveOnce = (value: { code: number | null; error?: NodeJS.ErrnoException }) => {
        if (resolved) return;
        resolved = true;
        resolve(value);
      };
      child.once('error', (error: NodeJS.ErrnoException) => resolveOnce({ code: null, error }));
      child.once('close', (code) => resolveOnce({ code }));
    });
    clearTimeout(timer);
    if (operation.buffer) parseLine(operation, operation.buffer);
    operation.buffer = '';
    operation.settled = true;
    operation.child = undefined;
    operations.delete(operation);
    if (operation.cancelRequested) return finish(operation, 'cancelled', 'operation cancelled', 130);
    if (operation.timedOut) return finish(operation, 'timeout', 'operation timed out', 124);
    if (capture.error?.code === 'ENOENT') return finish(operation, 'missing-engine', 'engine executable not found', 3);
    if (capture.error) return finish(operation, 'error', redact(capture.error), 3);
    if (operation.protocolError) return finish(operation, 'error', operation.protocolError, 3);
    if (!operation.terminal) return finish(operation, capture.code === 0 ? 'error' : 'failed', capture.code === 0 ? 'engine exited without terminal' : `engine exited with code ${capture.code}`, 3);
    if (operation.terminal.type === 'completed' && capture.code !== 0) return finish(operation, 'error', `engine exited with code ${capture.code}`, 3);
    return finish(operation, operation.terminal.type === 'partial' ? 'partial' : operation.terminal.type === 'failed' ? 'failed' : 'completed', '', operation.terminal.exitCode);
  }

  return {
    start,
    cancel: () => { const operation = [...operations].find((candidate) => !candidate.settled); return operation ? cancelOperation(operation) : false; },
    shutdown: async () => { await Promise.all([...operations].filter((operation) => operation.child).map((operation) => { operation.cancelRequested = true; return terminateTree(operation.child!); })); },
  };
}

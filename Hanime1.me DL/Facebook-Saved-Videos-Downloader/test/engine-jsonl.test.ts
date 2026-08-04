import { describe, expect, it, vi } from 'vitest';
import { parseEngineArgs, parseEngineJsonl, runEngineJsonl } from '../src/engine-jsonl.js';
import type { CliServices } from '../src/index.js';

function captureStdout(): { get text(): string; restore(): void } {
  const original = process.stdout.write.bind(process.stdout);
  let text = '';
  process.stdout.write = ((chunk: string | Uint8Array) => { text += String(chunk); return true; }) as typeof process.stdout.write;
  return { get text() { return text; }, restore: () => { process.stdout.write = original; } };
}

const collections = [{ id: '1', name: 'Saved Videos', count: 7 }, { id: '2', name: 'Sản phẩm', count: 0 }];
const terminal = { type: 'completed', operationId: 'op', successCount: 1, failureCount: 0, exitCode: 0 };

describe('engine JSONL parser', () => {
  it('accepts CRLF and preserves ordered events', () => {
    const events = parseEngineJsonl([
      JSON.stringify({ type: 'collections', operationId: 'op', collections }),
      JSON.stringify({ type: 'progress', operationId: 'op', collectionId: '1', videoId: 'v', completed: 0, total: 1 }),
      JSON.stringify(terminal),
    ].join('\r\n') + '\r\n');
    expect(events.map((event) => event.type)).toEqual(['collections', 'progress', 'completed']);
  });

  it.each([
    ['blank', '\n'],
    ['malformed', '{bad}\n'],
    ['unknown', JSON.stringify({ type: 'wat', operationId: 'op' }) + '\n'],
    ['missing required field', JSON.stringify({ type: 'progress', operationId: 'op', videoId: 'v', completed: 0, total: 1 }) + '\n'],
    ['invalid collection count', JSON.stringify({ type: 'collections', operationId: 'op', collections: [{ id: '1', name: 'x', count: -1 }] }) + '\n'],
    ['invalid progress count', JSON.stringify({ type: 'progress', operationId: 'op', collectionId: '1', videoId: 'v', completed: -1, total: 1 }) + '\n'],
    ['EOF without terminal', JSON.stringify({ type: 'collections', operationId: 'op', collections }) + '\n'],
    ['duplicate terminal', JSON.stringify(terminal) + '\n' + JSON.stringify(terminal) + '\n'],
    ['post-terminal event', JSON.stringify(terminal) + '\n' + JSON.stringify({ type: 'progress', operationId: 'op', collectionId: '1', videoId: 'v', completed: 1, total: 1 }) + '\n'],
    ['duplicate collections', JSON.stringify({ type: 'collections', operationId: 'op', collections }) + '\n' + JSON.stringify({ type: 'collections', operationId: 'op', collections }) + '\n' + JSON.stringify(terminal) + '\n'],
  ])('rejects %s deterministically', (_name, input) => {
    expect(() => parseEngineJsonl(input)).toThrow(/engine protocol/);
  });
});

describe('engine JSONL CLI', () => {
  it('maps machine flags and emits one terminal last', async () => {
    expect(parseEngineArgs(['download-collection', '207', '--cookies', 'C:\\cookies.txt', '--output-dir', 'out', '--yt-dlp-path', 'yt.exe', '--jobs', '2', '--resolution', '1080', '--dry-run'])).toEqual({
      command: 'download-collection', collectionId: '207', cookies: 'C:\\cookies.txt', outputDir: 'out', ytDlpPath: 'yt.exe', jobs: 2, resolution: 1080, dryRun: true,
    });
    const services: CliServices = {
      listCollections: vi.fn(async () => collections),
      downloadAll: vi.fn(async () => ({ downloaded: 1, failed: 0, skipped: 0 })),
      downloadCollection: vi.fn(async (_id, opts) => { opts.onProgress?.({ collectionId: '207', videoId: 'v', completed: 1, total: 1 }); return { downloaded: 1, failed: 0, skipped: 0 }; }),
    };
    const stdout = captureStdout();
    try {
      const code = await runEngineJsonl(['download-collection', '207', '--engine-jsonl', '--cookies', 'test/fixtures/cookies.txt'], services);
      expect(code).toBe(0);
      const lines = stdout.text.trimEnd().split('\n');
      const events = parseEngineJsonl(stdout.text);
      expect(events.map((event) => event.type)).toEqual(['collections', 'progress', 'completed']);
      expect(JSON.parse(lines[0]).operationId).toBeTypeOf('string');
      expect(stdout.text).not.toContain('COOKIE_SENTINEL_123');
      expect(services.downloadCollection).toHaveBeenCalledWith('207', expect.objectContaining({ cookiesFile: 'test/fixtures/cookies.txt', jobs: 3, resolution: 720, dryRun: false }));
    } finally { stdout.restore(); }
  });

  it('rejects missing cookie files before starting services', async () => {
    const services: CliServices = {
      listCollections: vi.fn(),
      downloadAll: vi.fn(),
      downloadCollection: vi.fn(),
    };
    const stdout = captureStdout();
    try {
      expect(await runEngineJsonl(['list-collections', '--cookies', 'missing-cookie.txt'], services)).toBe(3);
      expect(parseEngineJsonl(stdout.text).at(-1)).toMatchObject({ type: 'error', exitCode: 3, message: expect.stringContaining('cookies file not found') });
      expect(services.listCollections).not.toHaveBeenCalled();
    } finally { stdout.restore(); }
  });

  it('emits partial, sanitized error, and cancellation terminals', async () => {
    const partial: CliServices = {
      listCollections: vi.fn(async () => collections),
      downloadAll: vi.fn(async () => ({ downloaded: 2, failed: 1, skipped: 0 })),
      downloadCollection: vi.fn(),
    };
    const stdout = captureStdout();
    try {
      expect(await runEngineJsonl(['download-all', '--engine-jsonl'], partial)).toBe(1);
      expect(parseEngineJsonl(stdout.text).at(-1)).toMatchObject({ type: 'partial', successCount: 2, failureCount: 1, exitCode: 1 });
    } finally { stdout.restore(); }

    const failing: CliServices = { ...partial, downloadAll: vi.fn(async () => { throw new Error('cookie=C:\\COOKIE_SENTINEL_123.txt'); }) };
    const errorOut = captureStdout();
    try {
      expect(await runEngineJsonl(['download-all', '--engine-jsonl'], failing)).toBe(3);
      const event = parseEngineJsonl(errorOut.text).at(-1);
      expect(event).toMatchObject({ type: 'error', exitCode: 3 });
      expect(JSON.stringify(event)).not.toContain('COOKIE_SENTINEL_123');
    } finally { errorOut.restore(); }

    let release!: () => void;
    const cancelled: CliServices = { ...partial, downloadAll: vi.fn(() => new Promise(() => { release = () => undefined; })) };
    const cancelOut = captureStdout();
    try {
      const pending = runEngineJsonl(['download-all', '--engine-jsonl'], cancelled);
      await new Promise((resolve) => setImmediate(resolve));
      process.emit('SIGINT');
      expect(await pending).toBe(130);
      expect(parseEngineJsonl(cancelOut.text).at(-1)).toMatchObject({ type: 'cancelled', exitCode: 130 });
    } finally { release?.(); cancelOut.restore(); }
  });
});

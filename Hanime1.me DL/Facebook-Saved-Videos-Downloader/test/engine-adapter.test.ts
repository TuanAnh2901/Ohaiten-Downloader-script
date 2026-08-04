import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createEngineAdapter, type EngineOperationEvent } from '../src/engine-adapter.js';
import { startFixture, terminateProcessTree } from './process-harness.js';

const fixture = fileURLToPath(new URL('./fixtures/fake-engine.mjs', import.meta.url));
const live: ReturnType<typeof startFixture>[] = [];

afterEach(async () => {
  await Promise.all(live.splice(0).map((child) => terminateProcessTree(child)));
});

function adapterFor(scenario: string, options: { timeoutMs?: number; onEvent?: (event: EngineOperationEvent) => void } = {}) {
  return createEngineAdapter({
    spawn: (_file, args) => {
      const child = startFixture(fixture, scenario);
      live.push(child);
      (child as typeof child & { adapterArgs?: string[] }).adapterArgs = args;
      return child;
    },
    timeoutMs: options.timeoutMs,
    onEvent: options.onEvent,
  });
}

describe('GUI engine adapter', () => {
  it('starts one child with path/settings args and streams progress before one terminal', async () => {
    const events: EngineOperationEvent[] = [];
    const adapter = adapterFor('success', { onEvent: (event) => events.push(event) });
    const result = await adapter.start({
      command: 'download-collection', collectionId: '207833460677908', cookiesPath: 'C:\\private\\COOKIE_SENTINEL_123.txt',
      outputDir: 'D:\\downloads', ytDlpPath: 'D:\\yt-dlp.exe', jobs: 2, resolution: 720, dryRun: true,
    });
    expect(result.state).toBe('completed');
    expect(events.map((event) => event.type)).toEqual(['collections', 'progress', 'progress', 'completed']);
    expect(events.filter((event) => event.type === 'completed')).toHaveLength(1);
    const child = live[0] as typeof live[number] & { adapterArgs?: string[] };
    expect(child.adapterArgs).toEqual([
      '--engine-jsonl', 'download-collection', '207833460677908', '--cookies', 'C:\\private\\COOKIE_SENTINEL_123.txt',
      '--output-dir', 'D:\\downloads', '--yt-dlp-path', 'D:\\yt-dlp.exe', '--jobs', '2', '--resolution', '720', '--dry-run',
    ]);
    expect(JSON.stringify(events)).not.toContain('COOKIE_SENTINEL_123');
  });

  it.each([
    ['partial', 'partial'], ['failure', 'failed'], ['malformed', 'error'], ['incomplete', 'error'],
    ['post-terminal', 'error'], ['nonzero-terminal', 'error'],
  ] as const)('maps %s to %s', async (scenario, state) => {
    const result = await adapterFor(scenario).start({ command: 'download-all', cookiesPath: 'cookies.txt', outputDir: 'downloads', ytDlpPath: 'engine.exe', jobs: 3, resolution: 720, dryRun: false });
    expect(result.state).toBe(state);
  });

  it('maps missing executable separately', async () => {
    const adapter = createEngineAdapter({ spawn: () => { throw Object.assign(new Error('missing engine'), { code: 'ENOENT' }); } });
    const result = await adapter.start({ command: 'download-all', cookiesPath: 'cookies.txt', outputDir: 'downloads', ytDlpPath: 'missing.exe', jobs: 3, resolution: 720, dryRun: false });
    expect(result.state).toBe('missing-engine');
    expect(result.terminal.type).toBe('error');
  });

  it('resolves start once when child emits error then close', async () => {
    const adapter = createEngineAdapter({
      spawn: () => {
        const child = startFixture(fixture, 'failure');
        live.push(child);
        queueMicrotask(() => {
          child.emit('error', Object.assign(new Error('engine unavailable'), { code: 'EPIPE' }));
          child.emit('close', null);
        });
        return child;
      },
    });
    const result = await adapter.start({ command: 'download-all', cookiesPath: 'cookies.txt', outputDir: 'downloads', ytDlpPath: 'engine.exe', jobs: 3, resolution: 720, dryRun: false });
    expect(result.state).toBe('error');
    expect(result.terminal.type).toBe('error');
  });

  it('cancels idempotently and cleans descendants on shutdown', async () => {
    const adapter = adapterFor('ignored-termination', { timeoutMs: 5000 });
    const operation = adapter.start({ command: 'download-all', cookiesPath: 'cookies.txt', outputDir: 'downloads', ytDlpPath: 'engine.exe', jobs: 3, resolution: 720, dryRun: false });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(adapter.cancel()).toBe(true);
    expect(adapter.cancel()).toBe(false);
    expect((await operation).state).toBe('cancelled');
    await adapter.shutdown();
    expect(live[0].exitCode).not.toBeNull();
  }, 7000);

  it('maps timeout and terminates process tree within five seconds', async () => {
    const adapter = adapterFor('ignored-termination', { timeoutMs: 50 });
    const started = Date.now();
    const result = await adapter.start({ command: 'download-all', cookiesPath: 'cookies.txt', outputDir: 'downloads', ytDlpPath: 'engine.exe', jobs: 3, resolution: 720, dryRun: false });
    expect(result.state).toBe('timeout');
    expect(Date.now() - started).toBeLessThan(5000);
    await adapter.shutdown();
  }, 7000);
});

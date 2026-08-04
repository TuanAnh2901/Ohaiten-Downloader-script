import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { parseEngineJsonl } from '../src/engine-jsonl.js';
import {
  CLEANUP_TIMEOUT_MS,
  collectProcess,
  sanitizeDiagnostic,
  startFixture,
  terminateProcessTree,
} from './process-harness.js';

const fixture = fileURLToPath(new URL('./fixtures/fake-engine.mjs', import.meta.url));
const live: ReturnType<typeof startFixture>[] = [];

afterEach(async () => {
  await Promise.all(live.splice(0).map((child) => terminateProcessTree(child)));
});

async function run(scenario: string) {
  const child = startFixture(fixture, scenario);
  live.push(child);
  return collectProcess(child);
}

describe('deterministic GUI fake engine', () => {
  it('emits ordered collections, progress, and completed terminal', async () => {
    const result = await run('success');
    expect(result.exitCode).toBe(0);
    expect(parseEngineJsonl(result.stdout).map((event) => event.type)).toEqual(['collections', 'progress', 'progress', 'completed']);
  });

  it.each([
    ['partial', 1, 'partial'],
    ['failure', 3, 'failed'],
  ])('emits %s terminal with normative exit code', async (scenario, code, terminal) => {
    const result = await run(scenario);
    expect(result.exitCode).toBe(code);
    expect(parseEngineJsonl(result.stdout).at(-1)?.type).toBe(terminal);
  });

  it('emits delayed output deterministically', async () => {
    const started = Date.now();
    const result = await run('delayed');
    expect(Date.now() - started).toBeGreaterThanOrEqual(250);
    expect(parseEngineJsonl(result.stdout)).toHaveLength(4);
  });

  it('classifies malformed JSON and sanitizes diagnostics', async () => {
    const result = await run('malformed');
    expect(() => parseEngineJsonl(result.stdout)).toThrow(/malformed JSON/);
    expect(sanitizeDiagnostic(result.stderr)).toBe('cookie=[redacted]');
    expect(sanitizeDiagnostic(result.stderr)).not.toContain('synthetic-cookie-sentinel');
  });

  it('times out and kills ignored-termination descendants within five seconds', async () => {
    const child = startFixture(fixture, 'ignored-termination');
    live.push(child);
    await expect(collectProcess(child, 100)).rejects.toThrow('process timeout');
    expect(sanitizeDiagnostic('timeout cookie=C:\\synthetic-cookie-sentinel.txt')).toBe('timeout cookie=[redacted]');
    const started = Date.now();
    await terminateProcessTree(child);
    expect(Date.now() - started).toBeLessThan(CLEANUP_TIMEOUT_MS);
    expect(child.exitCode).not.toBeNull();
  }, CLEANUP_TIMEOUT_MS + 1000);
});

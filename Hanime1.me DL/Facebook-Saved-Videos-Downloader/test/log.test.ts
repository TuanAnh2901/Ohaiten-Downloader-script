import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { log, setLogFile } from '../src/log.js';

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'log-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  setLogFile('');
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('file logger', () => {
  it('appends ISO-timestamped lines to the configured file', () => {
    const dir = tempDir();
    const path = join(dir, 'engine.log');
    setLogFile(path);
    log('operation start', 'download-all');
    log('collections', '10 collections');

    const text = readFileSync(path, 'utf-8');
    const lines = text.trimEnd().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T.*\] operation start download-all$/);
    expect(lines[1]).toContain('collections 10 collections');
  });

  it('is a no-op until a log file is set', () => {
    const dir = tempDir();
    const path = join(dir, 'engine.log');
    log('nothing');
    expect(existsSync(path)).toBe(false);
  });
});

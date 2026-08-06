import { describe, expect, it, vi } from 'vitest';
import { fileURLToPath } from 'node:url';
import { run, type CliIo, type CliServices } from '../src/index.js';
import {
  AUTH_FAILED,
  EXIT_FATAL,
  EXIT_NOTHING,
  EXIT_OK,
  EXIT_PARTIAL,
  FbSavedCliError,
} from '../src/errors.js';

// Real existing fixture so the CLI's cookies-file existence check passes.
const COOKIES = fileURLToPath(new URL('./fixtures/cookies.txt', import.meta.url));

function fakeServices(): CliServices {
  return {
    listCollections: vi.fn(async () => [
      { id: '111', name: 'Alpha', count: 3 },
      { id: '222', name: 'Beta', count: 2 },
    ]),
    downloadAll: vi.fn(async () => ({ downloaded: 3, failed: 1, skipped: 0 })),
    downloadCollection: vi.fn(async () => ({ downloaded: 2, failed: 0, skipped: 0 })),
  };
}

function fakeIo(): CliIo & { confirm: ReturnType<typeof vi.fn> } {
  return { confirm: vi.fn(async () => true) };
}

function captureStream(stream: NodeJS.WriteStream): {
  text: string;
  restore: () => void;
} {
  const orig = stream.write.bind(stream);
  let output = '';
  stream.write = ((chunk: string | Uint8Array) => {
    output += String(chunk);
    return true;
  }) as typeof stream.write;
  return {
    get text() {
      return output;
    },
    restore() {
      stream.write = orig;
    },
  };
}

describe('fb-saved-dl CLI', () => {
  it('--help lists all commands', async () => {
    const stdout = captureStream(process.stdout);
    try {
      const code = await run(['node', 'fb-saved-dl', '--help'], fakeServices());
      expect(code).toBe(EXIT_OK);
      expect(stdout.text).toContain('list-collections');
      expect(stdout.text).toContain('download-collection');
      expect(stdout.text).toContain('download-all');
    } finally {
      stdout.restore();
    }
  });

  it('invalid command exits 1 with usage on stderr', async () => {
    const stderr = captureStream(process.stderr);
    try {
      const code = await run(['node', 'fb-saved-dl', 'bogus'], fakeServices());
      expect(code).toBe(EXIT_PARTIAL);
      expect(stderr.text).toContain("unknown command 'bogus'");
      expect(stderr.text).toContain('Usage:');
    } finally {
      stderr.restore();
    }
  });

  it('list-collections prints a table to stdout', async () => {
    const services = fakeServices();
    const stdout = captureStream(process.stdout);
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'list-collections', '--cookies', COOKIES],
        services,
      );
      expect(code).toBe(EXIT_OK);
      expect(services.listCollections).toHaveBeenCalledWith(COOKIES);
      expect(stdout.text).toContain('ID');
      expect(stdout.text).toContain('Alpha');
      expect(stdout.text).toContain('Beta');
      expect(stdout.text).toContain('3');
    } finally {
      stdout.restore();
    }
  });

  it('missing --cookies file exits 2 without calling services', async () => {
    const services = fakeServices();
    const stderr = captureStream(process.stderr);
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'list-collections', '--cookies', 'nope.txt'],
        services,
      );
      expect(code).toBe(EXIT_FATAL);
      expect(stderr.text).toContain('cookies file not found');
      expect(services.listCollections).not.toHaveBeenCalled();
    } finally {
      stderr.restore();
    }
  });

  it('download-all without --yes prompts (y) then proceeds', async () => {
    const services = fakeServices();
    const io = fakeIo();
    const stderr = captureStream(process.stderr);
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'download-all', '--cookies', COOKIES],
        services,
        io,
      );
      // Fake service reports 1 failed → partial
      expect(code).toBe(EXIT_PARTIAL);
      expect(io.confirm).toHaveBeenCalledOnce();
      expect(String(io.confirm.mock.calls[0][0])).toContain('Proceed?');
      expect(services.listCollections).toHaveBeenCalledWith(COOKIES, './downloads');
      expect(services.downloadAll).toHaveBeenCalledWith({
        cookiesFile: COOKIES,
        outputDir: './downloads',
        dryRun: false,
        jobs: 3,
        resolution: 720,
        ytDlpPath: 'yt-dlp',
      });
      // Confirmation summary: N collections, M videos total + per-collection counts
      expect(stderr.text).toContain('2 collections, 5 videos total');
      expect(stderr.text).toContain('[111] Alpha: 3 videos');
      expect(stderr.text).toContain('[222] Beta: 2 videos');
    } finally {
      stderr.restore();
    }
  });

  it('download-all --yes proceeds without prompting', async () => {
    const services = fakeServices();
    services.downloadAll = vi.fn(async () => ({ downloaded: 5, failed: 0, skipped: 0 }));
    const io = fakeIo();
    const stdout = captureStream(process.stdout);
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'download-all', '--cookies', COOKIES, '--yes'],
        services,
        io,
      );
      expect(code).toBe(EXIT_OK);
      expect(io.confirm).not.toHaveBeenCalled();
      expect(services.downloadAll).toHaveBeenCalledOnce();
      expect(stdout.text).toContain('[DONE] 5 downloaded, 0 failed, 0 skipped');
    } finally {
      stdout.restore();
    }
  });

  it('forwards --resolution to the download service', async () => {
    const services = fakeServices();
    const io = fakeIo();
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'download-all', '--cookies', COOKIES, '--yes', '--resolution', '1080'],
        services,
        io,
      );
      expect(code).toBe(EXIT_PARTIAL);
      expect(services.downloadAll).toHaveBeenCalledWith(expect.objectContaining({ resolution: 1080 }));
    } finally {
      // The CLI writes its result to stdout; no stream capture is needed here.
    }
  });

  it('--verbose prints the resolved config to stderr', async () => {
    const services = fakeServices();
    services.downloadAll = vi.fn(async () => ({ downloaded: 5, failed: 0, skipped: 0 }));
    const stderr = captureStream(process.stderr);
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'download-all', '--cookies', COOKIES, '--yes', '--verbose'],
        services,
        fakeIo(),
      );
      expect(code).toBe(EXIT_OK);
      expect(stderr.text).toContain('[VERBOSE]');
      expect(stderr.text).toContain(`cookies=${COOKIES}`);
      expect(stderr.text).toContain('outputDir=./downloads');
      expect(stderr.text).toContain('jobs=3');
      expect(stderr.text).toContain('ytDlpPath=yt-dlp');
      expect(stderr.text).toContain('dryRun=false');
    } finally {
      stderr.restore();
    }
  });

  it('download-all prompting no aborts with exit 0', async () => {
    const services = fakeServices();
    const io = fakeIo();
    io.confirm.mockResolvedValue(false);
    const stderr = captureStream(process.stderr);
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'download-all', '--cookies', COOKIES],
        services,
        io,
      );
      expect(code).toBe(EXIT_OK);
      expect(stderr.text).toContain('[ABORTED]');
      expect(services.downloadAll).not.toHaveBeenCalled();
    } finally {
      stderr.restore();
    }
  });

  it('download-collection --dry-run prints plan without prompting', async () => {
    const services = fakeServices();
    services.downloadCollection = vi.fn(async () => ({
      dryRun: true,
      plan: 'would download 2 videos from collection 111',
      downloaded: 0,
      failed: 0,
      skipped: 0,
    }));
    const io = fakeIo();
    const stdout = captureStream(process.stdout);
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'download-collection', '111', '--cookies', COOKIES, '--dry-run'],
        services,
        io,
      );
      expect(code).toBe(EXIT_OK);
      expect(io.confirm).not.toHaveBeenCalled();
      expect(services.downloadCollection).toHaveBeenCalledWith(
        '111',
        expect.objectContaining({ dryRun: true, cookiesFile: COOKIES }),
      );
      expect(stdout.text).toContain('would download 2 videos from collection 111');
    } finally {
      stdout.restore();
    }
  });

  it('download-collection with unknown id exits 3 (nothing to download)', async () => {
    const services = fakeServices();
    const stderr = captureStream(process.stderr);
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'download-collection', 'nope', '--cookies', COOKIES, '--yes'],
        services,
        fakeIo(),
      );
      expect(code).toBe(EXIT_NOTHING);
      expect(stderr.text).toContain('collection not found');
      expect(services.downloadCollection).not.toHaveBeenCalled();
    } finally {
      stderr.restore();
    }
  });

  it('maps service FbSavedCliError via exitCodeFor (AUTH_FAILED → 2)', async () => {
    const services = fakeServices();
    services.downloadAll = vi.fn(async () => {
      throw new FbSavedCliError(AUTH_FAILED, 'bad cookies');
    });
    const stderr = captureStream(process.stderr);
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'download-all', '--cookies', COOKIES, '--yes'],
        services,
        fakeIo(),
      );
      expect(code).toBe(EXIT_FATAL);
      expect(stderr.text).toContain('[ERROR] bad cookies');
    } finally {
      stderr.restore();
    }
  });

  it('unknown service error maps to exit 1', async () => {
    const services = fakeServices();
    services.downloadAll = vi.fn(async () => {
      throw new Error('boom');
    });
    const stderr = captureStream(process.stderr);
    try {
      const code = await run(
        ['node', 'fb-saved-dl', 'download-all', '--cookies', COOKIES, '--yes'],
        services,
        fakeIo(),
      );
      expect(code).toBe(EXIT_PARTIAL);
      expect(stderr.text).toContain('[ERROR] boom');
    } finally {
      stderr.restore();
    }
  });
});

import { describe, expect, it } from 'vitest';
import { buildFileName, sanitizeFileName } from '../src/filename.js';

describe('sanitizeFileName', () => {
  it.each([
    // illegal Windows filename chars are stripped
    ['a/b:c*d?e"f<g>h|i', 'abcdefghi'],
    // control chars stripped
    ['my\x00video\x1f.mp4', 'myvideo.mp4'],
    // trailing dots and spaces trimmed
    ['video.', 'video'],
    ['video   ', 'video'],
    // reserved device names, case-insensitive, with extension
    ['CON', '_CON'],
    ['con', '_con'],
    ['CON.txt', '_CON.txt'],
    ['prn.log', '_prn.log'],
    ['nul', '_nul'],
    ['aux.aux', '_aux.aux'],
    ['com1', '_com1'],
    ['lpt9', '_lpt9'],
    // reserved-name check must be case-insensitive but NOT strip valid words
    ['confidential.txt', 'confidential.txt'],
    ['const', 'const'],
    // 250-char title truncates to 240
    ['x'.repeat(250), 'x'.repeat(240)],
    // Unicode preserved exactly, no transliteration
    ['Để xem sau', 'Để xem sau'],
  ])('sanitizes %j -> %j', (input, expected) => {
    expect(sanitizeFileName(input)).toBe(expected);
  });
});

describe('buildFileName', () => {
  it('uses saveTimestamp verbatim, zero-padded by caller', () => {
    expect(
      buildFileName({ videoId: '123', title: 'My Video', saveTimestamp: '2026-08-03_0915' }),
    ).toBe('2026-08-03_0915_My Video.mp4');
  });

  it('omits timestamp prefix when saveTimestamp is missing (caller supplies fallback)', () => {
    expect(buildFileName({ videoId: '123', title: 'My Video' })).toBe('My Video.mp4');
  });

  it('appends videoId on collision', () => {
    const existing = new Set(['2026-08-03_0915_My Video.mp4']);
    const name = buildFileName(
      { videoId: '123456789', title: 'My Video', saveTimestamp: '2026-08-03_0915' },
      { existingNames: existing },
    );
    expect(name).toBe('2026-08-03_0915_My Video_123456789.mp4');
    // colliding name is returned but not added to the caller's set
    expect(existing.has(name)).toBe(false);
  });

  it('does not append videoId when no collision', () => {
    const existing = new Set(['other.mp4']);
    const name = buildFileName(
      { videoId: '123', title: 'My Video', saveTimestamp: '2026-08-03_0915' },
      { existingNames: existing },
    );
    expect(name).toBe('2026-08-03_0915_My Video.mp4');
    expect(existing.has(name)).toBe(false);
  });

  it('sanitizes title inside buildFileName', () => {
    expect(
      buildFileName({ videoId: '1', title: 'a/b:c*d?e"f<g>h|i' }),
    ).toBe('abcdefghi.mp4');
  });
});

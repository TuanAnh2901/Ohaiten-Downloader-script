import { describe, it, expect } from 'vitest';
import { buildYtDlpArgs } from '../src/cmd-builder.ts';

const TEST_URL = 'https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html';
const TEST_REFERER = 'https://animehay07.site/';

describe('buildYtDlpArgs', () => {
  it('should build basic args without cookie file and default concurrentFragments', () => {
    const args = buildYtDlpArgs({ url: TEST_URL, referer: TEST_REFERER });

    // Verify common flags
    expect(args).toContain('--newline');
    expect(args).toContain('--no-mtime');
    expect(args).toContain('--no-playlist');
    expect(args).toContain('--no-part');
    expect(args).toContain('--concurrent-fragments');
    expect(args).toContain('--merge-output-format');
    expect(args).toContain('mp4');
    expect(args).toContain('--remux-video');
    expect(args).toContain('-o');
    expect(args).toContain('--add-headers');
    expect(args).not.toContain('--cookies');

    // Verify concurrent-fragments is 16 by default
    const cfIndex = args.indexOf('--concurrent-fragments');
    expect(args[cfIndex + 1]).toBe('16');

    // Verify --add-headers value
    const headersIndex = args.indexOf('--add-headers');
    expect(args[headersIndex + 1]).toBe(`Referer: ${TEST_REFERER}`);

    // Verify URL is last
    expect(args[args.length - 1]).toBe(TEST_URL);

    // Verify -o comes with an outPath derived from URL
    const oIndex = args.indexOf('-o');
    expect(args[oIndex + 1]).toMatch(/quang-am-chi-ngoai-tap-28-76147/);
  });

  it('should include --cookies when cookieFile is provided', () => {
    const cookieFile = 'C:/cookies.txt';
    const args = buildYtDlpArgs({ url: TEST_URL, referer: TEST_REFERER, cookieFile });

    expect(args).toContain('--cookies');
    const cookiesIndex = args.indexOf('--cookies');
    expect(args[cookiesIndex + 1]).toBe(cookieFile);

    // Cookies should come before the URL
    expect(args.indexOf('--cookies')).toBeLessThan(args.indexOf(TEST_URL));
  });

  it('should use explicit concurrentFragments when greater than 0', () => {
    const args = buildYtDlpArgs({ url: TEST_URL, referer: TEST_REFERER, concurrentFragments: 1 });

    const cfIndex = args.indexOf('--concurrent-fragments');
    expect(args[cfIndex + 1]).toBe('1');
  });

  it('should use default concurrentFragments (16) when 0 is provided', () => {
    const args = buildYtDlpArgs({ url: TEST_URL, referer: TEST_REFERER, concurrentFragments: 0 });

    const cfIndex = args.indexOf('--concurrent-fragments');
    expect(args[cfIndex + 1]).toBe('16');
  });

  it('should use the provided referer in --add-headers', () => {
    const customReferer = 'https://custom-referer.com/';
    const args = buildYtDlpArgs({ url: TEST_URL, referer: customReferer });

    const headersIndex = args.indexOf('--add-headers');
    expect(args[headersIndex + 1]).toBe(`Referer: ${customReferer}`);
  });

  it('should throw when url is missing', () => {
    expect(() => buildYtDlpArgs({ url: '', referer: TEST_REFERER })).toThrow('url is required');
    expect(() => buildYtDlpArgs({ url: '', referer: TEST_REFERER })).toThrow();
  });
});

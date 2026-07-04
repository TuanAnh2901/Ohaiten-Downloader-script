import { describe, it, expect } from 'vitest';
import { detectUrlType } from '../src/url-detect.ts';

describe('detectUrlType', () => {
  it('should detect watch URL with /xem-phim/', () => {
    const url = 'https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html';
    expect(detectUrlType(url)).toBe('watch');
  });

  it('should detect series URL with /thong-tin-phim/', () => {
    const url = 'https://animehay07.site/thong-tin-phim/quang-am-chi-ngoai-4541.html';
    expect(detectUrlType(url)).toBe('series');
  });

  it('should detect watch URL case-insensitively with /XEM-PHIM/', () => {
    const url = 'https://animehay07.site/XEM-PHIM/quang-am-chi-ngoai-tap-28-76147.html';
    expect(detectUrlType(url)).toBe('watch');
  });

  it('should detect series URL with /thong-tin-phim/ at the start of the path', () => {
    const url = 'https://animehay07.site/thong-tin-phim/quang-am-chi-ngoai-4541.html';
    expect(detectUrlType(url)).toBe('series');
  });

  it('should return unknown for unrecognized URLs', () => {
    const url = 'https://example.com/';
    expect(detectUrlType(url)).toBe('unknown');
  });

  it('should return unknown for empty string', () => {
    expect(detectUrlType('')).toBe('unknown');
  });

  it('should detect watch URL with /xem-phim/ even without episode number', () => {
    const url = 'https://animehay07.site/xem-phim/';
    expect(detectUrlType(url)).toBe('watch');
  });

  it('should return watch when both /xem-phim/ and /thong-tin-phim/ are present (first match wins)', () => {
    const url = 'https://animehay07.site/xem-phim/something/thong-tin-phim/page.html';
    expect(detectUrlType(url)).toBe('watch');
  });
});

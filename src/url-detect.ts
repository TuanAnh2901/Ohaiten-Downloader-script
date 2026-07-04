/**
 * URL type detection for Animehay.
 * Matches URL patterns to determine if a page is a watch page or series info page.
 */

export type UrlType = 'watch' | 'series' | 'unknown';

/**
 * Detect whether a URL points to a watch page (/xem-phim/) or series info page (/thong-tin-phim/).
 * Returns 'watch' if url includes /xem-phim/ (case-insensitive),
 * 'series' if url includes /thong-tin-phim/ (case-insensitive),
 * 'unknown' otherwise.
 */
export function detectUrlType(url: string): UrlType {
  if (!url || url.length === 0) {
    return 'unknown';
  }

  if (/\/xem-phim\//i.test(url)) {
    return 'watch';
  }

  if (/\/thong-tin-phim\//i.test(url)) {
    return 'series';
  }

  return 'unknown';
}

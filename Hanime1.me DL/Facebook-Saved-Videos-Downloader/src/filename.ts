// ---------------------------------------------------------------------------
// Windows-safe filename builder
// ---------------------------------------------------------------------------

const ILLEGAL = /[\\/:*?"<>|\x00-\x1f]/g;
const TRAILING_DOT_SPACE = /[. ]+$/;
// Windows reserved device names: CON, PRN, AUX, NUL, COM1-9, LPT1-9
// (also reserved with an extension, e.g. CON.txt), matched case-insensitively.
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const MAX_BASE = 240; // 255 path limit minus extension and headroom

export function sanitizeFileName(name: string): string {
  let out = name.replace(ILLEGAL, '').replace(TRAILING_DOT_SPACE, '');
  if (RESERVED.test(out)) out = `_${out}`;
  return out.slice(0, MAX_BASE);
}

/**
 * Filename builder for saved videos.
 *
 * v1: title-only (`{title}.mp4`) — no save timestamp exists (spike B=NONE:
 * Facebook exposes no "saved at" field on saved items, only a publish_time
 * proxy; see README Notes). The publish-date fallback is DEFERRED: no caller
 * supplies saveTimestamp today and none is expected until a real save-time
 * source exists.
 *
 * `saveTimestamp` (if ever supplied) is expected pre-formatted as
 * `YYYY-MM-DD_HHmm` and used verbatim as a prefix. On collision with an
 * existing name, appends `_{videoId}` before the extension. The final name is
 * NOT added to `existingNames`; the caller owns the set and adds it.
 */
export function buildFileName(
  item: { videoId: string; title: string; saveTimestamp?: string },
  opts: { existingNames?: Set<string> } = {},
): string {
  const base = sanitizeFileName(item.title);
  const stem = item.saveTimestamp ? `${item.saveTimestamp}_${base}` : base;
  let name = `${stem}.mp4`;
  if (opts.existingNames?.has(name)) {
    name = `${stem}_${item.videoId}.mp4`;
  }
  return name;
}

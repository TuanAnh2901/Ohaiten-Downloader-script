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
 * `{SaveTimestamp}_{title}.mp4`. Sanitizes title, preserves Unicode.
 * `saveTimestamp` is expected pre-formatted as `YYYY-MM-DD_HHmm` and used
 * verbatim. If missing, the timestamp prefix is omitted — the caller (download
 * module) decides the publish-date fallback. On collision with an existing
 * name, appends `_{videoId}` before the extension. The final name is NOT added
 * to `existingNames`; the caller owns the set and adds it.
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

# Animehay Downloader

Tampermonkey userscript for downloading videos from animehay.tv and its mirrors.

## Sample URLs

| Type | Pattern |
|------|---------|
| Watch (single episode) | `https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html` |
| Series (info page) | `https://animehay07.site/thong-tin-phim/quang-am-chi-ngoai-4541.html` |

The domain changes when mirrors rotate. The resolver handles discovery.

## Domain Resolver

Animehay rotates mirrors frequently (animehay07.site, animehay05.com, etc.). The domain resolver (`src/domain.ts`) tries the trusted source `https://animehay.tv/` first, parses its HTML for mirror links, validates the top candidates by probing `/token.php`, and caches the result for 6 hours. If animehay.tv is unreachable, it falls back to the current page origin. The rest of the downloader stays host-agnostic through this resolver.

## Install and Build

```bash
npm install
npm run build
```

Load `dist/AnimehayDownloader.user.js` into Tampermonkey. The build produces a self-contained IIFE with the userscript header from `src/mata/userjs.mata`.

## Download Methods

The settings panel offers five methods:

- **browser** - Downloads via `GM_xmlhttpRequest` + blob + `<a download>`. Default method. Warns when the response exceeds the configured blob ceiling.
- **gm_download** - Uses `GM_download`. Delegates to the browser's download manager.
- **aria2** - Sends an `aria2.addUri` JSON-RPC call to the Aria2 RPC URL (default `http://127.0.0.1:6800/jsonrpc`). Supports multi-connection splits.
- **direct** - Opens the stream URL in a new tab via `GM_openInTab`. The browser handles the download natively.
- **others** - Generates a data-URI page that sets cookies and redirects to the stream URL. Useful for external download managers.

Each method falls back to `browser` on failure (except `browser` and `direct` which throw).

## AHS / HY Server Fallback

The parser extracts a `$wp_servers` map from the watch page (keys like `AHS`, `HY`). The downloader tries servers in this order:

1. User's preferred source (configurable in settings, default `AHS`)
2. The page's active server (the `.wp-svtab.active` tab)
3. Remaining servers in insertion order

It fetches each server's iframe URL, runs `staticExtract` on the iframe HTML, and returns the first viable stream.

## Static and Network Extraction

- **staticExtract** (`src/extractor.ts`) - Pure, deterministic, no network. Parses iframe HTML for JWPlayer `file`/`sources`, `<video>`/`<source>` tags, and direct `.mp4`/`.m3u8` references. Applies an ad filter (30+ ad hosts, popunder paths, non-media extensions).
- **networkExtract** (`src/extractor.ts`) - Browser/CDP-compatible fallback. Monkeys fetch/XHR, reads `performance.getEntriesByType('resource')`, and can load the source URL in a hidden iframe to read `video.currentSrc`. Supports an external capture context for Playwright bridges.

## Cookie Import

The settings panel includes a file picker for cookie import. Two formats are accepted:

- **JSON** - J2Team / Cookie-Editor style: array of `{name, value}` objects or flat `{name: value}` map.
- **Netscape TXT** - Get Cookies.txt LOCALE format: tab-separated lines, 7+ columns, name in column 5, value in column 6. Comment lines (`#`) are skipped. `#HttpOnly_` prefix is stripped and parsed as a real cookie.

The parsed cookies are stored in `customCookies` and sent as the `Cookie` header on media requests.

## Filename Template Variables

Default template: `[%number%] %title%`

| Variable | Description |
|----------|-------------|
| `%title%` | Video title (e.g. "Quang Am Chi Ngoai Tap 28") |
| `%series%` | Series/show name from breadcrumb |
| `%number%` | Zero-padded 3-digit episode number |
| `%episode_no%` | Raw episode_no from `$info_data` |
| `%movie_id%` | Numeric movie ID |
| `%episode_id%` | Numeric episode ID |
| `%download-date%` | Today's date as YYYY-MM-DD |

Output is sanitized (path separators, control chars removed) and truncated to 120 chars. `.mp4` extension appended unconditionally.

## Evidence Redaction

All live QA evidence (network logs, cookies, tokens, auth parameters) is redacted before storage. The redaction scan verifies no raw `token=`, `key=`, `auth=`, `session=`, `cf_clearance`, `__cf_bm`, or `PHPSESSID` values are committed. See `.omo/evidence/task-11-animehay-downloader-redaction-scan.txt` for verification.

## Large-File Recommendation

For streams above 1 GB, prefer **GM_download** or **aria2** over the browser blob method. The browser method warns when the response exceeds the configured `maxBrowserBlobMb` (default 1024 MB) to avoid OOM.

## Contingency Note

If both static and network extraction fail on a live site with typed evidence confirming the failure, this project does not include a hybrid CLI downloader. A CLI tool using `yt-dlp` or `ffmpeg` with the captured cookies and referer could be built as a separate project if the userscript path becomes unusable.

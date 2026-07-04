---
slug: animehay-cli
status: drafting
intent: clear
pending-action: write .omo/plans/animehay-cli.md
approach: Build a separate Node.js CLI (`animehay`) that reuses the pure parse/extract layer of the existing userscript and shells out to `yt-dlp` for actual download + HLS-to-MP4 mux. Auto-detect URL type (watch-page vs info-page). Zero browser globals in the new CLI. Userscript stays unchanged.
---

# Draft: animehay-cli

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->

| id | outcome | status | evidence path |
|---|---|---|---|
| C1. URL detection | Given any animehay URL, classify as watch-page or info-page | active | .omo/drafts/animehay-cli.md (Findings) |
| C2. Domain resolver shim | Reuse `isAnimehayHost`/`normalizeAnimehayUrl` with injectable `__setRequesterForTesting` | active | AnimehayDownloader/src/domain.ts:156-211 |
| C3. Page fetcher | Pure HTTP GET with custom Referer/Cookie header injection, replaces GM_xmlhttpRequest | active | .omo/drafts/animehay-cli.md (yt-dlp patterns) |
| C4. Watch parser | Drop-in `parseWatchPage(html)` from existing userscript | active | AnimehayDownloader/src/parser.ts:61 |
| C5. Series crawler | `collectSeriesEpisodes` for info-page → episode list | active | AnimehayDownloader/src/crawler.ts:96 |
| C6. Iframe extractor | `staticExtract` + `buildStreamUrl` to get HLS/mp4 URL | active | AnimehayDownloader/src/extractor.ts:82 |
| C7. Filename gen | `generateFilename` with config shim | active | AnimehayDownloader/src/filename.ts:58 |
| C8. yt-dlp shell | Spawn `yt-dlp.exe` with the right flags (referer, cookie, merge-output-format, remux-video, concurrent-fragments) | active | .omo/drafts/animehay-cli.md (yt-dlp) |
| C9. Progress UI | Stream yt-dlp's stdout line-by-line, parse `[download]` prefix, write TTY-friendly progress to stderr | active | .omo/drafts/animehay-cli.md (yt-dlp patterns) |
| C10. CLI binary | `bin/animehay` executable, npm package, `animehay URL [URL...]` | active | .omo/plans/animehay-cli.md (Todos) |
| C11. Config shim | In-memory shim for `GM_getValue`/`GM_setValue` so the `config` singleton loads | active | AnimehayDownloader/test/_gmShim.ts |
| C12. Test suite | Vitest tests for URL detection, parser pass-through, command builder, end-to-end CLI invocation | active | .omo/drafts/animehay-cli.md (test gaps) |

## Open assumptions (announced defaults)
<!-- Intent is CLEAR: surviving forks are user-decisions. The ones below are sensible defaults that the user can veto at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->

| assumption | adopted default | rationale | reversible? |
|---|---|---|---|
| Where the CLI lives | **separate folder** `C:\Users\VTA\Downloads\VSCode\Hanime1.me DL\AnimehayCli\` (sibling to AnimehayDownloader) | Keeps the userscript codebase untouched; CLI can be `npm publish`d independently | Yes — symlink or merge later |
| How to import userscript code | **git submodule OR relative TypeScript path alias** | Both options preserve a single source of truth. Path alias (`@animehay/core` → `../AnimehayDownloader/src`) is simpler if user wants to edit both repos together | Yes — switch to monorepo later |
| Package manager | **pnpm** | pnpm handles the cross-repo TypeScript project references better than npm; user has npm 11 only, will need pnpm install OR fallback to npm with `file:` protocol | Yes — npm works with `file:../AnimehayDownloader` |
| yt-dlp binary location | **auto-detect**: check `yt-dlp.exe` in PATH, then `%LOCALAPPDATA%\Programs\yt-dlp\yt-dlp.exe`, then user-configurable `--yt-dlp-path` | User confirmed `yt-dlp 2026.06.09` is installed; we just need to find it | Yes — user can pass `--yt-dlp-path` |
| Browser globals strategy | **shim via dependency injection, not monkey-patch of globalThis** | Per `domain.ts` test pattern (`__setRequesterForTesting`), keep the pure functions intact and only inject requester at the top of CLI entrypoint | Yes |
| What to do when `getActiveReferer` cache misses on first run | **fallback to hardcoded `https://animehay.tv/`** (existing behavior in domain.ts:38) | Matches existing fallback; tested in domain.test.ts:5 | Yes — user can pass `--referer` |
| What to do when `config.get` is called | **pre-seed `ConfigData` with sensible defaults before importing** | Avoids touching `config.ts` source code; user can override via CLI flag | Yes |
| Concurrency for series | **CLI default = 2 episodes in parallel** (yt-dlp can be called once per episode) | yt-dlp itself uses 1 concurrent fragment by default; 2 episodes at a time balances network vs. CD-rate-limit. User can override via `-j/--jobs` | Yes |
| yt-dlp flags to invoke | `--no-progress --no-mtime --concurrent-fragments 6 --merge-output-format mp4 --remux-video mp4` + custom headers | Pulls from `bg_49355915` research: HlsFD uses ThreadPoolExecutor with `concurrent_fragment_downloads`; FFmpegMergerPP remuxes; auto-remux when `requested_formats` exists. Adding `--no-progress` so we can re-parse progress from stdout | Yes — every flag is configurable |
| Whether to add the hls.ts/HLS pipeline from userscript | **no — let yt-dlp handle HLS entirely** | User explicitly said the userscript HLS path is what wastes RAM/time. yt-dlp downloads directly to disk and remuxes at end | Yes — can be added as fallback later |
| Test runner | **Vitest** | Faster than `tsx` script harness; works with TypeScript paths; matches modern stack recommendation in `.cache/opencode/.../programming/references/typescript` | Yes — `node:test` is an alternative |
| Module system | **ESM** | Node 25 supports it natively; userscript tsconfig uses `module: "ESNext"`; avoids needing CJS interop | Yes — flip to CJS if needed |
| Download directory default | **`./downloads/`** (relative to cwd) | Standard CLI convention | Yes — `--output-dir` |

## Findings (cited - path:lines)

### 1. Pure reusable code in the existing userscript (research `bg_8f932fa5`)

- `parseWatchPage(html: string): AnimehayWatchData` — `AnimehayDownloader/src/parser.ts:61` — pure, regex fallback when `DOMParser` absent
- `parseWatchPageFromDoc(doc: Document): AnimehayWatchData` — `AnimehayDownloader/src/parser.ts:73` — needs DOM shim
- `parseSeriesPage(html: string): AnimehaySeriesData` — `AnimehayDownloader/src/parser.ts:129`
- `staticExtract(iframeHtml, serverName, sourceUrl): StreamResult[]` — `AnimehayDownloader/src/extractor.ts:82` — pure
- `buildStreamUrl(preferred, servers): string` — `AnimehayDownloader/src/extractor.ts:670` — pure
- `filterAdUrls(urls: string[]): string[]` — `AnimehayDownloader/src/extractor.ts:792` — pure
- `isAnimehayHost(hostname: string): boolean` — `AnimehayDownloader/src/domain.ts:178` — pure
- `normalizeAnimehayUrl(url: string, origin?: string): string` — `AnimehayDownloader/src/domain.ts:156`
- `getCachedDomains()`, `clearDomainCache()` — `AnimehayDownloader/src/domain.ts:55,64` — in-memory in Node
- `deduplicateEpisodes(eps)` — `AnimehayDownloader/src/crawler.ts:166` — pure
- `sortEpisodesByNumber(eps)` — `AnimehayDownloader/src/crawler.ts:183` — pure
- `generateFilename(metadata, forceNumber?)` — `AnimehayDownloader/src/filename.ts:58` — needs config shim
- `formatBytes`, `shouldWarnAboutBlobSize`, `parseCookieJar`, `importCookiesFromText`, `sanitizeFilename`, `isHlsUrl`, `delay`, `uuid`, `debounce`, `throttle`, `base64Encode/Decode` — all pure, in `AnimehayDownloader/src/env.ts` and `downloader.ts`

### 2. Functions requiring I/O injection (test-only hooks already exist)

- `resolveAnimehayDomains({ currentOrigin? })` — `AnimehayDownloader/src/domain.ts:71` — injectable via `__setRequesterForTesting` (line 191)
- `collectEpisodes(htmlOrUrl)` — `AnimehayDownloader/src/crawler.ts:74` — injectable via `__setRequesterForTesting` (line 211)
- `collectSeriesEpisodes(infoPageUrl)` — `AnimehayDownloader/src/crawler.ts:96` — same hook

### 3. Functions to NOT reuse (browser-only or replaced by yt-dlp)

- `downloadHlsStream` — replaced by `yt-dlp` shell-out
- `saveHlsAsBlob`, `saveHlsStreamToDisk` — DOM-only
- `browserDownload`, `gmDownload`, `directDownload`, `othersDownload`, `download` — replaced by `yt-dlp`
- `getCookieHeader` — reads `document.cookie`; CLI uses its own cookie source (`--cookies-file`)
- `getDownloadUrl` — produces a data-URI redirect; CLI doesn't need it
- `main.ts` — not a library module

### 4. Test contract (research `bg_17e834a1`)

- Existing test suite already covers the pure layer (`parser.test.ts`, `downloader.test.ts`, `filename.test.ts`, `domain.test.ts`, `crawler.smoke.ts`, `extractor.smoke.ts`)
- 2 tests for `parseWatchPage`; 14 for downloader utilities; 7 for filename; 7 for domain; 8 for crawler; 8 for extractor — all Node-safe given the existing shim
- `test/_gmShim.ts` provides in-memory `GM_getValue`/`GM_setValue` — CLI will reuse this exact pattern
- **Gaps**: HLS pipeline, full series crawl end-to-end, `networkExtract` browser globals, actual download path, referer propagation in real download. CLI must add coverage for the new shell-out layer.

### 5. yt-dlp architecture patterns (research `bg_49355915`, commit `e584a65f`)

- **CLI argument parsing**: `yt_dlp/options.py:1186-1198` — `--user-agent`, `--referer`, `--add-headers FIELD:VALUE`. Cookie file via `--cookies file.txt` (Netscape format). Preset alias `--mp4` = `['--merge-output-format', 'mp4', '--remux-video', 'mp4', '-S', 'vcodec:h264,...']` (line 153-159).
- **HLS download flow**: `yt_dlp/downloader/hls.py:22,74` — `HlsFD(FragmentFD)`. `fragment.py:376` uses `ThreadPoolExecutor(max_workers=self.params.get('concurrent_fragment_downloads', 1))`. Default 1, but we can set 6.
- **Headers injection**: `YoutubeDL._calc_headers` (line 2684-2713) — `HTTPHeaderDict(self.params['http_headers'], info_dict.get('http_headers'))`. Cookie scoping by URL happens in `self.cookiejar.get_cookies_for_url(info_dict['url'])`. Params initialized at line 743.
- **Progress reporting**: `add_progress_hook(ph)` (line 957-959) appends to `_progress_hooks`. Hook receives dict with `status`, `downloaded_bytes`, `total_bytes`, `speed`, `eta`, `fragment_index`. Output via `to_screen()` (line 998) prints `[download] X% of Y at Z ETA T`. We re-parse these stdout lines in the CLI for our own progress UI.
- **Post-processing/merge**: `YoutubeDL.py:3483-3485` — auto-remux when `requested_formats` exists. `FFmpegMergerPP` (ffmpeg.py:822-843) does `ffmpeg -c copy -map` to merge. `--merge-output-format mp4` + `--remux-video mp4` forces target container.

### 6. URL detection rule

Animehay URL patterns (from README.md:6-9):
- Watch-page: `https://animehay07.site/xem-phim/<slug>-tap-N-<id>.html`
- Info-page (series): `https://animehay07.site/thong-tin-phim/<slug>-<id>.html`

Regex: `/xem-phim/` ⇒ watch-page, `/thong-tin-phim/` ⇒ info-page. Both go through `parseWatchPage` (for watch) or `collectSeriesEpisodes` (for info), then `staticExtract` to find stream URL.

### 7. Environment confirmed on this machine

- Node `v25.9.0` (ESM native, has `fetch`/`URL`/`Blob`/`AbortController`)
- npm `11.13.0`
- `yt-dlp.exe 2026.06.09` (path: `yt-dlp --version` resolves)
- `ffmpeg 8.1-full_build` (`ffmpeg -version` resolves)
- No `aria2c` (not needed since we shell out to yt-dlp)

## Decisions (with rationale)

1. **Separate `AnimehayCli/` folder, not in-place** — keeps the userscript untouched (still works in Tampermonkey), lets the CLI evolve independently, lets it be `npm publish`-able, lets it depend on Node-only libs (commander, vitest, etc.) without polluting the userscript.
2. **TypeScript path alias `@animehay/core` → `../AnimehayDownloader/src`** — simplest way to reuse the pure layer without copy-paste. If the user later converts the userscript to a monorepo, this is one config change.
3. **Shell out to `yt-dlp` for download + mux, never re-implement HLS** — user explicitly said the userscript HLS path wastes RAM/time. yt-dlp's HlsFD with `concurrent_fragment_downloads: 6` + `ThreadPoolExecutor` + `FFmpegMergerPP` does exactly what the user wants, on disk, in one process.
4. **CLI is a thin shim** — parsing/extract/filename is reused from userscript; CLI's only new code is URL detection, command building, process spawning, progress streaming. New code is ~200-300 lines.
5. **Zero browser globals in new code** — every browser dep is injected via the existing test hooks (`__setRequesterForTesting`) or replaced by an in-memory shim. The `config` singleton gets pre-seeded before the existing code reads from it.
6. **Auto-detect URL type at top of `animehay`** — `/xem-phim/` vs `/thong-tin-phim/` decides single-episode vs full-series path.
7. **`vitest` for tests** — modern stack, fast, works with TypeScript paths, native ESM.
8. **ESM throughout** — Node 25 supports it natively; matches userscript `tsconfig` `module: "ESNext"`.
9. **Output default: `./downloads/<sanitized-title>.mp4`** — conventional CLI layout. `--output-dir` overrides.
10. **Concurrency default: 2 episodes at a time** — yt-dlp handles per-episode fragments internally with `--concurrent-fragments 6`. This balances server load and local bandwidth.

## Scope IN

- Reuse `parser.ts`, `extractor.ts` (static only), `domain.ts` (with test hook), `crawler.ts` (with test hook), `filename.ts` (with config shim), `env.ts` utilities from the userscript via TypeScript path alias
- Auto-detect URL type (watch vs info)
- Shell out to `yt-dlp.exe` with the right flags for HLS, custom headers, cookies
- Stream yt-dlp stdout, parse `[download]` progress, print unified progress to stderr
- Per-episode concurrency (default 2) via `Promise.all` over `yt-dlp` child processes
- Config file (`./animehayrc.json` or `--config`) for default referer, cookie file, output dir, jobs
- Vitest test suite covering: URL detection, parser pass-through, command builder, progress line parser, end-to-end CLI smoke test (parse an info-page from fixture, build command, do not spawn)
- README with install + usage
- npm script `build` (esbuild bundle) + `start` (node ./dist/cli.js)
- Windows-first: `bin/animehay.cmd` for `npm install -g` workflow

## Scope OUT (Must NOT have)

- Re-implementing the HLS pipeline (that's the whole point of using yt-dlp)
- Re-implementing ffmpeg invocation (yt-dlp does it)
- Browser automation / Playwright (not needed; staticExtract covers the watch page)
- New `Config` class — reuse the existing singleton via shim
- Modifying the userscript (`AnimehayDownloader/src/*`) — CLI is additive
- Tampermonkey-specific code (GM_*, MutationObserver, history.pushState hooks) — out of scope
- `aria2c` — not installed; not needed
- Mobile-friendly CLI flags — desktop-only is fine for the user's stated use case
- GUI / TUI — plain stdout/stderr is enough; user wants `yt-dlp`-like experience
- File system write inside Tampermonkey (File System Access API) — Node CLI writes directly with `fs.createWriteStream`
- i18n / Vietnamese output — English CLI messages, matches yt-dlp convention

## Open questions

None remaining. The two real forks were resolved by the user's pre-approval:
1. Engine: `yt-dlp` (user picked)
2. URL handling: auto-detect both types (user picked)

All other choices are sensible defaults and reversible.

## Approval gate
status: awaiting-approval
<!-- Plan is fully written in .omo/plans/animehay-cli.md. Waiting for user's explicit okay to start execution. -->

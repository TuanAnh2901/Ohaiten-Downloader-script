# animehay-cli - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** A separate Windows-friendly command-line tool `animehay` that takes any animehay.tv URL and downloads it as a proper `.mp4` file. Pass one URL to grab a single episode, or pass a series URL to download the whole show. Files land in `./downloads/` by default, muxed to MP4 by `yt-dlp` and `ffmpeg` so peak RAM stays under 200 MB regardless of file size.

**Why this approach:** The existing browser userscript already does the hard part (parsing animehay pages, finding the HLS playlist, picking the best server). It just does the final download+merge in the browser tab, which is exactly what wastes your RAM and time. The CLI keeps all the parsing logic untouched and only swaps the download engine: instead of fetching every segment into JavaScript memory, it shells out to `yt-dlp`, which streams straight to disk and muxes with `ffmpeg` at the end — the same engine that powers `yt-dlp` itself. No browser, no Blob, no waiting 30 minutes for a 2 GB file to finish gzipping in memory.

**What it will NOT do:** It will not replace or modify the existing userscript — both keep working independently. It will not re-implement HLS downloading in JavaScript (that's the whole point of using `yt-dlp`). It will not ship a GUI. It is desktop-only.

**Effort:** Medium (9 implementation steps: scaffold, shim, URL+cmd, watch, series, progress, cookies, commander, build+ship)
**Risk:** Low — all heavy lifting delegated to battle-tested `yt-dlp`/`ffmpeg`; new CLI is a thin process-spawner + parser-reuser. The only nontrivial risk is cookie acquisition (handled explicitly in Todo 9).
**Decisions I made for you:**
- **Where it lives**: separate folder `AnimehayCli/` next to `AnimehayDownloader/`, not in-place. Both repos stay clean and independent. (Reversible — you can merge into a monorepo later.)
- **How the CLI imports the parsing code**: TypeScript path alias `@animehay/core` → `../AnimehayDownloader/src`. No copy-paste, no fork. The userscript stays the single source of truth. (Reversible — switch to a monorepo later.)
- **Reuse pattern**: only the pure parsing functions (`parseWatchPage`, `staticExtract`, `normalizeAnimehayUrl`, `deduplicateEpisodes`, `generateFilename`, etc.) are imported. The browser-only bits (`hls.ts`, `hlsSave.ts`, `main.ts`) are NOT touched. The `config` singleton gets pre-seeded via a 20-line in-memory shim so it loads without throwing in Node. (Reversible — replace the singleton import with a real CLI config reader if you want stricter decoupling later.)
- **Package manager**: `npm` (already installed) over `pnpm` (would require a new install). (Reversible.)
- **yt-dlp binary**: auto-detect from `PATH`, then `%LOCALAPPDATA%\Programs\yt-dlp\`, then user-overridable via `--yt-dlp-path`. (Reversible.)
- **Test runner**: `Vitest` (modern, fast, native ESM). (Reversible — could swap to `node:test` later.)
- **Module system**: ESM (matches userscript's `tsconfig`, Node 25 supports natively). (Reversible — flip to CJS if you hit a blocker.)
- **Concurrency**: 2 episodes at a time, 6 concurrent HLS fragments per episode. Total = 12 in-flight HTTP requests. Configurable via `--jobs` and `--concurrent-fragments`. (Reversible.)
- **What gets downloaded**: `.mp4` muxed by `ffmpeg` via yt-dlp's `--merge-output-format mp4 --remux-video mp4`. You wanted no in-memory muxer, so we don't do one. (Reversible — can add `--keep-ts` flag later if you want to debug.)
- **Cookie acquisition**: `animehay cookies export <browser> <outPath>` sub-command shells out to `yt-dlp --cookies-from-browser` to dump a Netscape-format cookies file. Animehay (and most anime mirrors) blocks unauthenticated requests with 403/503, so a working `cf_clearance`/`PHPSESSID` cookie is required for the CLI to work end-to-end. The plan also documents a manual DevTools procedure as a fallback. (Reversible — could swap to `puppeteer` or `playwright` later, but those are heavyweight deps for a thin CLI.)

Your next move: Approve to start the build, or run a high-accuracy Momus review on the plan first.

---

> TL;DR (machine): Medium effort, Low risk — 9-step plan to build a `yt-dlp`-shell CLI that reuses the userscript's pure parse/extract layer via TypeScript path alias, with Vitest test suite, dry-run mode, cookie-acquisition sub-command, and Windows `.cmd` shim. Scope + import linters enforce "don't touch the userscript" and "no ffmpeg/chalk imports."

## Scope
### Must have
- Reuse `parser.ts`, `extractor.ts` (static only), `domain.ts` (with test hook), `crawler.ts` (with test hook), `filename.ts` (with config shim), `env.ts` utilities from the existing userscript via TypeScript path alias `@animehay/core`
- Auto-detect URL type: `/xem-phim/` (single episode) vs `/thong-tin-phim/` (whole series)
- Episode range selection for series: `--from <N>` and `--to <N>` flags filter episodes by number (e.g., `--from 25 --to 28` downloads only episodes 25-28). If one flag is set and the other is unset, range is open-ended (`--from 25` = episodes 25..N; `--to 10` = episodes 1..10). Both flags optional, default = all episodes.
- Shell out to `yt-dlp.exe` with `--concurrent-fragments 6 --merge-output-format mp4 --remux-video mp4 --add-headers "Referer: <animehay>"` (verified flag names from `yt-dlp --help`)
- Stream `yt-dlp`'s stdout line-by-line, parse `[download] N%` lines, print unified progress to stderr
- Per-episode concurrency (default 2) via `Promise.all` over `yt-dlp` child processes
- Config file `./animehayrc.json` for default referer, cookie file, output dir, jobs
- Cookie-acquisition sub-command `animehay cookies export <browser> <outPath>` shelling out to `yt-dlp --cookies-from-browser` (Todo 9)
- yt-dlp preflight check at startup (fails fast if binary not found)
- Vitest test suite covering: URL detection (8 cases), parser pass-through (uses existing fixture), command builder (6 cases), progress line parser (8 cases), cookies sub-command (5 cases), end-to-end CLI smoke test (dry-run, no network)
- README with install (`npm install -g .`), usage, all flags, troubleshooting, "Getting cookies" section
- `bin/animehay` + `bin/animehay.cmd` shims for `npm install -g` workflow
- `scripts/check-scope.mjs` (fails if `AnimehayDownloader/` modified) wired as `prepublishOnly` + `verify-scope`
- `scripts/check-imports.mjs` (fails if `chalk`/`picocolors`/`ffmpeg-static`/`@ffmpeg-installer/ffmpeg` imported)
- Errors printed as `[ERROR] <code>: <message>` to stderr, exit 1

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Re-implement the HLS pipeline in JavaScript (the whole point of using `yt-dlp` is to avoid that)
- Re-implement `ffmpeg` invocation (yt-dlp does it)
- Modify any file in `AnimehayDownloader/src/` (the CLI is additive only — enforced by `scripts/check-scope.mjs`)
- Browser automation / Playwright (not needed; `staticExtract` covers the watch page)
- Mobile-friendly CLI flags
- GUI / TUI (plain stdout/stderr matches `yt-dlp` convention)
- Tampermonkey-specific code (`GM_*`, `MutationObserver`, `history.pushState` hooks)
- `aria2c` (not installed; not needed because we use `yt-dlp`)
- File System Access API (Node CLI writes with `fs.createWriteStream`)
- i18n / Vietnamese output
- New `Config` class (reuse the existing singleton via shim)
- Color libraries (`chalk`, `picocolors`) — plain ANSI only

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: **TDD** (red→green) where new code is added; **tests-after** for re-used code where existing tests cover the contract
- Framework: `Vitest` (native ESM, fast)
- Coverage: 8 todos × happy + failure = ~16-20 test cases minimum
- Smoke: `npm run build && npx vitest run && node ./dist/index.js --help` must all pass with zero network access (use `--dry-run`)
- End-to-end: not in CI (requires live internet + working yt-dlp binary); user runs once manually to confirm
- Evidence: `.omo/evidence/task-<N>-animehay-cli.txt` (one per todo)

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.

- **Wave 1 (foundation)**: todos 1, 2, 3 — scaffold, shim, URL detection + command builder. No external calls yet, all unit-testable.
- **Wave 2 (download engine)**: todos 4, 5, 6, 9 — watch path, series path, progress parser, cookie acquisition. Reuses userscript pure layer; mock `child_process.spawn` in tests. Cookie acquisition is grouped here because the same mocking pattern (fake child_process for the verification step) applies.
- **Wave 3 (entry + ship)**: todos 7, 8 — `commander` entry (imports cookies module from Todo 9 + watch/series modules from Todos 4-5), build/smoke-test/README. (2 todos — this is the "ship" wave; the Final verification wave F1-F4 runs in parallel after.)

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 (scaffold) | nothing | 2,3,4,5,6,7,8,9 | nothing (must run first) |
| 2 (shim) | 1 | 3,4,5 | 1, 3 |
| 3 (URL+cmd) | 1 | 4,5,6,7,8,9 | 1, 2 |
| 4 (watch path) | 2,3 | 5,7 | 5, 6, 9 |
| 5 (series path) | 2,3 | 7 | 4, 6, 9 |
| 6 (progress) | 3 | 7,8 | 4, 5, 9 |
| 9 (cookies) | 1,3 | 7,8 | 4, 5, 6 |
| 7 (commander) | 2,3,4,5,6,9 | 8 | nothing (must precede 8) |
| 8 (build+ship) | 7,9 | Final verification | nothing |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [x] 1. Scaffold `AnimehayCli/` workspace (package.json, tsconfig, src/, test/, bin/)
  What to do / Must NOT do: Create `C:\Users\VTA\Downloads\VSCode\Hanime1.me DL\AnimehayCli\` with: `package.json` (name `@animehay/cli`, type `module`, scripts `build`/`start`/`test`, deps: `commander`, `vitest`, devDeps: `typescript`, `tsx`, `esbuild`, `@types/node`); `tsconfig.json` (target ES2022, module NodeNext, paths `@animehay/core` → `../AnimehayDownloader/src`); `bin/animehay.js` and `bin/animehay.cmd` shim; empty `src/index.ts` and `test/smoke.test.ts`. MUST NOT touch `AnimehayDownloader/` files. Also add an `AnimehayCli/scripts/check-scope.mjs` script that runs `git diff --name-only AnimehayDownloader/src AnimehayDownloader/test AnimehayDownloader/package.json AnimehayDownloader/tsconfig.json AnimehayDownloader/build` from the parent directory and exits 1 if any file changed — wire it as a `prepublishOnly` script AND as a `verify-scope` npm script that `npm run verify-scope` runs. Also add `AnimehayCli/.eslintrc.json` extending `eslint:recommended` with `no-restricted-imports: [{ paths: [{ name: 'chalk' }, { name: 'picocolors' }, { name: 'ffmpeg-static' }, { name: '@ffmpeg-installer/ffmpeg' }], message: 'No color libs or ffmpeg wrappers; use plain ANSI and shell out to yt-dlp.' }]`. (Eslint is added as devDep; if a heavier alternative is preferred, substitute with a `scripts/check-imports.mjs` that greps the source for `from ['"]chalk|picocolors|ffmpeg-static|@ffmpeg-installer/ffmpeg['"]`.)
  Parallelization: Wave 1 | Blocked by: nothing | Blocks: 2,3,4,5,6,7,8
  References: AnimehayDownloader/package.json:1-13, AnimehayDownloader/tsconfig.json:1-18
  Acceptance criteria: `cd AnimehayCli && npm install && npx vitest run --passWithNoTests` exits 0; `node -e "import('./bin/animehay.js').then(m => console.log(typeof m))"` prints `function`; `AnimehayCli/src/index.ts` is empty; `node scripts/check-scope.mjs` exits 0 when `AnimehayDownloader/` is unchanged; `node scripts/check-imports.mjs` exits 0 on the empty starter.
  QA scenarios: happy — `npx vitest run` returns success; failure — `npx tsc --noEmit` fails if tsconfig is wrong; failure — `scripts/check-scope.mjs` exits 1 if any userscript file is touched; failure — `scripts/check-imports.mjs` exits 1 if `chalk`/`picocolors`/`ffmpeg-static` is imported; Evidence .omo/evidence/task-1-animehay-cli.txt
  Commit: Y | chore(cli): scaffold animehay-cli workspace with scope + import linters

- [x] 2. Wire TypeScript path alias `@animehay/core` and write the GM shim
  What to do / Must NOT do: Add `AnimehayCli/src/core-shim.ts` exporting `installGmShim()` that pre-seeds a `Map`-backed `GM_getValue`/`GM_setValue` on `globalThis` (mirror the pattern in `AnimehayDownloader/test/_gmShim.ts:26-30`), and `installRequesterShim(requester)` that wires a `fetch`-based requester into `domain.ts` (test-only handle at `domain.ts:47-49` — `__setRequesterForTesting`) and `crawler.ts` (same hook at `crawler.ts:211`). Then `import { config } from '@animehay/core/config'` must succeed without throwing. Pre-seed `ConfigData` defaults including `filenameTemplate: '[%number%] %title%'`, `preferredSource: 'AHS'`, `hlsSaveMode: 'blob'` BEFORE any other module imports the `config` singleton. Add a test that imports the shim and asserts `config.get('preferredSource') === 'AHS'`, `config.get('filenameTemplate') === '[%number%] %title%'`, `config.get('hlsSaveMode') === 'blob'`. MUST NOT modify the userscript `config.ts` or `domain.ts`.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 3,4,5
  References: AnimehayDownloader/src/config.ts:39-94, AnimehayDownloader/src/domain.ts:47-49 (`__setRequesterForTesting`), AnimehayDownloader/src/crawler.ts:211 (same hook), AnimehayDownloader/test/_gmShim.ts:26-30 (Map-backed pattern)
  Acceptance criteria: `npx vitest run test/core-shim.test.ts` passes; `node -e "import('./dist/core-shim.js').then(m => m.installGmShim()).then(() => import('@animehay/core/config').then(m => console.log(m.config.get('preferredSource'), m.config.get('filenameTemplate'), m.config.get('hlsSaveMode'))))"` prints `AHS [%number%] %title% blob`.
  QA scenarios: happy — shim allows config import and all three keys return expected defaults; failure — removing shim causes `config` import to throw `GM_getValue is not defined`; Evidence .omo/evidence/task-2-animehay-cli.txt
  Commit: Y | feat(cli): install GM and requester shims for core reuse

- [x] 3. Implement URL detection (C1) + command builder (C8 prelude)
  What to do / Must NOT do: Create `AnimehayCli/src/url-detect.ts` exporting `detectUrlType(url: string): 'watch' | 'series' | 'unknown'` using regex `/xem-phim/` and `/thong-tin-phim/` (see AnimehayDownloader/README.md:7-10 for canonical patterns). Create `AnimehayCli/src/cmd-builder.ts` exporting `buildYtDlpArgs(opts: { url: string; referer: string; cookieFile: string | null; outPath: string; concurrentFragments: number }): string[]` returning exactly `['--no-progress', '--no-mtime', '--no-playlist', '--no-part', '--concurrent-fragments', '6', '--merge-output-format', 'mp4', '--remux-video', 'mp4', '-o', outPath, '--add-headers', `Referer: ${opts.referer}`, ...]` plus optional `--add-headers` for cookie string and `--cookies <file>`. NOTE: `--add-headers` is plural (verified `yt-dlp --help`); `--referer` and `--user-agent` are NOT standalone flags in yt-dlp 2026.06.09 and must be passed via `--add-headers`. `--concurrent-fragments` implies `--no-continue` automatically, so do NOT add `--no-continue` explicitly (we want resumability on re-run). Write `test/url-detect.test.ts` (8 cases: 3 watch, 3 series, 2 negative) and `test/cmd-builder.test.ts` (6 cases: with/without cookie file, with cookie inline, with custom referer, with concurrent=1, with concurrent=0 → default 6, validation of exact arg shape). MUST NOT shell out — pure unit test of the function.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 4,5,6,7,8,9
  References: AnimehayDownloader/README.md:7-10, `yt-dlp --help 2>&1 | Select-String` (verified: --add-headers plural, --referer/--user-agent absent, --concurrent-fragments N, --merge-output-format FORMAT, --remux-video FORMAT, --no-progress, --no-mtime, --no-part, --cookies FILE)
  Acceptance criteria: `npx vitest run test/url-detect.test.ts test/cmd-builder.test.ts` passes; `node -e "import('./dist/cmd-builder.js').then(m => console.log(m.buildYtDlpArgs({url:'https://x/y.m3u8',referer:'https://animehay.tv/',cookieFile:null,outPath:'./out.mp4',concurrentFragments:6})))"` prints array containing `--add-headers Referer: https://animehay.tv/` and `--concurrent-fragments 6` and `--merge-output-format mp4`, NOT containing `--add-header`, `--referer`, `--user-agent`, or `--no-continue`.
  QA scenarios: happy — detection + builder; failure — empty URL returns 'unknown' and builder throws on missing url; Evidence .omo/evidence/task-3-animehay-cli.txt
  Commit: Y | feat(cli): URL detection and yt-dlp command builder

- [x] 4. Implement watch-page download path (single episode)
  What to do / Must NOT do: Create `AnimehayCli/src/watch.ts` exporting `async function downloadWatchPage(url: string, opts: { referer: string; cookieFile: string | null; outPath: string; ytDlpPath: string }): Promise<{ outPath: string; bytes: number }>`. Flow: (a) `fetch(url, { headers: { Referer: opts.referer, ...(await cookieHeader(opts.cookieFile)) } })` to get the watch-page HTML; (b) `parseWatchPage(html)` from `@animehay/core/parser` to extract `data.serverMap` (Record<string,string>) and `data.activeServer`; (c) `buildStreamUrl(data.activeServer, data.serverMap)` from `@animehay/core/extractor` (line 670) to get the iframe URL for the preferred server; (d) `fetch(iframeUrl, ...)` to get the iframe body, then `staticExtract(iframeHtml, activeServer, iframeUrl)` from `@animehay/core/extractor` (line 82) to get a `StreamResult` list; (e) pick the first non-empty stream URL (prefers m3u8 over mp4 if both present, since yt-dlp remux is reliable on m3u8); (f) `spawn(opts.ytDlpPath, buildYtDlpArgs({url: streamUrl, referer: opts.referer, cookieFile: opts.cookieFile, outPath: opts.outPath, concurrentFragments: 6}), { stdio: ['ignore', 'pipe', 'pipe'] })` and await exit 0; (g) `fs.stat(opts.outPath)` for size, return `{ outPath, bytes: stat.size }`. Write `test/watch.test.ts` that uses the existing `AnimehayDownloader/test/fixtures/watch-page.html` to assert the parse + extract path returns at least one stream URL; mock `child_process.spawn` so the test does NOT spawn yt-dlp. MUST NOT implement HLS in JS; MUST NOT call `spawn('ffmpeg', ...)` directly; MUST NOT modify the userscript's `parser.ts` or `extractor.ts`.
  Parallelization: Wave 2 | Blocked by: 2,3 | Blocks: 5,7
  References: AnimehayDownloader/src/parser.ts:26-40, 61, AnimehayDownloader/src/extractor.ts:32-38, 82-132, 666-678, AnimehayDownloader/test/fixtures/watch-page.html
  Acceptance criteria: `npx vitest run test/watch.test.ts` passes (mocked spawn); `node -e "import('./dist/watch.js').then(m => m.downloadWatchPage('https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html', { referer: 'https://animehay.tv/', cookieFile: null, outPath: './out.mp4', ytDlpPath: 'yt-dlp' }))"` is callable and would spawn (not asserted in CI).
  QA scenarios: happy — fixture page parses to ≥1 stream URL; failure — server returns 503 throws `AnimehayCliError` code `http_error`; failure — all servers return empty iframe throws `AnimehayCliError` code `no_stream`; Evidence .omo/evidence/task-4-animehay-cli.txt
  Commit: Y | feat(cli): watch-page single episode path

- [x] 5. Implement series crawl + bulk download path
  What to do / Must NOT do: Create `AnimehayCli/src/series.ts` exporting `async function downloadSeries(infoPageUrl: string, opts: { referer: string; cookieFile: string | null; outDir: string; jobs: number; ytDlpPath: string; from?: number; to?: number; onEpisodeStart: (ep) => void; onEpisodeDone: (ep, result) => void }): Promise<{ ok: number; failed: number }>`. Flow: (a) `fetch(infoPageUrl)` → HTML; (b) `collectSeriesEpisodes(infoPageUrl)` via the existing test hook so the requester is our fetch; (c) `deduplicateEpisodes` + `sortEpisodesByNumber` from `@animehay/core/crawler`; (d) **filter by `opts.from`/`opts.to`**: if `from` is set, drop episodes with number < `from`; if `to` is set, drop episodes with number > `to`. Both optional, no filter = all episodes; (e) `Promise.all` over a sliding window of `opts.jobs` (default 2) episodes, each calling `downloadWatchPage`; (f) aggregate counts, emit `onEpisodeStart`/`onEpisodeDone` for each. Write `test/series.test.ts` that uses the existing `AnimehayDownloader/test/fixtures/watch-page.html` as the resolved watch page (the info-page HTML can be a synthetic 28-link list) to assert dedup + sort + range filter (`from=25,to=28` should yield 4 episodes) + concurrency cap. MUST NOT mutate the existing crawler test contract.
  Parallelization: Wave 2 | Blocked by: 2,3 | Blocks: 7
  References: AnimehayDownloader/src/crawler.ts:74,96,166,183, AnimehayDownloader/test/crawler.smoke.ts
  Acceptance criteria: `npx vitest run test/series.test.ts` passes; `node -e "import('./dist/series.js').then(m => m.downloadSeries(...))"` callable; concurrency cap verified by counting max in-flight fetches in a test.
  QA scenarios: happy — 28 episodes resolved, 2 in flight at a time; failure — info page 404 throws `CrawlerError` code `http_error`; Evidence .omo/evidence/task-5-animehay-cli.txt
  Commit: Y | feat(cli): series bulk download path

- [x] 6. Implement progress parser (C9) and process supervisor
  What to do / Must NOT do: Create `AnimehayCli/src/progress.ts` exporting `parseYtDlpLine(line: string): { pct: number; speed: number; eta: number; totalBytes: number; downloadedBytes: number } | null` using regex matching `[download]  N.N% of ~X.YZiB at Z.YZETA T  ETA mm:ss` (units `B/KiB/MiB/GiB/TiB`, time `mm:ss` or `h:mm:ss`).   Also export `runWithProgress(child: ChildProcess, onProgress: (p) => void, throttleMs = 100): Promise<{ code: number; stderr: string }>` which reads stdout line-by-line, strips ANSI escapes via `/\x1b\[[0-9;]*m/g`, parses via `parseYtDlpLine`, throttles `onProgress` calls to at most one per `throttleMs` via a `setTimeout`-based leading+trailing throttle (preserves the last value, NOT `requestAnimationFrame` — Node has no rAF, and NOT a debounce which would drop intermediate values), and resolves on exit. Write `test/progress.test.ts` with 8 fixture lines: start, 50%, 100%, fractional `0.5%`, error fragment `[ExtractURL] ...`, no-progress line `[generic] ...`, malformed, and a line containing ANSI escapes. MUST NOT use `chalk`/`picocolors`/any color lib (enforced by `scripts/check-imports.mjs` from Todo 1).
  Parallelization: Wave 2 | Blocked by: 3 | Blocks: 7,8
  References: yt-dlp/YoutubeDL.py:393-426 (research bg_49355915)
  Acceptance criteria: `npx vitest run test/progress.test.ts` passes; `node -e "import('./dist/progress.js').then(m => console.log(m.parseYtDlpLine('[download]  50.0% of 100.00MiB at 5.00MiB/s ETA 00:10')))"` returns `{ pct: 50, speed: 5_242_880, eta: 10, ... }`; `parseYtDlpLine('\x1b[2K[download]  100% of 1.00GiB')` returns `{ pct: 100, speed: 0, eta: 0, totalBytes: 1_073_741_824, downloadedBytes: 1_073_741_824 }`.
  QA scenarios: happy — 8 fixture lines parse; failure — malformed line returns null (not throws); failure — `runWithProgress` on a child that exits non-zero resolves with `{ code: 1, stderr: ... }` rather than throwing; Evidence .omo/evidence/task-6-animehay-cli.txt
  Commit: Y | feat(cli): yt-dlp progress parser and process supervisor

- [x] 7. Build CLI entry point with `commander`
  What to do / Must NOT do: Create `AnimehayCli/src/index.ts` that wires `commander`: `animehay <url> [url...]` with options `--referer <url>` (the Referer header for the watch page AND for the iframe fetch; this is a known-good value the user provides, e.g. `https://animehay07.site/`), `--cookies <file>` (Netscape-format cookie file), `--output-dir <dir>` (default `./downloads/`), `--yt-dlp-path <path>` (default `where yt-dlp` resolution), `--jobs <n>` (default 2), `--concurrent-fragments <n>` (default 6, passed to yt-dlp's `-N` flag), `--from <number>` (for series: first episode number to download, inclusive), `--to <number>` (for series: last episode number to download, inclusive), `--dry-run` (print the command that would be run, do not execute), `--verbose`. NO `--user-agent` CLI flag — user-agent is set via the cookie file's UA, or omitted. Auto-detect URL type and dispatch to `downloadWatchPage` or `downloadSeries` (passing `from`/`to` options when present). Print final summary to stdout: `Done: 28/28 in 12m 34s (1.2 GB)`. Errors: print `[ERROR] <code>: <message>` to stderr with exit code 1. Wire `process.on('unhandledRejection')` and `process.on('uncaughtException')` to print a friendly error and exit 1. On startup, run a preflight `preflightCheck()` that calls `spawnSync(ytDlpPath, ['--version'])` and exits with `[ERROR] yt-dlp not found: <path>` if it fails — saves the user from a half-finished download. Write `test/cli.test.ts` using `commander`'s `parse` directly to assert option routing (including --from, --to). MUST NOT use chalk/picocolors — plain ANSI only (enforced by `scripts/check-imports.mjs` from Todo 1).
  Parallelization: Wave 3 | Blocked by: 2,3,4,5,6,9 | Blocks: 8
  References: yt-dlp/options.py:153-159, AnimehayDownloader/README.md (README pattern), Commander v12 docs
  Acceptance criteria: `npx vitest run test/cli.test.ts` passes; `node ./dist/index.js --help` prints the help text without throwing; `node ./dist/index.js --dry-run https://animehay07.site/xem-phim/test.html` prints the yt-dlp command and exits 0; running without yt-dlp in PATH prints `[ERROR] yt-dlp not found: <path>` to stderr and exits 1.
  QA scenarios: happy — dry-run prints expected args; failure — invalid URL prints error and exits 1; failure — yt-dlp not found preflight fails fast; Evidence .omo/evidence/task-7-animehay-cli.txt
  Commit: Y | feat(cli): commander entry point with dry-run and preflight

- [x] 8. Build, smoke-test end-to-end, and write README
  What to do / Must NOT do: (a) Add `AnimehayCli/build.mjs` that uses `esbuild` to bundle `src/index.ts` → `dist/index.js` (single-file CJS, with `--banner:js='#!usr/bin/env node'` to make it executable). (b) Add `bin/animehay` and `bin/animehay.cmd` shim that calls `node ../dist/index.js "$@"`. (c) `npm run build` must produce a working binary. (d) Write `AnimehayCli/README.md` with: install (`npm install -g .`), usage (`animehay <url>`), all flags, troubleshooting, why yt-dlp is required, how to get it (`winget install yt-dlp` or `scoop install yt-dlp`), a "Getting cookies" subsection linking to Todo 9's sub-command and DevTools manual procedure. (e) Smoke test: `node ./dist/index.js --dry-run https://animehay07.site/xem-phim/test.html` and assert exit 0. (f) `npx vitest run` from `AnimehayCli/` must pass all tests with no skips. (g) `npm pack --dry-run` must produce a sensible package. (h) `node AnimehayCli/scripts/check-scope.mjs` must exit 0 (verifies `AnimehayDownloader/` is unchanged).
  Parallelization: Wave 3 | Blocked by: 7,9 | Blocks: Final verification
  References: AnimehayDownloader/build/build.ts, AnimehayDownloader/package.json
  Acceptance criteria: `cd AnimehayCli && npm run build && npx vitest run && node ./dist/index.js --help && node AnimehayCli/scripts/check-scope.mjs` all succeed; `npm pack --dry-run` lists `dist/index.js` and `bin/*` in tarball; `type AnimehayCli/bin/animehay.cmd` shows the shim content.
  QA scenarios: happy — full build + tests + help + scope check; failure — missing esbuild dep causes build fail; failure — accidental userscript edit causes scope check fail; Evidence .omo/evidence/task-8-animehay-cli.txt
  Commit: Y | release(cli): first usable build with README

- [x] 9. Add cookie-acquisition sub-tool (closes the highest-leverage gap: site blocks 403 without valid cookies)
  What to do / Must NOT do: Create `AnimehayCli/src/cookies.ts` exporting `async function exportCookiesFromBrowser(browser: 'chrome' | 'firefox' | 'edge' | 'brave' | 'opera' | 'chromium', outPath: string): Promise<{ ok: true; bytes: number } | { ok: false; reason: 'unsupported' | 'error'; detail: string }>`. Implementation: shell out to `yt-dlp --cookies-from-browser <browser> --cookies <outPath> --no-download 'https://animehay.tv/'` (yt-dlp 2026.06.09 has full `--cookies-from-browser` support, verified in `yt-dlp --help`; `https://animehay.tv/` is a benign probe URL that exercises cookie acquisition without downloading content) and verify the output file is non-empty + starts with `# Netscape HTTP Cookie File`. This avoids bundling a browser-automation library. Also add `animehay cookies export <browser> <outPath>` sub-command to `AnimehayCli/src/index.ts` (Todo 7). Write `test/cookies.test.ts` with 6 cases: `chrome` (mocked spawn writes a synthetic `# Netscape HTTP Cookie File\n` blob to `outPath`; asserts verification passes), `firefox`, `edge`, `brave`, invalid browser name (rejects before spawn), file-not-written (yt-dlp exit non-zero). The mock-spawn pattern in `cookies.test.ts` must use a stub that, when invoked, writes the synthetic cookie blob to the requested `outPath` before calling its own `onclose(0)` — so the verification path in `exportCookiesFromBrowser` is exercised by the test. The "Getting cookies" subsection in README (Todo 8) must document BOTH the sub-command AND a manual DevTools procedure (Application → Cookies → copy as Netscape → save to file). MUST NOT require the user to install Python or any non-Node tool beyond yt-dlp. MUST NOT add dependencies like `puppeteer` or `playwright`.
  Parallelization: Wave 2 | Blocked by: 1,3 | Blocks: 7,8
  References: `yt-dlp --help` (verified `--cookies-from-browser BROWSER[+KEYRING][:PROFILE][::CONTAINER]`); see also `AnimehayDownloader/src/downloader.ts:342-345` for the existing `importCookiesFromText` parser that the CLI will reuse once the file is written.
  Acceptance criteria: `npx vitest run test/cookies.test.ts` passes; `node ./dist/index.js cookies --help` prints the sub-command help; the sub-command is registered before the main URL command (commander parse-order test); README "Getting cookies" section has a copy-paste DevTools procedure AND references `animehay cookies export`.
  QA scenarios: happy — `chrome` arg spawns yt-dlp and writes a non-empty cookies file; failure — invalid browser rejected; failure — yt-dlp exit non-zero returns `{ ok: false, reason: 'error', detail: stderr }`; Evidence .omo/evidence/task-9-animehay-cli.txt
  Commit: Y | feat(cli): cookie acquisition via yt-dlp --cookies-from-browser

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit — all 9 todos completed
- [x] F2. Code quality review — 48 tests pass, LSP clean, scope/import checks pass
- [x] F3. Real manual QA — `--help` works, `--dry-run` works, binary produces output
- [x] F4. Scope fidelity — no AnimehayDownloader/ files touched

## Commit strategy

- 9 commits, one per todo, using Conventional Commits (`chore`/`feat`/`release`)
- Each commit is independently buildable and testable
- Final commit is the tagged release `v0.1.0`

## Success criteria

- `animehay <url>` downloads any animehay watch-page or info-page as a single `.mp4` per episode
- Output is muxed by yt-dlp, no in-memory Blob, peak RAM < 200 MB regardless of file size
- All parsing logic reuses the userscript's pure layer via `@animehay/core` path alias
- All tests pass; build succeeds; `--dry-run` works without an internet connection
- README explains installation and flags; `bin/animehay.cmd` works from any directory on Windows
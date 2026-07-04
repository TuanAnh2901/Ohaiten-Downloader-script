# PROJECT KNOWLEDGE BASE

**Generated:** 2026-07-02
**Branch:** main
**Commit:** no HEAD in this workspace

## OVERVIEW

AnimehayCli is a TypeScript/Node CLI for animehay.tv that wraps the sibling `../AnimehayDownloader/src` userscript core via `@animehay/core` aliases, then delegates actual downloads to `yt-dlp`. Distribution is unusual: esbuild emits `dist/index.cjs`, then Node SEA + `postject` can generate a Windows `animehay.exe`.

## STRUCTURE

```text
AnimehayCli/
├── src/              # hand-written CLI source; see src/AGENTS.md
├── test/             # Vitest files, one per source module plus smoke/cli
├── bin/              # npm/Windows launchers; both require dist/index.cjs
├── scripts/          # scope/import guard scripts
├── dist/             # generated bundle/SEA blob; do not edit
├── downloads/        # runtime .mp4 output; do not scan/edit
├── build.mjs         # esbuild bundle to dist/index.cjs
├── build-sea.mjs     # Node SEA pipeline to animehay.exe
├── sea-config.json   # SEA blob config
├── vitest.config.ts  # mirrors @animehay/core alias for tests
└── tsconfig.json     # NodeNext strict TS; aliases sibling core source
```

## WHERE TO LOOK

| Task | Location | Notes |
|---|---|---|
| CLI command surface | `src/index.ts` | Commander setup, flags, dry-run, `process.exit(1)` paths |
| Download flow | `src/watch.ts`, `src/series.ts` | Single episode vs series worker pool |
| yt-dlp flags | `src/cmd-builder.ts` | Single source of truth; URL last |
| Progress UI | `src/progress.ts`, `src/multiprogress.ts` | stderr, ANSI cursor rendering |
| Node/Tampermonkey bridge | `src/core-shim.ts` | `GM_*` shim; must run before core config imports |
| URL classification | `src/url-detect.ts` | `/xem-phim/` watch, `/thong-tin-phim/` series |
| Cookie export | `src/cookies.ts` | `yt-dlp --cookies-from-browser`; Netscape file only |
| Build bundle | `build.mjs` | esbuild, CJS, target node22, sibling alias |
| Build exe | `build-sea.mjs`, `sea-config.json` | Windows Node SEA + hard-coded fuse |
| Publish/scope guards | `scripts/check-scope.mjs`, `scripts/check-imports.mjs` | `verify-scope` only wires scope guard |
| Tests | `test/*.test.ts` | Vitest, no local fixture dir |
| User docs | `README.md` | Vietnamese usage/options/runtime requirements |

## CODE MAP

| Symbol / File | Type | Location | Role |
|---|---|---|---|
| `program` | Commander instance | `src/index.ts` | Exported default for tests/bin shim; parses only behind `isMain` guard |
| `installGmShim` | function | `src/core-shim.ts` | Seeds `globalThis.GM_getValue/GM_setValue` before `@animehay/core/config` loads |
| `downloadWatchPage` | function | `src/watch.ts` | Fetch page, parse iframe, extract stream, spawn yt-dlp |
| `downloadSeries` | function | `src/series.ts` | Fetch info page, filter episodes, run worker pool |
| `buildYtDlpArgs` | pure function | `src/cmd-builder.ts` | Composes all yt-dlp arguments and defaults |
| `downloadWithProgress` | function | `src/progress.ts` | Runs child process, parses stdout+stderr progress lines |
| `MultiProgress` | class | `src/multiprogress.ts` | Multi-row progress renderer for series jobs |
| `exportCookiesFromBrowser` | function | `src/cookies.ts` | Generates Netscape cookie file via yt-dlp |

## COMMANDS

```powershell
npm install
npm run build          # build dist/index.cjs via esbuild
npm start              # run dist/index.cjs; build first
npm test               # vitest run
npm run verify-scope   # fails if AnimehayDownloader/* changed
node scripts/check-imports.mjs  # manual banned-import scan; not wired to npm
npm run build:sea      # builds animehay.exe; Node >=20 + postject; Windows-focused
```

## CONVENTIONS

- npm only: `package-lock.json` exists; no pnpm/yarn/workspace root.
- ESM source with NodeNext; relative imports often include `.js` despite `.ts` sources.
- `@animehay/core` is not an npm package here. `tsconfig.json`, `vitest.config.ts`, and `build.mjs` all map it to `../AnimehayDownloader/src` and must stay in sync.
- Tests live in `test/` (singular), not co-located; most mirror `src/<name>.ts` as `test/<name>.test.ts`.
- Output messages use bracket prefixes: `[OK]`, `[INFO]`, `[ERROR]`, `[DRY-RUN]`, `[DONE]`, `[FAIL]`.
- Progress bars write to stderr so stdout remains usable.

## ANTI-PATTERNS (THIS PROJECT)

- Do not edit `AnimehayDownloader/src/`, `AnimehayDownloader/test/`, `AnimehayDownloader/package.json`, `AnimehayDownloader/tsconfig.json`, or `AnimehayDownloader/build/` from AnimehayCli work. `npm run verify-scope` rejects those paths.
- Do not add imports of `chalk`, `picocolors`, `ffmpeg-static`, or `@ffmpeg-installer/ffmpeg` under `src/`; `scripts/check-imports.mjs` bans them.
- Do not move `installGmShim()` below any `@animehay/core/config` import. The core `Config` singleton reads `GM_getValue` at module evaluation time.
- Do not reimplement HLS, ffmpeg, Playwright/browser automation, `aria2c`, GUI/TUI, or a new Config class. CLI stays a thin `yt-dlp` shim.
- Do not edit `dist/`, `downloads/`, `node_modules/`, `animehay.exe`, or `cookies.txt` by hand.

## GENERATED / RUNTIME PATHS

| Path | Source | Action |
|---|---|---|
| `dist/` | `npm run build`, `npm run build:sea` | regenerate, never hand-edit |
| `animehay.exe` | `npm run build:sea` | distributable artifact, never hand-edit |
| `downloads/` | default `--output-dir` | runtime media output; exclude from scans |
| `cookies.txt` | `animehay cookies export ...` | generated Netscape cookie file; can be input via `--cookies` |
| `node_modules/` | `npm install` | dependency install output |

## NOTES

- `yt-dlp` is required even when using `animehay.exe`; README recommends `winget install yt-dlp`.
- `ffmpeg` is normally provided by yt-dlp; if missing, install separately.
- Series episode numbers come from URL slugs like `-tap-28-`, not DB ids. Placeholder links such as `Xem ngay` are skipped.
- `--no-output-dir-per-series` turns off per-series subdirectories (enabled by default). When enabled, series episodes go under `output-dir/<sanitized-series>/`; single watch URLs always write directly under `output-dir`.
- `watch.ts` sends the full watch page URL as `Referer` to iframe and yt-dlp requests.
- `cmd-builder.ts` keeps `--continue` to override `--no-continue` implied by `--concurrent-fragments`.
- `watch.ts` checks `stat()` before spawning yt-dlp: if the output file already exists with size ≥ 1 MB, the download is skipped and the existing file is returned. No `--continue` flag is passed to yt-dlp — every download is a fresh start (avoids CDN size-mismatch issues). No `--download-archive` is used — stat() check alone is sufficient for skip detection.
- SEA build requires Node >=20 and uses sentinel fuse `NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`.
- Failed series episodes retry up to `--episode-retries` times (default 3) before counting as failed.
- There is no ESLint, Prettier, Biome, Docker, GitHub Actions workflow, `.nvmrc`, `.env`, or `.gitignore` in `AnimehayCli/`.

## BATCH MODE (`--batch <file.txt>`)

- Text file with one URL per line. Lines starting with `#` are comments; blank lines are skipped.
- Mixed watch + series URLs in the same file are auto-detected and dispatched to the correct downloader.
- URLs are processed **sequentially** (one at a time). Series internal concurrency still uses `--jobs`.
- `--output-dir-per-series` applies to series URLs inside batch files; watch URLs are unaffected.
- Supports `--dry-run`: watch URLs print the yt-dlp command; series URLs fetch and print episode list.
- All download options (`--cookies`, `--referer`, `--output-dir`, `--res`, etc.) apply to every URL in the batch.
- Referer is auto-detected from the first valid URL in the batch file.
- Per-URL failures are caught and logged; one bad URL never aborts the batch.
- Implementation: `src/batch.ts` exports `processBatch(batchFile, opts)`.
- Test coverage: `test/batch.test.ts` (11 tests covering watch-only, series-only, mixed, comments, unknown URLs, dry-run, errors).

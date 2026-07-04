# SOURCE KNOWLEDGE BASE

**Scope:** `AnimehayCli/src/`

## OVERVIEW

Flat TypeScript CLI source organized into routing, download orchestration, progress UI, cookie export, and the `@animehay/core` compatibility shim.

## STRUCTURE

```text
src/
├── index.ts          # Commander entry, flags, dispatch, process exits
├── url-detect.ts     # URL path -> watch/series/unknown
├── watch.ts          # single-episode download pipeline
├── series.ts         # series episode filtering + worker pool
├── cmd-builder.ts    # yt-dlp argv builder; flag defaults live here
├── cookies.ts        # browser cookie export via yt-dlp
├── progress.ts       # yt-dlp output parser + single progress bar
├── multiprogress.ts  # stacked stderr progress rows for series
└── core-shim.ts      # GM_* + requester shim for sibling core library
```

## LAYERS

| Layer | Files | Rule |
|---|---|---|
| Routing | `index.ts`, `url-detect.ts` | Parse flags, detect URL kind, dispatch only |
| Download orchestration | `watch.ts`, `series.ts`, `cookies.ts`, `cmd-builder.ts` | Build requests/yt-dlp args; no UI policy except labels |
| Progress UI | `progress.ts`, `multiprogress.ts` | stderr rendering and child-process progress parsing |
| Cross-project glue | `core-shim.ts` | Isolate Tampermonkey/global shims and requester injection |

## WHERE TO LOOK

| Need | File / Symbol | Notes |
|---|---|---|
| Add a CLI flag | `index.ts` + `cmd-builder.ts` | Declare option and pass into `buildYtDlpArgs` |
| Change yt-dlp behavior | `cmd-builder.ts#buildYtDlpArgs` | URL must stay last; preserve `--continue` |
| Change watch download | `watch.ts#downloadWatchPage` | Uses watch URL as referer; prefers m3u8 |
| Change series selection | `series.ts#downloadSeries`, `epNoFromUrl` | Episode number comes from `-tap-N-` URL slug |
| Change per-series output dirs | `series.ts#downloadSeries` | `outputDirPerSeries` creates `outDir/<sanitized-series>/` |
| Change progress parsing | `progress.ts#parseYtDlpLine` | Strip ANSI first; read stdout and stderr |
| Change multi-job display | `multiprogress.ts#MultiProgress` | stderr cursor-up renderer |
| Change cookie export | `cookies.ts#exportCookiesFromBrowser` | Validate Netscape header; return union, don't throw |
| Change core integration | `core-shim.ts` | Update defaults in sync with `AnimehayDownloader/src/config.ts` |

## MODULE NOTES

- `index.ts` exports `program` as default for tests and the bin shim. The bottom `isMain` guard also supports SEA where `process.argv[1] === process.execPath`.
- `url-detect.ts` intentionally accepts only `/xem-phim/` and `/thong-tin-phim/` paths.
- `watch.ts` pipeline: fetch watch page -> `parseWatchPage` -> `buildStreamUrl` -> fetch iframe -> `staticExtract` -> choose `.m3u8` else first stream -> `downloadWithProgress`.
- `series.ts` uses a shared cursor worker pool, not batches. This keeps up to `jobs` downloads active.
- `series.ts` creates a sanitized per-series subdirectory only when `outputDirPerSeries` is true.
- `series.ts` filters `Xem ngay` placeholders: no URL episode number and no digit in title means drop.
- `cmd-builder.ts` hardcodes Chrome UA and default yt-dlp flags. `concurrentFragments: 0` means use default.
- `progress.ts` throttles progress leading+trailing edge at 100ms; do not replace with plain debounce.
- `cookies.ts` supports only `chrome`, `firefox`, `edge`, `brave`, `opera`, `chromium`.
- `core-shim.ts` owns `GM_DEFAULTS`; keys are `animehay_`-prefixed and mirror the sibling downloader config.

## CONVENTIONS

- Keep files small and flat; no subdirectories unless a new cohesive subsystem appears.
- Keep relative NodeNext imports compatible with existing style; many source imports end in `.js`.
- Use `node:` builtins.
- Prefer pure helpers in `cmd-builder.ts`, `url-detect.ts`, `series.ts` helpers; tests assert exact outputs.
- Do not throw from `cookies.ts`; return `CookieResult`.
- Progress and multi-progress render to stderr, never stdout.

## TEST POINTERS

- Add tests under `../test/`, not inside `src/`.
- Mock `../src/watch.js` in series tests; tests must never spawn real yt-dlp.
- For child-process stream tests, use `Readable.from()` and the local `nextTick()` helper pattern from `test/progress.test.ts`; `process.nextTick` is not faked by `vi.useFakeTimers()`.
- Shared HTML fixture lives outside this project: `../../AnimehayDownloader/test/fixtures/watch-page.html`.

## BATCH PROCESSING

| Need | File / Symbol | Notes |
|---|---|---|
| Batch URL processing | `batch.ts#processBatch` | Reads file, dispatches to watch/series per URL |
| Batch CLI flag | `index.ts` | `--batch <file>`, `[url]` optional |
| Batch tests | `test/batch.test.ts` | 11 tests; mocks watch/series/fs |

- `processBatch` is sequential: one URL at a time, errors caught per-URL.
- `--dry-run` works in batch mode for both watch and series.
- Referer auto-detected from first URL in batch file.

## ANTI-PATTERNS

- Do not statically import `@animehay/core/config` before `installGmShim()`.
- Do not duplicate filename sanitization rules without syncing both `watch.ts` and `series.ts`.
- Do not change referer handling from full watch page URL to origin-only.
- Do not remove `--continue` from yt-dlp args.
- Do not add color/ffmpeg helper dependencies; use existing stdout/stderr formatting and external yt-dlp.

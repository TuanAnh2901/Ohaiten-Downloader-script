# Decisions
## [2026-08-03] Plan decisions (all user-confirmed)
- Output: ./downloads/ default, collections as subfolders, --output-dir override
- Filter: videos+reels only (content_filter 2+26)
- Uncategorized saves: INCLUDE via All-saves minus collections, dedupe by videoId
- Filename collision: append videoId only on collision
- Timestamp format: YYYY-MM-DD_HHmm zero-padded minute-level
- TDD: YES vitest + Playwright route-mocked (fixtures from dump, no live FB in CI)
- Resume: .done.json markers (fix small-reel skip bug)
- Exit codes: 0 ok, 1 partial, 2 fatal auth, 3 nothing-to-download
- Download order: newest-first

## [2026-08-03] Task 16 decisions
- Enumeration: ALL-saves single stream ONLY (per-collection GraphQL forbidden - CollectionItems doc broken). No save timestamps (B=NONE) - no filename prefix.
- Folder for multi-collection item: FIRST by sorted collection name (deterministic, one video one folder).
- Dedupe: videoId across whole run, first occurrence wins, later = skipped 'duplicate' (in report).
- Reports: {outputDir}/reports/ (spec said writeReportFile('reports'); scoped under outputDir so parallel runs don't collide in cwd).
- Reuse: downloadMany pool (jobs), buildYtDlpArgs plan lines, temp-copy cookie safety (master NEVER to yt-dlp), MultiProgress slot per video.
- defaultServices: real impls, per-call browser session (no CliServices seam restructure).

## [2026-08-03] Task 17 decision (ratified)
- Report location: KEEP {outputDir}/reports/ (T16 decision). Plan spec said `reports/{timestamp}-report.json` at project root, but the report belongs next to its downloads: self-contained per --output-dir, no cwd collision across parallel runs, already gitignored (reports/). DELIBERATE deviation from plan, recorded per T17 instructions.

# fb-saved-dl

**Generated:** 2026-08-04
**Commit:** 7464dd4
**Branch:** main

## OVERVIEW

Node.js CLI + Tauri desktop app that signs into Facebook with exported cookies, walks saved-items, and hands each video to yt-dlp for download. Also packages as standalone Windows EXE (SEA) and Tauri NSIS installer.

**Stack:** TypeScript 5.5 (ESM NodeNext, strict), Node 20+, Commander, Playwright, esbuild, Vitest, Tauri 2 (Rust).

## STRUCTURE

```
.
├── src/                  # CLI core (15 files, flat)
├── test/                 # Vitest suite (18 test files + fixtures/)
├── bin/fb-saved-dl.js    # CLI launcher
├── src-tauri/            # Tauri 2 desktop shell
│   ├── src/main.rs       # Rust backend (IPC, engine launcher, process mgmt)
│   ├── frontend/         # TS browser UI (6 files)
│   └── tauri.conf.json   # Window, bundle, NSIS config
├── docs/                 # engine-jsonl.md protocol spec
├── spike/                # Investigation artifacts, bundled yt-dlp.exe
├── FB_websource/         # Captured Facebook HTML/JS for reference
└── .omo/                 # Plans, notepads, evidence
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add CLI command | `src/index.ts:195` (createProgram), new command in `orchestrator.ts` | Commander surface, services pattern |
| Fix GraphQL queries | `src/graphql.ts`, `src/collections.ts` | Facebook doc IDs may rotate; capture from browser |
| Fix download logic | `src/download.ts` | yt-dlp wrapper, cookie temp-copy, marker lifecycle |
| Fix auth/browser | `src/auth.ts` | Playwright headless auth, cookie injection |
| Change output layout | `src/orchestrator.ts`, `src/filename.ts` | Per-collection dirs, title-only filenames |
| Change progress UI | `src/progress.ts`, `src/multiprogress.ts` | ANSI bars, stderr-only |
| Change error handling | `src/errors.ts` | Exit codes, FbSavedCliError |
| Tauri IPC commands | `src-tauri/src/main.rs:58-260` | load/save/reset_settings, list_collections, run_engine, cancel_engine |
| Tauri frontend UI | `src-tauri/frontend/` | Vanilla TS, no framework, event-driven via Tauri events |
| Test CLI | `test/*.test.ts` | Vitest, route-mocked Playwright, synthetic cookies |
| Build CLI | `build.mjs` | esbuild bundles `src/index.ts` → `dist/index.js` |
| Build SEA exe | `build-sea.mjs` | CommonJS bundle + postject injection |
| Build frontend | `build-frontend.mjs` | esbuild bundles frontend → `frontend-dist/` |
| Build Tauri | `npm run tauri:build` | Requires pre-built `fb-saved-dl.exe` at root |

## CODE MAP

| Symbol | Type | File | Role |
|--------|------|------|------|
| `run(argv, services, io)` | function | `src/index.ts:261` | CLI entry point |
| `createProgram(services, io)` | function | `src/index.ts:195` | Commander command tree |
| `CliServices` | interface | `src/index.ts:54` | Seam for CLI → orchestrator, enables fake-service testing |
| `downloadAll(opts)` | function | `src/orchestrator.ts` | Full-saved-items download orchestration |
| `listCollectionsService(cookies)` | function | `src/orchestrator.ts` | Enumerate collections with counts |
| `downloadVideo(...)` | function | `src/download.ts` | Single yt-dlp invocation with temp-cookie |
| `listCollections` | command | `src-tauri/src/main.rs:243` | Tauri IPC: list collections |
| `run_engine` | command | `src-tauri/src/main.rs:249` | Tauri IPC: start download engine |
| `createCollectionsController` | function | `src-tauri/frontend/controller.ts` | Frontend controller: manages state, delegates to engine |
| `ExitCode` | enum | `src/errors.ts` | 0=ok, 1=partial, 2=fatal, 3=nothing |
| `runEngineJsonl(argv, services)` | function | `src/engine-jsonl.ts` | JSONL protocol handler, parses --engine-jsonl args |
| `validateEngineEvent(value)` | function | `src/engine-jsonl.ts` | Validates JSONL event structure/ordering |
| `createEngineAdapter(exePath, opts)` | function | `src/engine-adapter.ts` | Spawns engine, reads JSONL stdout, 120s timeout |
| `cancel_engine` | command | `src-tauri/src/main.rs:254` | Tauri IPC: cancel running engine |
| `load_settings / save_settings` | command | `src-tauri/src/main.rs:58-72` | Tauri IPC: settings persistence |
| `browserSettingsStore()` | function | `src-tauri/frontend/settings.ts` | Frontend settings with localStorage fallback |
| `createCollectionsController` | function | `src-tauri/frontend/controller.ts` | Frontend state machine for collection/download ops |

## CONVENTIONS

- **Strict TypeScript**: `strict: true`, `module: NodeNext`, `moduleResolution: NodeNext`. No `as any`, no `@ts-ignore`.
- **ESM only**: `"type": "module"`. `.js` extensions in imports.
- **Service seam pattern**: `CliServices` / `CliIo` interfaces injectable for fake-service testing. Real services in `orchestrator.ts`.
- **Stderr for diagnostics, stdout for data**: Never mix. Progress, errors, logs → stderr. `list-collections` table, `--dry-run` plan → stdout.
- **Temp-cookie pattern**: Master cookie file never passed to yt-dlp. Copy to temp, pass copy, delete in `finally`.
- **Exit codes**: 0=ok/dry-run, 1=partial failures, 2=auth/cookie fatal, 3=nothing to download.
- **Serial vitest**: `fileParallelism: false` — multiple suites launch Chromium, parallel causes flake.
- **Headless Playwright only**: `headless: true` — no window/taskbar icon; session from injected cookies.
- **Title-only filenames**: Facebook exposes no "saved at" timestamp. Filenames are `{title}.mp4`.
- **Engine JSONL protocol**: Tauri GUI communicates with bundled `fb-saved-dl.exe` via `--engine-jsonl` flag. JSONL events on stdout: `collections`, `progress`, `completed`, `partial`, `failed`, `cancelled`, `timeout`, `error`.
- **Frontend: vanilla TS**: No React/Vue/Svelte. Direct DOM manipulation + Tauri `invoke`/`listen`.

## ANTI-PATTERNS (THIS PROJECT)

| Never | Because |
|-------|---------|
| Pass master cookie to yt-dlp | yt-dlp rewrites cookie files, removes `c_user`/`xs` |
| Run browser headed (window/taskbar icon) | User wants a hidden background process |
| Parallelize GraphQL requests | Rate limits, sequential + delay required |
| Use `--continue` or `--download-archive` | Managed via `.done.json` markers |
| Expose raw cookies in logs/args/reports | Security boundary |
| Write progress to stdout | Keeps stdout pipe-safe |
| Mock Node builtins with `vi.mock` | Externalized modules break; inject `spawnFn` instead |
| Second-level timestamps in filenames | No reliable save timestamp exists |
| Fabricate save timestamps | Facebook GraphQL has no "saved at" field |
| Leave orphan browser/Node/yt-dlp processes | Always terminate tree on cancel/error/exit |
| Assume engine 120s timeout covers long downloads | Whole-operation timeout; per-video download may exceed it |
| Pass `"yt-dlp"` as Tauri setting without full path | Tauri validates path is a file; bare name fails |

## COMMANDS

```powershell
npm install
npm run build          # CLI: src/ → dist/
npm test               # vitest run (serial, headless Playwright)
npm run dev            # tsx src/index.ts (dev CLI)
npm run frontend:build # Tauri frontend → frontend-dist/
npm run tauri:dev      # Tauri dev (Windows x86_64 only)
npm run tauri:build    # Tauri NSIS installer
npm run build:sea      # Standalone fb-saved-dl.exe
```

## NOTES

- **Windows only**: Tauri targets `x86_64-pc-windows-msvc`. SEA exe is Windows-specific.
- **yt-dlp resolution**: Desktop resolves managed app-local, Windows PATH, then bundled `yt-dlp.exe`; Settings installs pinned official stable release `2026.07.04` after SHA-256 verification. CLI still supports `--yt-dlp-path`.
- **GraphQL doc ID rotation**: Facebook changes internal IDs over time. If `FETCH_GRAPHQL` errors appear, recapture from browser devtools into `src/graphql.ts` / `src/collections.ts`. The per-collection doc is `26605228462486746` (`CometSaveCollectionAllItemsPaginationQuery`, captured live via Playwright click-through + scroll — the ROOT doc `27440094105689641` loads page 1, this doc loads every scroll page).
- **Per-collection doc quirks**: requires the exact UI variables — `feedLocation: 'SAVED_DASHBOARD'` + `feedbackSource: 58` make the server honor the cursor (omit them → server ignores cursor, repeats page 1 forever), `count: 10` (larger counts still return 10), and the `__relay_internal__pv__*` provider vars (missing → `missing_required_variable_value`).
- **Tauri requires pre-built `fb-saved-dl.exe`**: Build CLI exe first (`npm run build:sea`), then `npm run tauri:build`.
- **Tauri frontend has no framework**: Controller pattern (`createCollectionsController`) manages state with `CollectionsView` callback interface.
- **Whole-operation engine timeout**: `engine-adapter.ts` defaults to 120s. `src-tauri/src/main.rs` same. Long `download-all` runs may time out; this is a known limitation.
- **Tauri work is uncommitted**: All `src-tauri/`, `src/engine-*.ts`, and related files are untracked on `main`.
- **Test fixtures**: Synthetic cookies in `test/fixtures/`, never real credentials. Playwright route-mocked, never live Facebook.

# src-tauri/ — Tauri 2 Desktop Shell

**Generated:** 2026-08-04
**Note:** All Tauri work is **uncommitted** on `main`.

## OVERVIEW

Thin Rust desktop wrapper around the bundled `fb-saved-dl.exe` CLI. Spawns engine with `--engine-jsonl`, reads JSONL stdout, forwards events to vanilla TypeScript frontend via Tauri IPC.

## STRUCTURE

```
src-tauri/
├── src/main.rs          # Rust backend (276 lines, 6 IPC commands)
├── frontend/            # Vanilla TS browser UI (6 files)
├── Cargo.toml           # Tauri 2.0, serde, serde_json
├── tauri.conf.json      # Window config, NSIS installer, bundled resources
├── build.rs             # Standard Tauri build
├── icons/               # App icon assets
└── target/              # Build output (release/fb-saved-dl-gui.exe)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add IPC command | `src/main.rs` | `#[tauri::command]` + `generate_handler!` |
| Change window size | `tauri.conf.json:16-19` | width/height, minWidth/minHeight |
| Change bundled resources | `tauri.conf.json:33-36` | fb-saved-dl.exe, yt-dlp.exe |
| Fix engine timeout | `src/main.rs:192` | 120s whole-operation timeout |
| Change settings schema | `src/main.rs:28-35` | Settings struct + validation |
| Tauri frontend UI | `frontend/main.ts` | Renders all HTML, wires events |
| Frontend controller | `frontend/controller.ts` | State machine: refresh, download, dry-run |
| Frontend settings | `frontend/settings.ts` | Form validation, localStorage, Tauri bridge |

## CODE MAP — Rust

| Symbol | Line | Role |
|--------|------|------|
| `Settings` | 28 | Settings struct (cookies, output, jobs, resolution) |
| `load_settings` | 59 | Tauri IPC: read settings.json from app data dir |
| `save_settings` | 68 | Tauri IPC: validate + write settings.json |
| `reset_settings` | 75 | Tauri IPC: delete settings file, return defaults |
| `list_collections` | 243 | Tauri IPC: validate settings, spawn engine with list-collections |
| `run_engine` | 249 | Tauri IPC: spawn engine with download-all/collection |
| `cancel_engine` | 255 | Tauri IPC: set cancelled flag, terminate tree |
| `execute_engine` | 161 | Core: spawn, read JSONL, validate events, emit to frontend |
| `validate_event` | 125 | Protocol validator: ordering, field types |
| `engine_args` | 100 | Build CLI args from settings + command |
| `terminate_tree` | 153 | taskkill /PID /T /F |
| `ActiveEngine` | 90 | Arc<Mutex<EngineProcess>> — singleton state |

## CODE MAP — Frontend

| Symbol | File | Role |
|--------|------|------|
| `createCollectionsController` | `controller.ts` | State machine, delegates to EngineClient |
| `browserSettingsStore` | `settings.ts` | localStorage-backed settings with Tauri fallback |
| `tauriSettings` | `settings.ts` | Tauri invoke wrapper |
| `renderCollections` | `main.ts:51` | Renders collection grid cards |
| `renderReports` | `main.ts:37` | Renders report history cards |

## CONVENTIONS

- **Rust is thin shell**: No business logic. Spawns Node process, parses JSONL, forwards events.
- **JSONL protocol**: One JSON object per line on stdout. Event types: collections, progress, completed, partial, failed, cancelled, timeout, error.
- **Singleton engine**: `ActiveEngine` wrapped in `Arc<Mutex<>>`. One operation at a time.
- **Whole-operation timeout**: 120 seconds for entire engine operation (not per-video). Long download-all may time out — known limitation.
- **Frontend vanilla TS**: No framework. Controller pattern with `CollectionsView` callback interface.
- **Settings validation**: Rust validates paths exist before spawning engine. Frontend validates number ranges.
- **yt-dlp resolution**: managed app-local, Windows PATH via `where.exe`, then bundled resource. Settings can install pinned official release after SHA-256 verification.
- **Process cleanup**: `terminate_tree` on cancel, timeout, error, or app exit.

## ANTI-PATTERNS

| Never | Because |
|-------|---------|
| Assume engine finishes in 120s for download-all | Whole-op timeout, not per-video |
| Store manual yt-dlp path in GUI settings | Rust owns discovery and installation |
| Store raw cookies in settings | Store file path only |
| Leave engine process on cancel | Always `terminate_tree` |
| Use React/Vue/Svelte in frontend | Vanilla TS by design |
| Assume Tauri work is committed | All `src-tauri/` is untracked on `main` |

## COMMANDS

```powershell
npm run tauri:dev      # Build frontend + Tauri dev (Windows x86_64 only)
npm run tauri:build    # Build frontend + Tauri NSIS installer
npm run frontend:build # Frontend only → frontend-dist/
npm run frontend:check # tsc --noEmit frontend type-check
```

## NOTES

- **Pre-requisite**: `fb-saved-dl.exe` must exist at project root before `tauri:build`.
- **Windows only**: `x86_64-pc-windows-msvc` target. Compile-time check in `main.rs:1-7`.
- **Bundled resources**: `fb-saved-dl.exe` + `spike/yt-dlp.exe` included in NSIS installer as fallback.
- **Installer path**: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Facebook Saved Downloader_0.1.0_x64-setup.exe`
- **Test coverage**: 18 test files, 176 tests passing. Includes `frontend-controller.test.ts`, `frontend-report.test.ts`, `settings.test.ts`.
- **Engine timeout is known limitation**: 120s whole-operation. Download-all with many videos will hit this. Per-video download time is unbounded.

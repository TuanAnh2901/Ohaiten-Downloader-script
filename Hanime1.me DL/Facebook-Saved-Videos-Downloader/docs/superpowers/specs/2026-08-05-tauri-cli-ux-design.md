# Tauri UI and CLI Engine UX Design

Date: 2026-08-05
Status: Approved design

## Goal

Improve the Tauri desktop workflow for selecting saved collections, starting and cancelling downloads, understanding progress, configuring the engine, and reviewing failures. Keep the CLI usable on its own while making its JSONL contract reliable for the Tauri shell.

## Current Problems

- The frontend has a single `busy` flag and disables every button, including controls that should remain available during a download.
- The UI has no wired cancel action even though Rust already exposes `cancel_engine`.
- CLI progress is emitted once per completed video with `completed: 1, total: 1`; the controller adds those events together, so operation-level progress is not represented correctly.
- Engine errors are mostly free-form strings, making actionable UI messages inconsistent.
- The current engine timeout covers the whole operation, including long downloads.
- The frontend source contains visibly corrupted icon characters in the rendered labels.

## Design

### State and data flow

The frontend controller becomes the single state machine for an operation:

`idle -> loading -> ready -> running -> cancelling -> finished|error`

Every state update carries the active `operationId`. Events for another operation are ignored. The view renders state and does not infer totals by adding individual events.

The flow is:

1. Frontend validates settings and invokes Rust.
2. Rust validates settings, starts one engine child, and forwards JSONL events as `engine-event`.
3. CLI emits a deterministic sequence and exactly one terminal event.
4. Rust terminates and clears the child on cancel, timeout, close, or failure.
5. Frontend writes one report from the terminal summary and refreshes collections only after the operation settles.

### JSONL contract

All events include `schemaVersion: 1` and `operationId`.

Non-terminal events:

- `started`: command, scope, dry-run flag, and planned total.
- `collections`: collection list.
- `progress`: cumulative `completed`, `failed`, and `total`; current collection/video ids; optional `percent`, `speed`, and `eta`.

Terminal events are exactly one of `completed`, `partial`, `cancelled`, `timeout`, or `error`. Result terminals include `successCount`, `failureCount`, `exitCode`, and optional diagnostic code. Error terminals include a stable code and user-safe message. The validator rejects unknown event types, invalid counts, mismatched operation ids, event-after-terminal, and invalid ordering.

The CLI keeps stdout pipe-safe JSONL, keeps diagnostics on stderr, preserves the existing exit-code meanings, and never serializes cookie values or command secrets.

### Rust IPC

Keep the existing `list_collections`, `run_engine`, `cancel_engine`, settings, and yt-dlp commands. `run_engine` returns structured command errors where possible. `ActiveEngine` owns the child lifecycle and publishes a terminal event after the process is fully settled. Cancellation is idempotent. The adapter timeout is split into startup/protocol-idle handling; regular download progress prevents an idle timeout.

### Tauri UI

Collections remains the primary screen. Each collection row/card shows its count, download action, and preview action. The download center exposes all-items download and dry-run preview.

While running, a persistent operation bar shows cumulative counts, current video, percent when available, and cancel. Navigation to History remains available; conflicting start/refresh actions are disabled. Settings remain editable only when no operation is running.

History records show status, duration, scope, output path, success/failure counts, and expandable errors. Settings are grouped into Authentication, Output, Download, and Engine sections with inline validation and explicit yt-dlp availability state. Empty, auth, missing-tool, invalid-path, timeout, cancellation, protocol, and partial-failure states each receive distinct copy and visual treatment.

The existing dark/light themes remain, but typography, spacing, focus rings, contrast, responsive layout, and icon encoding are corrected. Controls use stable dimensions and accessible names.

## Error Mapping

The UI maps stable engine codes to actionable messages:

- `AUTH_FAILED`: refresh the cookies file.
- `COOKIES_INVALID`: choose an existing cookies file.
- `YTDLP_MISSING`: install or select yt-dlp.
- `OUTPUT_INVALID`: choose a writable output folder.
- `ENGINE_TIMEOUT`: inspect network/tool state and retry.
- `CANCELLED`: operation stopped; completed files remain reported.
- `PROTOCOL_ERROR`: engine/UI version mismatch; show a diagnostic reference without raw secrets.

Unknown errors remain visible as a short redacted diagnostic and are recorded in the report.

## Testing

- Add failing tests first for JSONL ordering, schema validation, cumulative progress, terminal uniqueness, cancel, timeout, and redaction.
- Add controller tests for state transitions, stale-operation events, cancel, refresh timing, and report creation.
- Add settings tests for field validation and error mapping.
- Extend frontend tests for cancel visibility, progress summary, disabled controls, empty/error states, and history rendering.
- Run the existing serial Vitest suite, TypeScript builds, frontend build, Rust checks where available, and `git diff --check`.

## Scope Boundaries

This change does not replace Playwright authentication, rewrite Facebook GraphQL queries, add a new frontend framework, or change the marker-based download policy. It keeps the current service seams and synthetic test fixtures.

# Engine JSONL Contract

Invoke machine mode with `--engine-jsonl` plus exactly one existing command:
`list-collections`, `download-all`, or `download-collection <id>`. Arguments are
paths and scalar settings only: `--cookies`, `--output-dir`, `--yt-dlp-path`,
`--jobs`, `--resolution`, `--dry-run`. GUI callers resolve yt-dlp in Rust and
pass no yt-dlp path argument; CLI callers may still pass `--yt-dlp-path`.
`--all-download` is represented by
`download-all`; no cookie contents are accepted.

Stdout is UTF-8 JSONL: each non-empty line is one JSON object ending in `\n`.
Every object has string `type` and `operationId`. Order is zero or one
`collections`, zero or more `progress`, then exactly one terminal last.

```json
{"type":"collections","operationId":"...","collections":[{"id":"1","name":"Saved Videos","count":7}]}
{"type":"progress","operationId":"...","collectionId":"1","videoId":"42","completed":0,"total":1}
{"type":"completed","operationId":"...","successCount":1,"failureCount":0,"exitCode":0}
```

Collection `id`/`name` are strings and `count` is an integer >= 0. Progress
identifiers are non-empty strings; `completed` and `total` are integers >= 0.
Terminal types are `completed`, `partial`, `failed`, `cancelled`, `timeout`,
`error`. Completed/partial use non-negative `successCount` and
`failureCount`, with exit code 0/1. Other terminals use `message` and exit
code 3/130/124/3 respectively. Blank, malformed, unknown, missing, duplicate,
post-terminal, or EOF-without-terminal input is invalid. CRLF is accepted.

Stderr is reserved for human diagnostics. Diagnostics are sanitized and never
contain cookie content. SIGINT emits one `cancelled` terminal with exit code
130; terminal emission is idempotent.

Exit table: 0 success, 1 partial/runtime, 2 human-mode usage/auth, 3
machine-mode error/no videos, 130 cancelled, 124 timeout.

## GUI yt-dlp resolution

Tauri checks candidates in this order: managed app-local `yt-dlp.exe`, first
Windows PATH result from `where.exe yt-dlp.exe`, then bundled resource
`yt-dlp.exe`. When no candidate exists, Settings installs pinned official
release `2026.07.04`; downloaded bytes and `SHA2-256SUMS` must match the pinned
SHA-256 before replacement.

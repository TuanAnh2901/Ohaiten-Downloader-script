# fb-saved-dl

**Download every video you saved on Facebook, organized into per-collection folders.**

A Node.js CLI that signs into your Facebook account with exported cookies, walks
your entire saved-items list, and hands each video to yt-dlp for download. Works
for watch videos and reels, skips duplicates, resumes across runs, and keeps a
report of everything it did.

---

## Features

| Feature | What it does |
|---|---|
| Full saved-items coverage | Walks the all-saves stream, so videos outside any collection are included too |
| Per-collection folders | One folder per collection, plus `_uncategorized/` for the rest |
| Reels and videos | Both `/watch/` and `/reel/` permalinks handled by yt-dlp |
| Resume support | Finished videos get `.done.json` markers; already-downloaded files are skipped |
| Deduplication | Same video saved twice downloads once (first occurrence wins) |
| Concurrent downloads | `--jobs` controls the parallel download pool |
| Dry run | Print the exact yt-dlp command plan without touching your bandwidth |
| Progress bars | Live per-video progress, mirroring the Animehay CLI |

---

## Requirements

- **Node.js 20+** with npm
- **yt-dlp**. The desktop app discovers managed app-local, Windows PATH, then
  bundled `yt-dlp.exe`, and Settings can install pinned official release
  `2026.07.04` after SHA-256 verification. CLI `--yt-dlp-path` remains supported.
- **A Netscape-format cookie file** exported from a logged-in browser session.
  Export with a browser extension (for example "Get cookies.txt LOCALLY") from
  `facebook.com`. The default filename is `Facebook-cookies.txt`.
- **A hidden background browser.** The tool launches a headless Chromium
  process (no window, no taskbar icon); the session comes from your cookies.

---

## Install

```powershell
npm install
npm run build
```

The build compiles `src/` into `dist/`. The launcher is `bin/fb-saved-dl.js`:

```powershell
node bin/fb-saved-dl.js --help
```

---

## Usage

### Commands

| Command | Description |
|---|---|
| `list-collections` | Print your saved collections with video counts |
| `download-all` | Download every saved video into per-collection folders |
| `download-collection <collectionId>` | Download only the videos of one collection |

### Options

| Flag | Default | Description |
|---|---|---|
| `--cookies <file>` | `Facebook-cookies.txt` | Netscape-format cookie file |
| `--output <json>` | — | `list-collections` only: write the JSON result to a file |
| `--output-dir <dir>` | `./downloads` | Where downloaded files and reports go |
| `--dry-run` | `false` | Print the yt-dlp command plan, download nothing |
| `--yes` | `false` | Skip the confirmation prompt |
| `--jobs <n>` | `3` | Concurrent downloads |
| `--yt-dlp-path <path>` | `yt-dlp` | Path to the yt-dlp binary |
| `--verbose` | `false` | Verbose output (global) |

### Examples

```powershell
# See what you have before downloading anything
node bin/fb-saved-dl.js list-collections --cookies Facebook-cookies.txt

# Same, but save the machine-readable result
node bin/fb-saved-dl.js list-collections --cookies Facebook-cookies.txt --output collections.json

# Download one collection by its ID (printed by list-collections)
node bin/fb-saved-dl.js download-collection 302722351189018 `
  --cookies Facebook-cookies.txt --output-dir ./downloads `
  --yt-dlp-path ./spike/yt-dlp.exe --jobs 2

# Check the plan first: prints one yt-dlp command per video, downloads nothing
node bin/fb-saved-dl.js download-all --cookies Facebook-cookies.txt --dry-run `
  --yt-dlp-path ./spike/yt-dlp.exe

# The real thing: download everything, no prompt, 3 at a time
node bin/fb-saved-dl.js download-all --cookies Facebook-cookies.txt --yes `
  --yt-dlp-path ./spike/yt-dlp.exe --jobs 3
```

`download-all` is the go-command for a full backup. It asks for confirmation
before starting unless you pass `--yes`. Every command opens its own browser
session and closes it when done.

---

## Output structure

```
downloads/
├── Anime/                      # one folder per collection
│   ├── Some episode title.mp4
│   └── Some episode title.mp4.done.json     # resume marker
├── _uncategorized/             # saved videos that belong to no collection
├── ...
└── reports/
    └── report-20260803-123456.json   # summary, failures, skips
```

- Videos land in `downloads/{collectionName}/{title}.mp4`. A video saved to
  several collections goes into the first folder by sorted collection name, so
  each video appears exactly once.
- Saved videos that belong to no collection land in `downloads/_uncategorized/`.
- Every finished download writes a `.done.json` marker next to the file. On a
  later run the file is skipped, so re-running is cheap.
- Each run writes a report to `downloads/reports/report-<timestamp>.json` with
  the summary counts, per-video failures, and skips.

---

## Notes

- **Hidden background browser.** The tool launches Chromium headless
  (`headless: true`) — no window, no taskbar icon. The session comes entirely
  from the injected cookies; no login form is ever shown.
- **No save timestamp exists.** Facebook exposes no "saved at" field on saved
  items (verified against the live GraphQL response). Filenames are therefore
  title-only: `{title}.mp4`. There is no reliable way to order or rename files
  by when you saved them. The only proxy is the post's publish date, which is
  the date it was posted, not saved.
- **Dedupe is first-wins.** If the same video appears twice in your saves, the
  first occurrence downloads and the later one is skipped as `duplicate` in the
  report.
- **Download order** is newest-first as Facebook returns them.
- **One command, one browser session.** Each invocation opens, works, closes.
  Long `download-all` runs stay in one session.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Exits with code 2, "refresh cookies" | Session expired or hit a login/checkpoint page. Re-export cookies from your browser into `Facebook-cookies.txt` (or the file you pass with `--cookies`) and run again. |
| "cookies file not found" | The cookie file path is wrong, or you have not exported one. Export a Netscape-format file from your logged-in browser. |
| yt-dlp not found | Open desktop Settings and install official yt-dlp, or install `yt-dlp` on PATH. CLI users can pass `--yt-dlp-path <path>`. |
| Error `FETCH_GRAPHQL` | Facebook rotated its internal GraphQL doc IDs, so the query the tool sends no longer resolves. This is expected over time; the doc IDs live in `src/graphql.ts` / `src/collections.ts` and need re-capturing from a logged-in session. |
| "Cannot parse data" | Transient Facebook response parse failure. The tool retries automatically (exponential backoff, up to 3 attempts); usually no action needed. |
| Failed downloads reported | Individual failures are recorded in `downloads/reports/report-*.json` with the video URL and reason. Re-run to retry them; finished files are skipped, so re-runs are incremental. |

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success (or dry-run plan printed) |
| `1` | Partial: some videos failed, or a yt-dlp/GraphQL/pagination error |
| `2` | Fatal: auth failure or invalid cookies file |
| `3` | Nothing to download (no videos, or collection not found) |

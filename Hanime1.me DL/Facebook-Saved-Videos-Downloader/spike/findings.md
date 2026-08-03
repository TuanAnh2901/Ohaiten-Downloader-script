# Spike Findings (shared — tasks 3 & 4)

## [2026-08-03] Task 4: yt-dlp Facebook validation

### Toolchain
- yt-dlp NIGHTLY `2026.07.23.234303` (yt-dlp-nightly-builds GitHub release, exe at `spike/yt-dlp.exe`)
- Stable channel REJECTED (installed 2025.06.30 — stale for Facebook)
- Cookies: `Facebook-cookies.txt` (Netscape format) — REQUIRED for HD formats

### Format list — /watch/?v=1570312221305439 (with cookies)
- Video: DASH mp4 AV1 — 960x720 x5 (92k–390k) + 1440x1080 (632k)
- Audio: m4a mp4a.40.5 60k (DASH)
- Also `sd`/`hd` muxed mp4 entries (unknown resolution) — DASH preferred
- ASSERT PASS: 720p AND 1080p format lines present

### Test download — spike/yt-test.mp4
- Command: `-f "bv*[height<=1080]+ba/b[height<=1080]" --merge-output-format mp4`
- Picked 1440x1080 video (1.17MiB) + 60k m4a, merged OK
- File: 1,348,809 bytes (~1.29 MiB) — PASS >=1MB
- Magic bytes: `00 00 00 20 66 74 79 70` — bytes 4-7 = `ftyp` — PASS valid MP4
- Duration: 15.548s (short clip, no caption — the placeholder-titled video)

### Reel URL live-test — /reel/1005655615768824
- Works with same cookies + extractor (FacebookIE handles /reel/ permalinks)
- Formats: vertical DASH AV1 — 540x960, 720x1280 x6 (148k–685k), 1080x1920 (971k)
- ASSERT PASS: HD (720/1080) available on reels too
- Dump contains 7 unique `/reel/{id}/` permalinks — ALL map to known watch video IDs → both URL forms valid per video

### Gotchas
- `--print` for metadata hit "Cannot parse data" ONCE on re-extraction, succeeded on immediate retry — transient FB response parse failure, not deterministic
- Console codepage mangles Vietnamese diacritics in titles (cosmetic only)
- Nightly exe BUNDLES Python 3.10.11 + ffmpeg 7.1.1 + ffprobe (gyan.dev builds) — merge works with zero external deps. Plain `pip install yt-dlp` would NOT have ffmpeg → merge would fail

### Conclusion
Nightly + cookies approach VALIDATES end-to-end: format discovery, HD download, mp4 merge, reel support. No blockers for E2E.

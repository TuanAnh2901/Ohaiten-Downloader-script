# Pornavhd-CLI — Node rewrite + SEA exe design

**Ngày:** 2026-10-17
**Mục tiêu:** `pornavhd.exe` single-file như yt-dlp/animehay.exe, feature parity với `pornavhd.py` hiện có.

## Vì sao rewrite

- AnimehayCLI đạt exe bằng Node SEA; user muốn Pornavhd-CLI tương đương.
- Playwright không nhét được vào SEA (spawn driver node.exe + đọc package từ đĩa) → thay bằng CDP client tự viết, 0 runtime dep.
- Node fetch thuần bị Cloudflare chặn (đã probe: trả trang "Just a moment") → MỌI HTTP (listing lẫn download) đi qua browser thật.

## Kiến trúc

```
Pornavhd-CLI/
├── src/main.ts        # toàn bộ CLI, 1 file
├── build.mjs          # esbuild → dist/index.cjs (CJS, target node22)
├── build-sea.mjs      # blob → copy node.exe → postject → pornavhd.exe
└── sea-config.json
```

Runtime dependency: **0** (chỉ Node >=22 built-in; Edge/Chrome + ffmpeg cài sẵn bên ngoài).

## CDP client (thay Playwright)

- `spawn` Edge/Chrome: `--remote-debugging-port=0 --user-data-dir=<profile cạnh exe>`.
- Đọc ws debug URL từ stderr, kết nối global `WebSocket` (Node 22).
- Cho từng target (page/iframe): `.Target.attachToTarget(flatten:true)` → trong sessionId: `Page.enable`, `Network.enable`, `Page.navigate`, `Runtime.evaluate` (jwplayer play + setPlaybackRate(16)), `Network.getResponseBody` gom segment fMP4.
- Cloudflare challenge: đợi người dùng click cửa sổ browser (log hướng dẫn), timeout.

## Listing

- Navigate search/actor URL trong browser, đọc HTML, parse card bằng regex (port `parse_cards`: article.thumb-block + href + data-post-id + duration).
- Paginate `/page/N/` (query `?s=` giữ lại), dedup post-id, dừng khi hết card mới, cap 500 trang.

## Feature parity (giữ nguyên flags)

`target` (video URL | /actor/ | ?s= | file .txt `--batch`), `--list`, `--jobs` (N worker = N browser, profile `-wN`), `--res`, `--from`, `--to`, `--retries`, `--output-dir` (default `./downloads`, sub-folder theo slug/từ-khóa-search).

Download flow như bản Python: chờ variant m3u8 → chọn variant theo res → tăng tốc 16x → gom segment body theo playlist order → concat init+segments → `ffmpeg -c copy -movflags +faststart`. Lược ad hosts growcdnssedge/whitetrafsa/tiktokcdn.

## Error handling & test

- Per-video fail → retry (default 2) → FAIL; 1 video xấu không abort batch.
- Skip file đã có (>=1MB).
- Test: `test/parse.test.js` port `test_extract.py` chạy fixture `tests/fixture_cards.html` (Node --test). Smoke thật: exe `--list` trên `?s=xmyao`.

## Rủi ro/chấp nhận

- Lần đầu chạy exe: profile rỗng → CF challenge cần click tay (chỉ vài lần đầu, persist).
- exe ~80-100MB (copy node.exe).

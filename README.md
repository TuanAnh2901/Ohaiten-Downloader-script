<div align="center">

# 🎬 Animehay CLI

**Tải video từ animehay.tv — nhanh, gọn, không rườm rà**  
**Download videos from animehay.tv — fast, lean, no bloat**

[![Version](https://img.shields.io/github/v/release/TuanAnh2901/Ohaiten-Downloader-script?color=%230567ff&label=Latest%20Release&style=for-the-badge)](https://github.com/TuanAnh2901/Ohaiten-Downloader-script/releases)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows-blue?style=for-the-badge)]()
[![yt-dlp](https://img.shields.io/badge/Powered%20By-yt--dlp-red?style=for-the-badge)](https://github.com/yt-dlp/yt-dlp)

</div>

```
╔══════════════════════════════════════════════════════════╗
║     Animehay CLI — yt-dlp wrapper for animehay.tv       ║
║     Single .exe → no Node.js, no npm, no hassle         ║
╚══════════════════════════════════════════════════════════╝
```

---

## 📋 Tính năng / Features

| 🇻🇳 Tiếng Việt | 🇬🇧 English |
|---|---|
| ✅ **Tải cả series** — tự động lấy danh sách tập, tải song song | ✅ **Full series download** — auto-detect episodes, concurrent downloads |
| ✅ **Tải tập lẻ** — URL `/xem-phim/` | ✅ **Single episode** — just paste a watch URL |
| ✅ **Batch từ file TXT** — trộn link series + tập lẻ | ✅ **Batch mode** — mix series and watch URLs in a text file |
| ✅ **Tự động skip file đã tải** — stat check, không tải lại | ✅ **Skip existing files** — stat-based, no re-downloads |
| ✅ **Tự động tải yt-dlp** — không cần cài thủ công | ✅ **Auto-download yt-dlp** — installs itself |
| ✅ **Tạo thư mục theo tên phim** — tự động sắp xếp | ✅ **Per-series subdirectories** — auto-organized |
| ✅ **Export cookie từ trình duyệt** — tránh lỗi 403 | ✅ **Browser cookie export** — bypass 403 errors |
| ✅ **Chọn chất lượng** — 480p, 720p, 1080p | ✅ **Resolution selector** — 480p, 720p, 1080p |
| ✅ **Lọc tập theo khoảng** — `--from` / `--to` | ✅ **Episode range filter** — `--from` / `--to` |
| ✅ **Đa luồng** — jobs + concurrent fragments | ✅ **Multi-threaded** — jobs + concurrent fragments |
| ✅ **Tự động thử lại khi lỗi** — retry 3 lần mặc định | ✅ **Auto-retry on failure** — 3 retries by default |
| ✅ **Portable .exe** — chạy được ngay, không cài đặt | ✅ **Portable .exe** — no installation required |

---

## 🚀 Quick Start / Bắt đầu nhanh

### Option 1: Download `.exe` (khuyên dùng / recommended)

Tải `animehay.exe` từ [Releases](https://github.com/TuanAnh2901/Ohaiten-Downloader-script/releases), mở Terminal, chạy:

```powershell
# Lần đầu: tự động tải yt-dlp, sau đó tải phim
.\animehay.exe https://animehay07.site/xem-phim/...tap-28-76147.html
```

**Không cần cài Node.js, không cần npm, không cần gì thêm.**  
File `.exe` (~96 MB) chứa luôn Node.js runtime.

### Option 2: Cài từ source (cần Node.js 20+)

```powershell
git clone https://github.com/TuanAnh2901/Ohaiten-Downloader-script.git
cd AnimehayCli
npm install
npm run build
node dist/index.cjs --help
```

---

## 🎯 Cách dùng chi tiết / Detailed Usage

### 📺 Tải một tập / Single Episode

```powershell
.\animehay.exe "https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html"
```

### 📦 Tải cả bộ / Full Series

```powershell
.\animehay.exe "https://animehay07.site/thong-tin-phim/tensei-shitara-slime-datta-ken-2658.html"
```
Tự động:
1. Lấy danh sách tập từ trang thông tin phim
2. Lọc bỏ link "phim liên kết" (related movies)
3. Sắp xếp, loại bỏ trùng lặp
4. Tải song song (`--jobs`, mặc định 3)

### 📋 Batch từ file TXT / Batch Mode

```powershell
.\animehay.exe --batch urls.txt
```

Nội dung file `urls.txt`:

```text
# Danh sách phim cần tải
https://animehay07.site/thong-tin-phim/tensei-shitara-slime-datta-ken-2658.html
https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html
```

Hỗ trợ trộn cả link series (`/thong-tin-phim/`) và link tập lẻ (`/xem-phim/`).  
Dòng `#` là comment, dòng trống bị bỏ qua.

### 🍪 Export Cookie / Cookie Export

Khi gặp lỗi 403, cần export cookie từ trình duyệt:

```powershell
.\animehay.exe cookies export chrome cookies.txt
```

Hỗ trợ: `chrome`, `firefox`, `edge`, `brave`, `opera`, `chromium`.

Sau đó dùng với flag `--cookies`:

```powershell
.\animehay.exe "URL" --cookies cookies.txt
```

---

## ⚙️ Flags / Options

| Flag | Default | Mô tả / Description |
|------|---------|---------------------|
| `--batch <file>` | — | File TXT chứa URL (1 URL/dòng) / Batch URL file |
| `--referer <url>` | `https://animehay.tv/` | Referer header (tự detect nếu bỏ qua) |
| `--cookies <file>` | — | File cookie Netscape / Netscape cookie file |
| `--output-dir <dir>` | `./downloads/` | Thư mục lưu file / Output directory |
| `--no-output-dir-per-series` | `true` | Tắt tạo thư mục theo tên phim / Disable per-series dir |
| `--yt-dlp-path <path>` | `yt-dlp` | Đường dẫn yt-dlp / yt-dlp binary path |
| `--jobs <n>` | `3` | Số tập tải song song (series) / Concurrent episodes |
| `--concurrent-fragments <n>` | `16` | Số fragment song song mỗi tập |
| `--from <n>` | — | Tập bắt đầu (series) / First episode number |
| `--to <n>` | — | Tập kết thúc (series) / Last episode number |
| `--res <height>` | — | Chất lượng: `480`, `720`, `1080` / Resolution |
| `--retries <n>` | `10` | Số lần thử lại khi lỗi (yt-dlp) / Download retries |
| `--episode-retries <n>` | `3` | Số lần thử lại tập bị lỗi (CLI) / Episode retry count |
| `--buffer-size <size>` | `32M` | Kích thước buffer / Buffer size |
| `--socket-timeout <s>` | `30` | Timeout socket (giây) / Socket timeout (seconds) |
| `--temp <dir>` | `%TEMP%` | Thư mục tạm / Temp directory |
| `--dry-run` | `false` | Chỉ in lệnh, không tải / Print command only |
| `--verbose` | `false` | In chi tiết / Verbose output |
| `--install-yt-dlp` | `false` | Tải yt-dlp rồi thoát / Download yt-dlp and exit |

---

## 🖥️ Ví dụ thực tế / Real-world Examples

```powershell
# Tải phim chất lượng cao, tăng tốc
.\animehay.exe "URL" --res 1080 --concurrent-fragments 32 --jobs 12

# Tải từ tập 5 đến 10
.\animehay.exe "URL" --from 5 --to 10

# Tải batch, tạo thư mục theo tên phim, 1080p
.\animehay.exe --batch batch.txt --res 1080

# Chỉ xem lệnh yt-dlp sẽ chạy
.\animehay.exe "URL" --dry-run

# Tải trước yt-dlp (khi có mạng)
.\animehay.exe --install-yt-dlp
```

---

## 🔄 Ví dụ output / Output Examples

### Tải series lần đầu:
```
Tap 1  [████████████████████] 100%   120.5 MB   16.2 MiB/s  ETA 00:00
Tap 2  [████████░░░░░░░░░░░░] 55.3%  65.2 MiB   12.1 MiB/s  ETA 00:05
Tap 3  [█████████████░░░░░░░] 72.1%  85.0 MiB   14.5 MiB/s  ETA 00:02
```

### Chạy lại (tự động skip):
```
Tap 1  [SKIP] Already exists
Tap 2  [SKIP] Already exists
Tap 3  [SKIP] Already exists
[DONE] 0 downloaded, 27 skipped
```

### Tải thêm tập mới:
```
Tap 24  [████████████████████] 100%   133.7 MB   15.8 MiB/s  ETA 00:00
Tap 25  [████████░░░░░░░░░░░░] 40.0%  53.5 MB   11.2 MiB/s  ETA 00:08
[DONE] 2 downloaded, 25 skipped
```

---

## 🏗️ Kiến trúc / Architecture

```
AnimehayCli/
├── animehay.exe         # Single executable (Node.js SEA)
├── src/
│   ├── index.ts         # CLI entry point, Commander setup
│   ├── watch.ts         # Single episode download pipeline
│   ├── series.ts        # Series download with worker pool
│   ├── batch.ts         # Batch file processing
│   ├── cmd-builder.ts   # yt-dlp argument builder
│   ├── progress.ts      # Progress bar parser
│   ├── multiprogress.ts # Multi-job progress display
│   ├── cookies.ts       # Browser cookie export
│   ├── install-ytdlp.ts # Auto-download yt-dlp
│   └── core-shim.ts     # GM_* shim for core library
├── test/                # 84+ Vitest test cases
└── bin/                 # Launcher scripts + yt-dlp (auto-downloaded)
```

**Cách hoạt động / How it works:**

```
Animehay CLI                   yt-dlp                 File
     │                           │                      │
     ├─ Fetch watch page ────────┤                      │
     ├─ Parse iframe URL ────────┤                      │
     ├─ Build stream URL ────────┤                      │
     ├─ Spawn yt-dlp ────────────┤                      │
     │                           ├─ Download fragments ─┤
     │                           ├─ Merge → .mp4 ───────┤
     │                           │                      │
     ├─ Check existing file ─────┤                      │
     │   (skip if ≥ 1 MB)        │                      │
     └─ Return result ───────────┘                      │
```

**Tại sao dùng yt-dlp thay vì tự xử lý HLS?** / Why yt-dlp?

- ✅ Không tốn RAM (yt-dlp stream trực tiếp ra file)
- ✅ Tự động xử lý HLS, DASH, URL m3u8
- ✅ Fragment đa luồng (tăng tốc đáng kể)
- ✅ Hỗ trợ cookie, referer, user-agent
- ✅ Resume khi mất mạng
- ✅ Không cần ffmpeg (yt-dlp tích hợp sẵn)

---

## 🛠️ Phát triển / Development

### Yêu cầu

- **Node.js** 20+ (cho dev)
- **TypeScript** 5.5+
- **npm** 9+

### Build

```powershell
npm install
npm run build          # esbuild → dist/index.cjs
npm run build:sea      # (optional) Node SEA → animehay.exe
```

### Test

```powershell
npm test               # 84+ test cases, Vitest
npm run verify-scope   # Kiểm tra không modify AnimehayDownloader
```

### Tạo file .exe

```powershell
npm run build:sea
# Output: ./animehay.exe (~96 MB, chứa Node.js runtime)
```

---

## 📖 Hướng dẫn chia sẻ / Sharing

**Chỉ cần 1 file `animehay.exe`** — người dùng không cần cài Node.js, không cần cài npm, không cần cài gì cả.

Lần đầu chạy, CLI tự động tải yt-dlp từ GitHub về `./bin/yt-dlp.exe`.  
Nếu muốn tải trước: `animehay --install-yt-dlp`.

```powershell
# Bạn: gửi file animehay.exe
# Họ: mở Terminal, gõ:
.\animehay.exe "URL"
```

---

## 🌐 Animehay đổi domain / Domain Changes

Animehay thường xuyên đổi domain (animehay05.site → animehay07.site → animehay08.site...). CLI tự động xử lý nhờ cơ chế probe + cache:

1. **Probe** `https://animehay.tv/` (domain gốc) để tìm mirror
2. **Cache** kết quả 6 giờ
3. **Fallback** — nếu probe thất bại, dùng `--referer` để ghi đè

```powershell
.\animehay.exe --referer "https://animehay08.site" "https://animehay08.site/xem-phim/..."
```

---

## 📝 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Animehay CLI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## ⭐ Support

- ⭐ Star trên GitHub nếu bạn thấy hữu ích!
- [🐛 Báo lỗi / Report issues](https://github.com/TuanAnh2901/Ohaiten-Downloader-script/issues)
- [📧 Liên hệ / Contact](https://github.com/TuanAnh2901)

---

<div align="center">
  <sub>Built with ❤️ using Node.js + TypeScript + yt-dlp</sub>
  <br>
  <sub>Powered by SEA (Single Executable Application)</sub>
</div>

# Animehay CLI

CLI tool tải video từ animehay.tv, dùng `yt-dlp` làm engine tải thật sự (không Blob, không JavaScript HLS merge, không tốn RAM).

## Yêu cầu

- **yt-dlp** — bắt buộc. Nếu chưa có, CLI tự động tải về từ GitHub khi chạy.
  - Hoặc cài thủ công: `winget install yt-dlp`
- **ffmpeg** — thường đi kèm yt-dlp, nếu thiếu: `winget install ffmpeg`

## Cài đặt

### Dùng file `.exe` (recommended — share được cho người khác)

File `animehay.exe` (~96 MB) chứa luôn Node.js, chạy trực tiếp không cần cài gì.  
**yt-dlp** sẽ được tự động tải về lần đầu chạy nếu chưa có.

```powershell
.\animehay.exe --help
```

### Cài từ source (cần Node.js)

```powershell
cd AnimehayCli
npm install
npm run build
npm run build:sea        # tạo animehay.exe
```

---

## Lệnh và tác dụng

### `animehay <url> [options]`

Lệnh chính — tự động phát hiện URL là tập lẻ hay series, tải về.

| Tình huống | Lệnh |
|---|---|
| Tập lẻ (watch page) | `animehay https://animehay07.site/xem-phim/...tap-28-76147.html` |
| Cả series (info page) | `animehay https://animehay07.site/thong-tin-phim/...4541.html` |
| Lọc tập | `animehay ... --from 25 --to 28` |
| Chọn chất lượng | `animehay ... --res 1080` |
| Tăng tốc | `animehay ... --concurrent-fragments 32` |
| Tải từ file TXT | `animehay --batch urls.txt` |
| Tạo thư mục theo bộ | `animehay ... --output-dir-per-series` |
| Chỉ in lệnh (không tải) | `animehay ... --dry-run` |

### `animehay cookies export <browser> <outPath>`

Export cookie từ browser để gửi kèm request (tránh 403 khi tải thật).

```powershell
animehay cookies export chrome cookies.txt
```

Hỗ trợ: `chrome`, `firefox`, `edge`, `brave`, `opera`, `chromium`.

---

## Bảng options

| Flag | Mặc định | Tác dụng |
|------|----------|----------|
| `--install-yt-dlp` | — | Tải yt-dlp về `./bin/` rồi thoát (không cần URL) |
| `--res <height>` | — | Chọn resolution: `480`, `720`, `1080` |
| `--jobs <n>` | `3` | Số tập tải song song (series) |
| `--concurrent-fragments <n>` | `16` | Số fragment song song / tập (càng cao càng nhanh) |
| `--buffer-size <size>` | `32M` | Kích thước buffer |
| `--socket-timeout <s>` | `30` | Timeout socket |
| `--retries <n>` | `10` | Retry khi lỗi |
| `--referer <url>` | tự detect | Referer header |
| `--cookies <file>` | — | File cookie Netscape |
| `--output-dir <dir>` | `./downloads/` | Thư mục output |
| `--output-dir-per-series` | — | Với series/batch series, tạo thư mục con theo tên bộ trong output-dir |
| `--yt-dlp-path <path>` | `yt-dlp` | Đường dẫn yt-dlp |
| `--temp <dir>` | `%TEMP%` | Thư mục tạm |
| `--from <n>` | — | Tập bắt đầu (series) |
| `--to <n>` | — | Tập kết thúc (series) |
| `--dry-run` | — | Chỉ in lệnh, không tải |
| `--verbose` | — | In chi tiết |

### Batch download từ file TXT

File TXT: 1 URL mỗi dòng. Dòng trống và dòng bắt đầu bằng `#` sẽ bị bỏ qua.

```text
# urls.txt
https://animehay07.site/thong-tin-phim/...4541.html
https://animehay07.site/xem-phim/...tap-28-76147.html
```

```powershell
animehay --batch urls.txt --output-dir-per-series --jobs 3 --res 1080
```

Batch hỗ trợ trộn cả link bộ phim (`/thong-tin-phim/`) và link tập lẻ (`/xem-phim/`). Các URL trong file chạy tuần tự; mỗi series vẫn dùng `--jobs` để tải nhiều tập song song.

---

## Progress multi-line

Với `--jobs 3`, hiển thị 3 dòng song song:

```
Tap 25  [████████████████████] 100%   120.5 MB   Done
Tap 26  [████████░░░░░░░░░░░░] 40%    48.0 MB   5.2 MB/s  ETA 00:14
Tap 27  [████████████████████] 100%   120.5 MB   Done
```

Khi 1 tập xong, worker lấy ngay tập tiếp theo — không có chuyện 3 jobs mà chỉ 1 chạy.

---

## Resume & skip existing

- File đã có dung lượng > 0 → **bỏ qua, không tải lại**
- File tải dở (0 byte / thiếu) → yt-dlp resume qua `--continue`
- HEAD check: so sánh dung lượng local với remote (yt-dlp tự xử lý)

---

## Chia sẻ file `.exe` cho người khác

**File `animehay.exe` đã chứa Node.js** → người dùng không cần cài Node.

**yt-dlp được tự động tải về lần đầu chạy**, không cần cài thủ công.  
Nếu muốn tải trước: `animehay --install-yt-dlp`

Hoặc download `yt-dlp.exe` từ [github](https://github.com/yt-dlp/yt-dlp/releases) bỏ vào `bin/` cạnh `animehay.exe`.

---

## Animehay đổi domain thì sao?

CLI tự động xử lý nhờ cơ chế trong `domain.ts`:

1. **Probe** `https://animehay.tv/` (luôn là domain gốc) để tìm mirror hiện tại
2. **Cache** kết quả 6 giờ
3. **Fallback** — nếu animehay.tv chết, dùng `--referer` để chỉ định domain mới

```powershell
# Nếu mirror mới chưa được cache:
animehay --referer https://animehay05.com - ... "https://animehay05.com/xem-phim/..."
```

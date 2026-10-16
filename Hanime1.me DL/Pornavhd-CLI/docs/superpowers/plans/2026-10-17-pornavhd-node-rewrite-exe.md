# Pornavhd-CLI Node Rewrite + SEA exe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `pornavhd.exe` single-file (Node SEA) feature-parity với `pornavhd.py`, 0 runtime npm dep.

**Architecture:** Toàn bộ logic 1 file `src/main.ts`; CDP client tự viết điều khiển Edge/Chrome thật (mọi HTTP qua browser); esbuild → dist/index.cjs → Node SEA + postject → exe.

**Tech Stack:** TypeScript (strict), Node >=22 built-in (WebSocket, http, child_process, fs), esbuild (dev), postject qua npx (build only).

**Spec:** `docs/superpowers/specs/2026-10-17-pornavhd-cli-exe-node-rewrite-design.md`

## Global Constraints

- Node >=22 required (global WebSocket). Build script phải check.
- Runtime npm deps: 0. Runtime yêu cầu bên ngoài: Edge/Chrome + ffmpeg PATH.
- Dev deps chỉ: `esbuild`, `@types/node`. TypeScript syntax nhẹ, không cần tsc strict pass — esbuild build được là chạy.
- Regex port từ `pornavhd.py` giữ nguyên: `AD_STREAM_HOSTS = ("growcdnssedge","whitetrafsa","tiktokcdn")`, ARTICLE/HREF/POSTID/DUR regex, `sanitize` (strip `\\/:*?"<>|`, cắt 120 ký tự).
- Output message giữ bracket prefix: `[skip] [ok] [FAIL] [actor] [search]`, progress `% (got/total)`.
- Port câu chữ bên ngoài (log) cố gắng giữ nghĩa gốc tiếng Việt khi tương đương.

## Review Focus

- Node fetch thuần bị CF chặn — phải phát hiện nếu listing trả trang "Just a moment" (đi qua browser nên thường không xảy ra; vẫn guard).
- IFrame recordplay có thể đổi URL — matcher `/e/|recordplay` giữ mềm.
- Playlist biến thể — chọn `variant` theo res y như bản Python (h <= res nếu có, cao nhất).
- Browser process báo lỗi (Edge không cài) — fallback chrome rồi chromium-bundle-like error message rõ.
- SEA exe chạy từ thư mục khác — profile/output relative to exe dir (`path.dirname(process.execPath)` khi chạy exe, cwd khi chạy node dev).

---

### Task 1: Scaffold Node project + build pipeline

**Files:**
- Create: `package.json`, `tsconfig.json`, `build.mjs`, `.gitignore` (dist/, node_modules/, downloads/, .pw-profile*, *.exe)
- Test: build chạy được.

**Interfaces:**
- Produces: `npm run build` → `dist/index.cjs` (CJS, target node22, minify off). Entry hiện tạm `src/main.ts` stub `console.log("ok")`.

- [ ] Step 1: viết package.json scripts: `build`, `dev` (node dist/index.cjs), `test` (node --test test/). Dev deps: esbuild, @types/node.
- [ ] Step 2: npm install, build stub → chạy `node dist/index.cjs` in `ok`.
- [ ] Step 3: commit `chore: scaffold node build pipeline`.

### Task 2: Port listing logic (parse + page URL builder)

**Files:**
- Create: `src/listing.ts`, `test/listing.test.js`
- Test: fixture `tests/fixture_cards.html` (đã có).

**Interfaces:**
- Produces: `parseCards(html: string): Vid[]` với `Vid = {id,url,title,duration}`; `sanitize(name: string): string`; `buildPageUrl(listUrl: string, page: number): string` (trang 1 = url gốc; N>1 = `{origin}{path}/page/N/` giữ query); `isCfChallenge(html): boolean` (detect "Just a moment").
- Test assert: 3 card, id 101152, url `https://pornavhd.com/2026/03/29/xmyao1998_104/`, title `XMYao1998_104`, duration `27:07`; buildPageUrl("https://pornavhd.com/?s=xmyao", 2) === "https://pornavhd.com/page/2/?s=xmyao".

- [ ] Step 1: test fail (module chưa có)
- [ ] Step 2: port parse_cards/sanitize từ `pornavhd.py:40-94`
- [ ] Step 3: npm test pass
- [ ] Step 4: commit `feat: port listing parse sang TS`.

### Task 3: CDP client

**Files:**
- Create: `src/cdp.ts`, `test/cdp.onboarding.test.js` (unit nhỏ nhất).

**Interfaces:**
- Produces:
  `class Browser { static launch(profileDir: string): Promise<Browser>; newPage(url?: string): Promise<Page>; close(): Promise<void>; }`
  `class Page { goto(url, timeoutMs=45000): Promise<void>; html(): Promise<string>; frames(): FrameInfo[]; evalInFrames<T>(urlMatch: RegExp, expr: string): Promise<(T|null)[]>; on("response", cb: (r: CdpResponse) => void): void; waitForResponses(pred, timeoutMs): Promise<void>; getBody(requestId: string, sessionId: string): Promise<Buffer>; close(): Promise<void>; }`
  `CdpResponse = { url: string; status: number; contentType: string; requestId: string; sessionId: string; }`
- Thuật toán chỉ định (algorithm the tests don't determine):
  1. Tìm browser: thử msedge/chrome paths (LOCALAPPDATA `%LOCALAPPDATA%\msedge.exe` dạng `...\Edge\Application\msedge.exe`, `...\Google\Chrome\Application\chrome.exe`, `Program Files` tương tự).
  2. spawn `[path, --remote-debugging-port=0, --user-data-dir=profileDir, --no-first-run, --disable-blink-features=AutomationControlled]`, đọc stderr regex `ws://...devtools/browser/...` (DevToolsActivePort stderr line `DevTools listening on ws://...`).
  3. Connect WebSocket browser-level; `Target.setDiscoverTargets {discover:true}`; mỗi page target mới (hoạt động: `Target.attachedToTarget`) → attach `flatten:true`, tạo session: `Page.enable`, `Runtime.enable`, `Network.enable` (broad phát event theo sessionId).
  4. `goto`: `Page.navigate` trong page session; chờ `Page.loadEventFired` hoặc timeout (không block spinner).
  5. `evalInFrames`: lấy `Runtime.evaluate` riêng từng target (iframe là target con flatten) — hoặc `Page.createIsolatedWorld` + frame tree qua `Page.getFrameTree`; đơn giản hóa: attach mọi target type "iframe", evaluate theo `targetInfo.url`.
  6. Bodies: `Network.getResponseBody` trong sessionId của response tương ứng; base64/boolean decode theo `Network.getResponseBody` result (`base64` field).
- Options test được (unit): decode body helper `decodeBody(data: string, base64: boolean): Buffer`.

- [ ] Step 1: test decode helper fail
- [ ] Step 2: implement cdp.ts
- [ ] Step 3: test pass; smoke tay: launch browser newPage("https://pornavhd.com/?s=xmyao") in html chứa `thumb-block` (manual check)
- [ ] Step 4: commit `feat: cdp client`.

### Task 4: Port download flow

**Files:**
- Create: `src/dl.ts`, `test/variant.test.js`

**Interfaces:**
- Consumes: Task 3 `Page`; Task 2 helpers.
- Produces:
  `parseVariant(text: string, baseUrl: string): {segs: string[]; init: string|null}` — port `pornavhd.py:102-114`.
  `isAdHost(url: string): boolean`; `isPlaylist(url: string): boolean`.
  `downloadVideo(page: Page, videoUrl: string, destPath: string, opts: {res?: number; title: string; log: (s: string)=>void; stallMs?: number}): Promise<boolean>` — flow: response listener (port on_response `pornavhd.py:227-247`), go, chờ variant, chọn variant theo res, speedup 16x, poll segment count (stall 180s), concat init+segs → `ffmpeg -y -v error -i <file>.mp4.tmp -c copy -movflags +faststart <dest>` (temp file + return code raise).
- Test: parseVariant fixture inline (variant m3u8 nhỏ với EXT-X-MAP + 3 segment), isAdHost/isPlaylist bàn parse đúng.

- [ ] Step 1: test fail
- [ ] Step 2: implement dl.ts
- [ ] Step 3: test pass
- [ ] Step 4: commit `feat: download flow port`.

### Task 5: CLI main + worker pool

**Files:**
- Create: `src/main.ts`; `test/args.test.js`

**Interfaces:**
- Consumes: Task 2/3/4.
- Produces: `runCli(argv: string[]): Promise<number>` (0 ok, 1 fail); entry `main.ts` gọi khi chạy trực tiếp.
- Flags parity: `--batch --output-dir --list --jobs --res --from --to --retries`. Target class: video URL (`/20../..`), actor (`/actor/`), search (`?s=`), batch file. Range slice, subfolder sanitize(slug/search-term), skip-existing>=1MB cũng tại đây.
- Worker pool: event loop async — `jobs > 1` → `jobs` browser instances riêng, mỗi instance 1 loop tiêu thụ vid từ shared index (giống Python next_vid lock → nó async JS, không cần lock).
- Tranh luận the only algorithm choice: `jobs` browser = spawn từng cái, chia profile `.pw-profile-wN`.

- [ ] Step 1: test args classify (videoUrlTarget vs actor vs search vs batch path; range slice từ 1-đánh index)
- [ ] Step 2: implement main.ts các mode + runCli
- [ ] Step 3: test pass; smoke `--list` search thật qua browser
- [ ] Step 4: commit `feat: cli main`.

### Task 6: SEA exe

**Files:**
- Create: `sea-config.json` (`main` `dist/index.cjs`), `build-sea.mjs`
- Produces: `npm run build:sea` → `pornavhd.exe`.

- [ ] Step 1: build-sea.mjs (port logic `AnimehayCLI/build-sea.mjs` 1:1, đổi tên exe `pornavhd.exe`, check Node >=22 thay >=20; dùng `npx --yes postject`)
- [ ] Step 2: `npm run build:sea` tạo exe; chạy `pornavhd.exe --help` từ thư mục khác in đúng help
- [ ] Step 3: smoke thật: `pornavhd.exe "https://pornavhd.com/?s=xmyao" --list --to 5` in listing (có browser thật)
- [ ] Step 4: commit `feat: sea build exe`.
- [ ] Step 5 (nếu bị AV flag exe): ghi chú README.

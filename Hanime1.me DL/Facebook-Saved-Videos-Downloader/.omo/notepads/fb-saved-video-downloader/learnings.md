# Learnings
## [2026-08-03] Planning session complete
- Stack: TS ESM NodeNext, commander ^12, vitest, playwright, native fetch, yt-dlp child_process (mirror AnimehayCLI)
- Save timestamp NOT exposed by FB product - spike (T3) tries saved_time/created_time/save_date live; fallback publish date
- GraphQL doc_ids from dump: LeftRail=27602599562734455, CollectionItems=26605228462486746, AllItems=27174039202273427
- Collection URLs: /saved/?list_id={id}; items: /watch/?ref=saved&v={video_id}
- Filter: content_filter VIDEOS=2, REELS=26
- 5 collections in dump: Ahihi(302722351189018), Anime(165363141591607), Download(426792272115358), Khoa hoc CN(205843814210206), De xem sau(145653533562568)
- 10 videos in dump (v=1005655615768824, 1036239645584654, 1080214581010336, 1365128951610696, 1564113441753478, 1570312221305439, 1616437686111850, 2138608167535448, 2244898599679122, 2904511416577621)
- Playwright cookies need ".facebook.com" leading dot; headed mode required; /login|/checkpoint bail
- yt-dlp: use nightly channel, --cookies netscape.txt, -f "bv*[height<=1080]+ba/b[height<=1080]", --merge-output-format mp4
## [2026-08-03] Task 1 scaffolding complete
- package.json: ESM, engines node>=20, deps commander ^12 + playwright ^1.59; devDeps typescript ^5.5, tsx ^4.16, esbuild ^0.23, vitest ^1.6, @playwright/test ^1.59, @types/node ^20; version 0.1.0
- tsconfig: NodeNext/NodeNext, strict, ES2022, rootDir src, outDir dist (no path aliases - no core dep)
- build.mjs: esbuild ESM bundle, external [node:*, commander, playwright], target node20, sourcemap
- bin/fb-saved-dl.js: ESM launcher importing ../dist/index.js (adapted from animehay.js CJS)
- src/index.ts: minimal commander entry, version 0.1.0 + placeholder hello command
- Verified: npm install exit 0 (88 pkgs), npm run build exit 0, node bin/fb-saved-dl.js --version → 0.1.0, hello action works
- Note: npm warned esbuild postinstall scripts blocked by allowScripts policy but build worked anyway
## [2026-08-03] Task 7 error framework + exit codes complete
- src/errors.ts: FbSavedCliError(code, message) mirrors AnimehayCliError; codes FETCH_GRAPHQL/AUTH_FAILED/YT_DLP_FAILED/COOKIES_INVALID/NO_VIDEOS/PAGINATION_LOOP; exitCodeFor: auth+cookies→2, yt-dlp+graphql+pagination→1, no-videos→3, default→1; EXIT_OK=0/EXIT_PARTIAL=1/EXIT_FATAL=2/EXIT_NOTHING=3
- src/report.ts: Report class - addDownloaded/addFailure/addSkipped counters, writeReportFile({dir}/report-YYYYMMDD-HHmmss.json, creates dir, shape {timestamp,summary,failures,skipped}), summaryText '[DONE] X downloaded, Y failed, Z skipped', exitCode: failed>0→1; downloaded==0&&skipped==0→3; else 0
- Note: task spec listed only addFailure/addSkipped but exitCode needs downloaded tracking - added addDownloaded() as natural counterpart
- Tests: test/errors.test.ts (9) + test/report.test.ts (11), vitest 20/20 GREEN, tsc --noEmit clean; report tests use os.tmpdir() only
- Note: no TS LSP on this machine (declined) - verify with tsc --noEmit instead

## [2026-08-03] Task 6 fixtures extracted
- test/fixtures/collections.json: 5 collections (Ahihi 302722351189018, Anime 165363141591607, Download 426792272115358, Khoa hoc & CN 205843814210206, De xem sau 145653533562568). NOTE: dump's Ahihi name has kaomoji suffix "Ahihi ಡ ͜ ʖ ಡ" - fixture uses clean "Ahihi" per plan
- test/fixtures/items.json: 10 videos {videoId,title,collectionId?}; collectionId=426792272115358 on 1564113441753478 + 2244898599679122 ("Đã lưu vào Download" in dump); no timestamps (FB doesn't expose save time)
- graphql-collections-page1.json: CometSaveLeftRailPaginationQuery (27602599562734455), 5 edges, has_next_page=false
- graphql-items-page1.json: CollectionItems doc 26605228462486746, 5 edges VIDEO, has_next_page=true, end_cursor c5
- graphql-items-page2.json: 5 VIDEO + 1 synthetic PHOTO (node _note field, id 999999999999999) for content_filter exclusion test, has_next_page=false, end_cursor c11
- Dump has BOTH /watch/?v= AND /reel/{id}/ permalinks for saved items - reel URLs exist in SSR (no synthetic reel needed)
- Playable durations parsed from SSR (e.g. 03:29 -> 209s)
- Titles: real captions from SSR text near each watch link; 1570312221305439 had no caption text -> placeholder "saved-video-1570312221305439"
## [2026-08-03] Task 5 cookies module complete
- src/cookies.ts: parseNetscapeFile (7 tab fields, skip # comments, #HttpOnly_ prefix -> httpOnly flag), toPlaywrightCookies (leading-dot domain, expires 0->-1, sameSite Lax), toCookieHeader (name=value; join). No deps, ~90 lines
- #HttpOnly_ check must come BEFORE generic # comment skip - #HttpOnly_.facebook.com starts with '#' but is a real cookie line
- Playwright addCookies domain MUST be leading-dot (.facebook.com) else cookie won't match subdomains; expires -1 = session
- Test reads real fixture via readFileSync(new URL('../Facebook-cookies.txt', import.meta.url)) - stays live, no hardcoded fixture; synthetic #HttpOnly_ line in separate test
- Fixture facts: 15 lines = 4 comment/blank (lines 1-4) + 11 cookies; ar_debug + presence are session cookies (expires 0)
- tests: 4 in cookies.test.ts (parse count/order, #HttpOnly_, domain+expiry transform, header content), suite 24/24 GREEN, tsc --noEmit clean
- ponytail note: no encoding in toCookieHeader (raw name=value per spec; watch.ts encodeURIComponent double-encodes already-%-encoded FB values like xs/presence)

## [2026-08-03] Task 2 gitignore secrets + artifacts complete
- .gitignore: Facebook-cookies.txt, *.cookies.txt, playwright-profile/, downloads/, .omo/evidence/, *.done.json, dist/, node_modules/, reports/, spike/*.mp4
- git check-ignore Facebook-cookies.txt → exit 0, rule from .gitignore:1; git ls-files shows zero cookie files (17 tracked, all scaffolding/fixtures)
- Commit: chore: gitignore secrets and artifacts (only .gitignore staged; repo root D:\VSCode, path prefix "Hanime1.me DL/Facebook-Saved-Videos-Downloader/")
- Note: PowerShell Select-String -Quiet + $? is misleading ($? = command success, not match) - use direct output grep instead

## [2026-08-03] Task 4 spike: yt-dlp nightly validates end-to-end
- Nightly exe 2026.07.23.234303 (spike/yt-dlp.exe) bundles Python 3.10 + ffmpeg 7.1.1/ffprobe — no external deps; plain pip yt-dlp lacks ffmpeg
- HD (720/1080) formats REQUIRED cookies (Facebook-cookies.txt); without them only sd/hd unknowns
- watch video: DASH AV1 960x720 x5 + 1440x1080, audio m4a 60k; -f "bv*[height<=1080]+ba/b[height<=1080]" merges to mp4 fine
- Test dl: 1,348,809 bytes, 15.548s, valid ftyp mp4
- /reel/{id}/ permalinks work with same extractor+cookies: vertical 540x960 to 1080x1920 DASH; dump's 7 reel IDs all map to watch IDs
- Gotcha: --print re-extraction hit transient "Cannot parse data" once, retry OK — wrap FB metadata calls w/ 1 retry

## [2026-08-03 09:38] yt-dlp COOKIE SCRUBBING INCIDENT (CRITICAL)
- yt-dlp `--cookies FILE` is READ-WRITE: it rewrites the file on exit, DROPPING HttpOnly session cookies (c_user, xs, presence).
- T4 spike passed the LIVE Facebook-cookies.txt to yt-dlp; file went 11 cookies -> 8 (c_user/xs/presence lost). Header became `# This file is generated by yt-dlp`.
- This invalidated T3 GraphQL probe results (raw fetch WAF 1357054 + Playwright login page were SYMPTOMS of scrubbed session, NOT dead cookies).
- ORIGINAL cookies recovered from backup `1b95ae69-9f89-4dce-8cfd-3a3542347a72.txt` (11 cookies, incl. c_user=<redacted>, xs, presence). User then re-exported fresh cookies (09:31).
- RULE for download module (T16+): NEVER pass the master cookie file to yt-dlp. Copy it to a temp path first (e.g. `.tmp-cookies.txt` in gitignored dir), pass the copy. Or use `--load-cookies` (read-only? verify) — safest: temp COPY + delete after.
- T3 conclusion "cookies invalid" was WRONG. GraphQL auth path still unproven — T3 must be RE-RUN with valid cookies.

## [2026-08-03 09:37] T5 test fix
- test/cookies.test.ts now uses synthetic fixture test/fixtures/cookies.txt (fake values) + order-independent assertions. Never depends on live cookie file.
- Commit 2c8b33c. 24/24 tests pass, tsc clean.

## [2026-08-03] Task 9 auth module complete
- src/auth.ts: launchAuthenticated(cookieFile, {userDataDir}) = chromium.launchPersistentContext HEADED (headless:false) + --disable-blink-features=AutomationControlled; addCookies(toPlaywrightCookies(...)) BEFORE first navigation (file is READ-only here, unlike yt-dlp); returns {context, page} (persistent context = no separate browser); assertLoggedIn: /login|/checkpoint in page.url() OR login-form selector (input[name=email], form[action*=login]) → FbSavedCliError(AUTH_FAILED, 'refresh cookies') exit 2, NO retry; closeBrowser = context.close()
- test/auth.test.ts: 2 route-mocked tests (302 /saved→/login fulfill → assertLoggedIn throws AUTH_FAILED w/ 'refresh cookies'; context.cookies() contains c_user/xs/fr with .facebook.com domains). Uses test/fixtures/cookies.txt + temp profile via fs.mkdtempSync. Windows gotcha: URL.pathname leaves %20/leading-slash — use fileURLToPath(). Vitest 5s default timeout too short for headed launch+goto → it(name, fn, 30000)
- Playwright chromium browsers were installed for build 1187 but npm had playwright 1.62.1 needing build 1234 — ran `npx playwright install chromium` (190MB) to fix
- LIVE CHECK PASSED (headed, real Facebook-cookies.txt, temp profile): /saved loaded at https://www.facebook.com/saved (no login redirect), title "(2) Đã lưu | Facebook" — user's cookies validated end-to-end w/ Playwright
- NOTE: src/download.ts + test/download.test.ts (concurrent T16 task) were mid-work/broken during my verification — tsc errors confined to download.ts; excluded from my commit. Run npx tsc --noEmit after T16 lands

## [2026-08-03] Task 13 download coordinator complete
- src/download.ts: buildYtDlpArgs (mirrors AnimehayCLI exactly: --cookies, -f bv*[height<=1080]+ba/b[height<=1080], --merge-output-format mp4, --remux-video mp4, --no-playlist, -N 4, --retries 3, --fragment-retries 10, --skip-unavailable-fragments, -o, --no-overwrites, --print after_move:filepath, URL last)
- COOKIE SAFETY: copyCookiesForYtDlp copies master -> os.tmpdir()/fb-saved-dl-cookies-<pid>-<hex>.txt, passes COPY to yt-dlp, deletes in finally. Master NEVER passed to yt-dlp (validated by tests).
- Resume: .done.json marker = PRIMARY skip; file >=1MB w/o marker also skipped; small file w/o marker still downloads (Metis fix)
- Pool: cursor worker pool mirroring Animehay series.ts, jobs default 3, per-item isolation (only AUTH_FAILED throws)
- getUploadDate: --print %(upload_date)s w/ temp cookie copy, 1 retry, null on failure (non-fatal)
- Auth detection: /sign in|login|log in|cookies/i ONLY when exit code != 0
- TESTING GOTCHA: vitest 1.6 vi.mock(node:child_process) does NOT intercept externalized node builtins without server.deps.inline config. Solution: dependency-inject spawnFn (test seam, defaults to real spawn). Fake spawn = EventEmitter + PassThrough stdout/stderr.
- Second gotcha: pool tests must drain ALL procs (wait until spawned count == items AND all exited), not just "while any readable" — jobs=1 hangs otherwise
- 91/91 tests pass (16 new), tsc clean, build exit 0. Commit feat(download).

## [2026-08-03 11:10] T9+T13 complete — vitest builtin-mock lesson
- T9 auth.ts: headed persistent context + addCookies + login/checkpoint bail. LIVE CHECK PASSED: real cookies navigate /saved, title "(2) Đã lưu | Facebook", no login redirect. Playwright auth path VALIDATED end-to-end.
- T13 download.ts: yt-dlp coordinator with temp-copy cookie safety (master file NEVER passed to yt-dlp — copy to tmpdir, pass copy, delete after), markers, bounded pool (default 3), per-item isolation (only AUTH_FAILED throws).
- VITEST GOTCHA: vi.mock('node:child_process') does NOT intercept — node builtins are externalized. DO NOT mock builtins; use DI seam (spawnFn option defaulting to real spawn). 91/91 tests.
- tsc gotcha: node:fs callback fns (copyFile/unlink) have different signatures than promise versions — import promise fns from 'node:fs/promises'.

## [2026-08-03 11:30] T3 SPIKE DECISION (ARCHITECTURE GATE) — REVISED PATH
- A=YES: all-saves GraphQL doc 27174039202273427 covers EVERYTHING: 220+ items (still paginating at 22 pages), incl. 45 uncategorized (20.5%) that per-collection iteration would MISS. Per-collection counts via containing_lists embedded in item nodes (sum 175 = 220-45 ✓). 10 collections total (5 new found).
- B=NONE: NO save-timestamp field exists on any item node. Zero time fields. publish_time (post publish date) is the only proxy.
- ENDPOINT: /api/graphql/ SINGLE (NOT graphqlbatch!). POST form: doc_id + variables(JSON string, content_filter is ARRAY, count clamped to 10/page) + fb_api_req_friendly_name + fb_dtsg (page.evaluate require('DTSG').getToken()) + lsd/jazoest + __comet_req=1.
- graphqlbatch rejected (error 1675002 Incorrect Query); raw q= text → HTTP 500.
- CollectionItems doc 26605228462486746 FAILS (missing_required_variable_value) → use natural list_id page SSR (CometSaveCollectionRootQueryRelayPreloader) instead. Validated: Ahihi list_id 302722351189018 = 7 items.
- RECOMMENDED ARCHITECTURE: single all-saves stream (covers 100% incl. uncategorized), tag collections from containing_lists, folder per collection + _uncategorized/ folder. NO per-collection GraphQL needed. Timestamp = publish_time proxy (documented approximation).
- USER PREFERENCE CONFLICT: user explicitly said per-collection (avoid cref=28 page, feared missing old). Spike PROVES all-saves GraphQL QUERY (not the cref page) does NOT miss old videos + per-collection WOULD miss 45 uncategorized. -> PENDING USER CONFIRMATION before T16 design.
- Request format ground truth captured in spike/evidence/rerun/ + findings.md.

## [2026-08-03] Task 8 graphql client complete
- src/graphql.ts: queryGraphQL (page.evaluate fetch to /api/graphql/ SINGLE endpoint, form body doc_id+variables(JSON string, content_filter ARRAY)+fb_api_req_friendly_name+fb_dtsg+lsd+jazoest+__comet_req=1, exp backoff retry max 3 base 2s cap 15s, strips for(;;); prefix, detects error/errors field, throws FETCH_GRAPHQL), collectRelayEdges (tolerant: saver_info.all_saves -> saver_content_collections -> content_collection.collection_items -> generic viewer.* walk), paginateAllSaves (doc 27174039202273427, cursor loop guard throws PAGINATION_LOOP on repeated end_cursor+has_next, maxPages default 200 clean-stop returns partial, delayMs default 2000)
- Fixtures graphql-items-page1/2.json realigned from synthetic content_collection.collection_items path to REAL data.viewer.saver_info.all_saves + page_info (node fields: id=save_id, savable.savable_title.text, savable.savable_permalink, containing_lists)
- Test pattern: headless chromium.launch() + page.route('**/*') catch-all serving empty html to facebook.com origin (same-origin fetch, no CORS), then page.route('**/api/graphql/**') per-test (registered later wins over catch-all). Tokens empty on mock page - harmless
- Retry test costs ~2s (BASE_DELAY_MS=2000); pagination tests pass delayMs:0
- PRE-EXISTING FLAKE: test/download.test.ts pool tests fail intermittently (completion order race) - passes on re-run, unrelated to graphql work, untouched

## [2026-08-03 11:25] T8 graphql client + flake fix
- T8 (src/graphql.ts): in-page page.evaluate(fetch) to /api/graphql/ (single, NOT graphqlbatch), form-encoded doc_id+variables(JSON)+fb_dtsg(require('DTSG').getToken())+lsd/jazoest+__comet_req=1, retry 3x exp backoff 2s->15s cap, for(;;); strip, error/errors detect. paginateAllSaves doc 27174039202273427, cursor dedupe loop->PAGINATION_LOOP, maxPages 200 (cap->partial return, ponytail), delay 2000ms. commit 0d3e820.
- FLAKE FIX (test/download.test.ts, commit 40e61f1): pool tests assumed procs[] order == item order, but downloadOne awaits async copyFile BEFORE spawn -> spawn order nondeterministic. Fixed with procFor(procs, videoId) helper locating proc by unique URL in args. 8/8 consecutive runs pass, 97/97 suite.
- LESSON: never assume async-spawn order matches item order in pool tests; map via unique URL/args.

## [2026-08-03] Task 10 collections enumerator complete
- src/collections.ts: listCollectionsFromItems (PURE aggregation from items' containingLists [{id,name}] normalized array, count = distinct items per collection, sorted by name) + listCollections (LeftRail GraphQL doc 27602599562734455, variables {contributorRoles:[], count:10, cursor, scale:1} — CAMELCASE contributorRoles per probe6, NOT the snake_case in the plan hint; friendly CometSaveLeftRailPaginationQuery; response data.viewer.saver_info.saver_content_collections.edges; merges counts from opts.items aggregation; LeftRail collection_title wins over containing_lists name; PAGINATION_LOOP guard; maxPages 50 cap).
- GOTCHA: graphql.ts findPageInfo does NOT know saver_info.saver_content_collections (only saver_info.all_saves / viewer.saver_content_collections / content_collection.collection_items) -> collections.ts extracts page_info LOCALLY (conn.page_info, NOT the connection object — returned whole conn first, has_next_page nested under .page_info so pagination silently stopped after page 1).
- Fixtures: graphql-collections-page1.json realigned to REAL nested shape data.viewer.saver_info.saver_content_collections (was synthetic direct-under-viewer; was unused by other tests) + NEW page2 (5 more: Game, Ăn cả thế giới, TV & Phim ảnh, Trò chơi, Sản phẩm = real empty collections from spike).
- Real LeftRail names sort (en-US localeCompare): Ahihi < Ăn cả thế giới < Anime < Để xem sau < Download < Game < Khoa học & Công nghệ < Sản phẩm < Trò chơi < TV & Phim ảnh.
- Name priority test: fixture "Ahihi" (clean) vs containingLists "Ahihi ಡ ͜ ʖ ಡ" (kaomoji, real) -> LeftRail wins.
- Tests: 3 new in test/collections.test.ts (aggregation 5 colls, LeftRail paginated 2 pages + count merge + empty), route-mocked same pattern as graphql.test.ts (catch-all + **/api/graphql/**). 113/113 pass, tsc clean, build exit 0.
- NOTE: tsx page.evaluate broken by esbuild __name helper (ReferenceError __name is not defined) — debug with vitest, not tsx one-off scripts. (Only affects manual debugging, not vitest/build.)


## [2026-08-03] Task 11 items enumerator complete
- src/items.ts: parseItemNode (videoId from savable.id digits-only w/ permalink fallback, defensive permalink filter watch/reel → null for PHOTO/LINK), extractVideoId (/watch/?v=, /reel/{id}, bare v=), listAllSaves (wraps paginateAllSaves, parse+filter), countByCollection (Map id→count). SavedItem {videoId,title,permalink,collectionIds,saveId?}
- Fixtures graphql-items-page1/2.json REALIGNED to raw node shape (10a_probeA_page1_raw.json): containing_lists is {count, nodes:[{id,name}]} NOT bare array; savable.id added (=video id); empty = {count:0, nodes:[]}
- Page2 PHOTO node permalink changed to /photo.php?fbid=... — proves defensive permalink filter (not savable_default_category) excludes it
- 13 new tests in test/items.test.ts, suite 112/113 (1 failure = test/collections.test.ts, T10 PARALLEL task mid-work uncommitted — excluded from commit, same as T9 excluded T16 download.ts)
- Commit 1bdb0e9 feat(items). tsc clean, build exit 0

## [2026-08-03] Task 16 orchestrator complete
- src/orchestrator.ts: downloadAll/downloadCollection/planDownloads/listCollectionsService. Single all-saves stream (doc 27174039202273427) + LeftRail (27602599562734455) with containing_lists counts merged; _uncategorized/ folder for items with no collectionIds; dedupe by videoId (first wins, later -> skipped 'duplicate'); folder = FIRST collection by sorted name for multi-collection items (deterministic).
- index.ts defaultServices now REAL (was notWired). Each service call launches its own headed browser session (T15 seam design) and closes it in finally.
- TEST SEAMS (DI, per download.ts spawnFn precedent): OrchestratorOpts.launchFn (fake headless route-mocked browser; default launchAuthenticated) + spawnFn (fake yt-dlp) + delayMs (pagination pacing 0 in tests). Needed because auth.ts launchAuthenticated is HEADED and hardcoded - could not modify auth.ts (out of scope), so tests inject a headless route-mocked page.
- GOTCHA 1 (ENOENT marker): writeDoneMarker does NOT mkdir - runDownloads must mkdirSync every distinct folder (dirname(outPath)) BEFORE downloadMany, else every item fails with ENOENT. Caught by integration test (failed:10).
- GOTCHA 2 (count merge shape): SavedItem.collectionIds is bare string[] but listCollections' aggregation needs containingLists {id,name}[] - counts silently 0. Fixed with aggregateItems() adapter (name:'' is safe, LeftRail title wins). Affects production confirmation counts too.
- GOTCHA 3 (test expectation): sanitizeFileName strips ':' (ILLEGAL regex) - 'Version: Anh da den...' -> 'Version Anh da den...'. Also reel permalinks (/reel/{id}/) have no 'v=' - assert videoId not 'v=' prefix.
- dryRun: plan = one buildYtDlpArgs line per unique item, NO downloads, NO report file, browser still closed.
- Reports written to {outputDir}/reports/report-*.json (decision: scoped to output dir, not cwd).
- Vitest route-mock dispatch by doc_id in POST body (ALL_SAVES vs LEFT_RAIL), cursor selects page 1/2. headless chromium.launch() + catch-all + **/api/graphql/** route (later wins). 30000ms per test (headed-ish launch overhead).
- Suite: 122/122 (113 prior + 9 new: 2 planDownloads unit, 4 downloadAll, 2 downloadCollection, 1 listCollectionsService). tsc --noEmit clean, build exit 0.

## [2026-08-03] Task 17 report verification complete
- Plan T17 fully satisfied by T16 wiring (verified item-by-item, no src changes needed):
  - failures {videoId,url,reason}: orchestrator.ts:183 `report.addFailure(r.videoId, r.error ?? 'unknown error', urlById.get(r.videoId))` — reason populated for yt-dlp non-zero + thrown errors; url from urlById map. Tested (orchestrator.test.ts records per-item failures).
  - skipped {videoId,reason}: duplicate (dedupe) + 'already downloaded' (marker skip via downloadMany status 'skipped' → orchestrator else-branch, correctly labeled). Duplicate tested; marker path was NOT.
  - Report JSON {timestamp, summary, failures, skipped}: report.ts writeReportFile. [DONE] line: index.ts:106 = acceptance criteria verbatim, cli.test.ts:157. Exit codes 0/1/3: exitForResult mirrors Report.exitCode, exit 3 via NO_VIDEOS tested (cli.test.ts:211).
- GAP CLOSED (test only): marker-skip → report.skipped had zero orchestrator-level coverage. Added re-run test: 2nd downloadAll over done markers → 0 downloads / 10 skipped 'already downloaded' / 0 yt-dlp spawns / report summary 0/0/10. Suite 122 → 123.
- Test gotcha: readReport() finds FIRST 'report-*' file in readdir order — with 2 runs in one dir it can return the stale report. rmSync the reports dir between runs.
- Deliberate non-change: index.ts reportResult hand-formats the [DONE] string instead of calling Report.summaryText() — identical output, both tested; index.ts has DownloadResult counts not a Report instance, wiring adds coupling for zero behavior change.
- Deliberate non-change: reports at {outputDir}/reports/ not cwd reports/ (T16 decision, ratified — decisions.md).

## [2026-08-03] Task 18 E2E FAILED — GraphQL fetch blocked (3/3, one attempt each)
- README.md written (deliverable A complete, mirrors AnimehayCLI structure, English only). Commit carries README + this record.
- E2E (deliverable B) BLOCKED: all 3 live commands failed identically, exit 1, `page.evaluate: TypeError: Failed to fetch` at the in-page fetch (postGraphQL, <anonymous>:2:25). One attempt each per plan no-retry rule; budget exhausted at 3.
  1. list-collections — SAME failure. Live collection counts NOT captured.
  2. download-collection 264183241709596 (An ca the gioi, spike-smallest, count 1) --yes — SAME failure. No mp4 produced; downloads/ empty.
  3. download-all --dry-run — SAME failure. yt-dlp plan NOT captured.
- Auth NOT the problem: all 3 runs passed assertLoggedIn (no login redirect), cookie file healthy (11 lines, c_user/xs/presence/fr intact). TCP facebook.com:443 reachable (not a network outage).
- CONTRADICTION: spike T3 re-run TODAY proved the identical in-page fetch flow (36 probes OK), T4 yt-dlp worked, T9 /saved navigation worked. Hours later the same flow is dropped 3/3.
- REAL BUG FOUND (recorded, NOT fixed — task rule): queryGraphQL retry loop does NOT catch transport-level rejection. postGraphQL throws (page.evaluate fetch reject) -> escapes attempt 0 immediately, zero retries, raw unwrapped playwright error printed by index.ts catch-all (not a clean FETCH_GRAPHQL message). Retry loop only covers HTTP>=400 / non-JSON / error payload. Directly contradicts spike lesson "wrap FB metadata calls w/ 1 retry". FOLLOW-UP TASK: try/catch postGraphQL inside the retry loop + wrap error as FbSavedCliError(FETCH_GRAPHQL).
- UNRESOLVED ROOT CAUSE: likely FB WAF now dropping /api/graphql/ POSTs for this session/IP (rate-limit flag after 36-probe T3 + 3 more today) or endpoint blocked for this browser fingerprint. Cannot distinguish without more live probes (forbidden).
- USER ACTION NEEDED before re-running E2E: re-export fresh cookies (or wait out the rate limit window), then re-run task-18 E2E commands (evidence log .omo/evidence/task-18-e2e.log already has the 3 failure records).

## [2026-08-03] Task 18 retry: transport-retry fix
- BUG FIX (src/graphql.ts): queryGraphQL retry loop now try/catch-es postGraphQL — transport-level in-page fetch rejections (network drop / WAF reset, "TypeError: Failed to fetch") retry with the existing 2s/4s/8s backoff instead of escaping attempt 0. lastError prefixed `transport:`; exhausted -> clean FbSavedCliError(FETCH_GRAPHQL).
- REGRESSION TEST (test/graphql.test.ts): route.abort() makes in-page fetch reject; asserts 4 route calls (MAX_RETRIES+1), FbSavedCliError instance, code FETCH_GRAPHQL, message contains 'transport:'. Suite 123 -> 124. Test pays ~14s backoff (accepted).
- playwright-profile/ deleted before probe (disposable, gitignored).

## [2026-08-03] Task 18 retry: probe #1 FAILED (fix validated, block persists)
- Probe #1 (list-collections, fresh playwright-profile/ deleted) FAILED, exit 1. STOPPED per rules — download-collection + dry-run NOT attempted.
- Error (NOW CLEAN, was raw): `[ERROR] GraphQL request failed after 4 attempts: transport: page.evaluate: TypeError: Failed to fetch` — fix proven live: 4 attempts with 2s/4s/8s backoff, wrapped FbSavedCliError(FETCH_GRAPHQL).
- CONCLUSION: transport rejection persists across 4 attempts + 14s backoff -> NOT a per-minute transient WAF window. Persistent block of in-page fetch to /api/graphql/ from this session/browser fingerprint (likely longer FB flag after 36-probe spike + 5 runs today).
- NOT auth: assertLoggedIn passed again (no login redirect), cookies 11 lines intact. TCP reachable.
- NEXT: user must re-export fresh cookies (or wait a longer FB flag window — hours, not minutes), THEN re-run probe #1. If it still fails with fresh cookies, investigate FB-side /api/graphql/ endpoint change (WAF policy, automation fingerprint).
- Evidence: .omo/evidence/task-18-e2e2.log (both probe attempts: bad-arg + fixed-arg).

## [2026-08-03] vitest flake fix
- Intermittent "Failed Suites 1" (Test Files 1 failed | 11 passed, but Tests 124/124 passed): suite-level teardown error, not a test failure. 5 test files launch chromium in parallel; launch/close contention at teardown raced.
- Fix: vitest.config.ts `fileParallelism: false` — test FILES run sequentially (workers still exist). 4 consecutive full-suite runs: 12/12 files, 124/124 tests, exit 0, zero Failed Suites. tsc clean, build exit 0. Commit: test: serialize vitest files (chromium contention flake).
- Same class as prior spawn-order race (test/download.test.ts pool) — parallel test-infra races, serialized or mapped via unique identifiers.

## [2026-08-03] F4 verdict: REJECT
- Tasks [17/18 compliant] | Contamination [CLEAN/0 issues] | Unaccounted [1 file] | VERDICT: REJECT
- 21/22 commits map 1:1 to plan tasks; 40e61f1/2c8b33c/490058b/0580393 are documented in-scope infra/test fixes (verified minimal). No creep found anywhere (no extra deps, no extra features, all Must-NOT guardrails verified in code: no --continue/archive, jobs=3, no parallel GraphQL, headed-only auth, no chalk, no cookies-export/SEA, no CollectionItems doc, no cref=28, first-wins dedupe, {outputDir}/reports/).
- NON-COMPLIANT: Task 3 spike. (a) Must-NOT "max 20 requests" exceeded — re-run used 36 probes (findings.md:91, self-disclosed with rationale; ≥2.5s delay respected). (b) T3 committed deliverable MISSING from HEAD: no `chore: spike graphql probe` commit exists; spike/findings.md committed at 62de2a4 carries only the 35-line T4 section — the 56-line T3 section (A=YES/B=NONE + evidence) exists ONLY as an uncommitted working-tree modification (git diff = +56 lines). Probe scripts untracked in spike/.
- SECRET (low severity, blocks "no secrets" gate): real cookie value committed — `.omo/notepads/fb-saved-video-downloader/learnings.md:63` contains `c_user=<redacted>` (committed via adf60dc). xs/presence VALUES absent (names only); c_user is a public user ID, not a session token; src/test/fixtures are fully clean (grep `c_user=|xs=` over HEAD src+test = 0 hits; test/fixtures/cookies.txt all FAKE).
- UNACCOUNTED: 1 file — `spike/findings.md` working-tree modification (the T3 section, benign content, no secrets). Noted (not counted): `.omo/notepads/learnings.md`+`decisions.md` ride along in adf60dc..0580393 commits (benign task documentation); untracked `1b95ae69-*.txt` cookie backup at project root is NOT gitignored (untracked = not committed, but recommend adding to .gitignore); T10 DOM fallback omitted but documented in collections.ts header (spike superseded; consequence of authorized single-stream architecture).
- Required fixes before re-review: (1) commit T3 spike findings (findings.md T3 section + probes), (2) redact c_user=<redacted> in learnings.md:63 to a placeholder, (3) optional: record T10 DOM-fallback skip in decisions.md.

## [2026-08-03] F2 verdict: REJECT
- Gate F2 (code quality). Build PASS (exit 0 x2), Lint PASS (tsc --noEmit exit 0; zero `as any`/`@ts-ignore`/`: any`/`<any>`), Tests PASS (124/124, 12 files, exit 0, run TWICE — serialization fix held, zero Failed Suites). Every src/ file read line-by-line (13 modules + bin/fb-saved-dl.js + build.mjs). 4 issues, all low/med severity — fixes are trivial, no structural problems.
- 1. src/index.ts:190 — `--verbose` option declared + documented (README:78) but NEVER read anywhere. No-op user-facing flag. Fix: wire it to emit extra detail, or delete option + README row.
- 2. src/download.ts:319 — `getUploadDate` has ZERO production callers (only test/download.test.ts). filename.ts:23 + download.ts docblock promise a "publish-date fallback" contract neither module fulfills (planDownloads never passes saveTimestamp). Unwired feature = dead path (~40 lines + temp-cookie subprocess). Fix: wire into planDownloads or delete + its tests.
- 3. src/cookies.ts:84 — `toCookieHeader` has ZERO production callers (only test/cookies.test.ts). Leftover from the abandoned raw-fetch auth path (WAF → page.evaluate). Dead export. Fix: delete + its test, or consume it.
- 4. .omo/notepads/fb-saved-video-downloader/learnings.md:63 — REAL account ID `c_user=<redacted>` committed in tracked notepad. Explicitly forbidden by F2 secret criterion ("must NOT appear in any committed file"). Only the account ID — no xs/presence values committed. Fix: scrub numeric value → `<redacted>`. test/fixtures/cookies.txt verified synthetic (FAKE values) ✓.
- Verified clean: no empty catches (all 10 catch sites record/throw/cleanup), no debug console.log in prod paths (index.ts stderr/stdout writes are the CLI contract; console.error only in the 2 global handlers), no commented-out code, no unused imports (tsc clean), DI seams not vi.mock (zero vi.mock in tests), report path = {outputDir}/reports/report-<timestamp>.json ✓ README, exit-code table 0/1/2/3 ✓ errors.ts, circular index↔orchestrator import is type-only (no runtime cycle).
- Bottom line: code is high quality and green; the 4 items are exactly the "unused code / dead path / secret" class F2 must gate on. All are one-line-ish fixes → re-review after scrub.

## [2026-08-03] F3 verdict: APPROVE
- Gate F3 (hands-on QA, approval). Evidence: .omo/evidence/final-qa/f3-verdict.md
- Scenarios 10/10 pass | Integration 3/3 | Edge Cases 8 tested | VERDICT: APPROVE
- Executed live: npm test (12 files, 124 tests, exit 0, 37.87s), npm run build (exit 0), --help (3 commands + global flags), --version (0.1.0), bogus-command (exit 1 + usage), missing-cookies list-collections + download-collection (both exit 2 + helpful msg), download-all --help (all 6 flags), download-all --dry-run --cookies /nonexistent (exit 2, clean, NO browser launch — assertCookiesFile precedes browser per index.ts:143).
- E2E evidence VERIFIED consistent: task-18-e2e.log (3 attempts 12:17-12:19, all `page.evaluate: TypeError: Failed to fetch` at <anonymous>:2:25), task-18-e2e2.log (probe 12:28:53: `GraphQL request failed after 4 attempts: transport: ...` — retry fix 490058b validated live, clean FETCH_GRAPHQL exit 1). Auth passed (error post-auth at fetch stage), cookies intact (15 lines = 11 cookies incl. c_user/xs/presence), commits 490058b/1a0d98a/390eba0/0580393 present.
- Edge cases suite-verified: empty collection (collections.test.ts:116), login-bail exit 2 (auth.test.ts:45, cli.test.ts:96/228), dry-run no-download no-report (orchestrator.test.ts:379), dedupe first-wins (orchestrator.test.ts:335), marker-skip re-run recorded in report (orchestrator.test.ts:432).
- Live FB probe SKIPPED per MUST-NOT (valid cookie file would launch browser against live FB; recorded evidence already covers the failure path). No FB traffic generated by this review.
- Not in scope: F2's 4 findings (--verbose no-op, getUploadDate/toCookieHeader dead exports, c_user in learnings.md:63) remain F2's REJECT items — verified untouched (read-only).

## [2026-08-03] Final Wave fix batch
- Removed dead code: getUploadDate (download.ts, zero production callers, publish-date fallback deferred — title-only v1) + its 2 tests; toCookieHeader (cookies.ts, abandoned raw-fetch leftover) + its test.
- Wired --verbose (index.ts: declared but never read): prints `[VERBOSE] cookies=... outputDir=... jobs=... ytDlpPath=... dryRun=...` to stderr before listCollections; +1 cli.test.ts test. README row now accurate.
- Scrubbed c_user=<redacted> → <redacted> in learnings.md:63 (previously committed via adf60dc). git grep over HEAD must be empty after recommit.
- .gitignore: + 1b95ae69-*.txt (root cookie backup, real cookies), + spike/evidence/ (real GraphQL captures).
- Spike commit `chore: spike graphql probe`: findings.md T3 section (A=YES/B=NONE verdict + evidence refs) + probe.mjs..probe6.mjs committed (was uncommitted working-tree change per F4). spike/evidence/ + *.mp4 stay gitignored.
- Suite 124 → 122 tests (2 getUploadDate + 1 toCookieHeader removed, 1 --verbose added). tsc clean, build exit 0.

## [2026-08-03] F4 RE-REVIEW verdict: APPROVE
- Tasks [18/18 compliant] | Contamination [CLEAN/0 issues] | Unaccounted [CLEAN/0 files] | VERDICT: APPROVE
- Fix 1 VERIFIED (be20b09 `chore: spike graphql probe`, plan T3 strategy verbatim): spike/findings.md +56 T3 section committed — HEAD contains full A) VERDICT: YES coverage (45/220 uncategorized) + B) VERDICT: NO timestamp + evidence refs (spike/evidence/rerun/) + 36-request budget transparency; NOT a stub. probe.mjs..probe6.mjs (1790 lines) tracked = real probe scripts (probe5/probe6 referenced in findings). `git diff be20b09..HEAD -- spike` = empty; `git status` shows no ` M` on findings.md — T3 deliverable fully committed.
- Fix 2 VERIFIED (84a3f8e scrub): `git grep "100043537656175" HEAD` = EMPTY (exit 1). learnings.md:63 → `c_user=<redacted>`. Full-tree secrets grep (`c_user=|xs=|presence=|fb_dtsg=`): only `<redacted>` placeholders + `fb_dtsg=<require('DTSG').getToken()...>` request-format template in findings.md (not a value). test/fixtures/cookies.txt still synthetic (FAKE) ✓.
- Fix 3 VERIFIED (fb12e11): .gitignore:12-13 = `1b95ae69-*.txt` + `spike/evidence/`; check-ignore cookie backup exit 0 ✓, check-ignore spike/evidence exit 0 (rule .gitignore:13) ✓. Optional recorded: decisions.md +4 = T10 DOM-fallback skip + dead-code removal note ✓.
- fb12e11 remainder = authorized F2 fixes, no creep: getUploadDate/toCookieHeader removed (grep HEAD src = 0 refs, truly dead); filename.ts diff docs-only (JSDoc title-only v1 note, zero logic change); index.ts --verbose wiring only (17+/2-, no new commands).
- Commit mapping 25/25: 22 original + fb12e11/be20b09/84a3f8e all trace to review findings. git status: 0 modified tracked files; untracked = workflow state (.omo/boulder.json, issues.md, plans/, run-continuation/), FB_websource/ (user artifact), leftover spike analysis scripts (analyze1/dbg*/debug-*/extract-*) — all benign/expected per re-review scope. Gitignored artifacts (downloads/, playwright-profile/, cookie files, spike/evidence/) absent from status.
- T18 live E2E remains blocked by FB WAF (external, evidence logged) — not a scope violation.

## [2026-08-03] F3 spot-check (post-fb12e11): APPROVE
- Regression check only (prior 10/10 APPROVE stands for unchanged scenarios). Changed surface: --verbose (dead → wired), dead code removed (getUploadDate, toCookieHeader).
- CLI surface [PASS] | VERDICT: APPROVE
- Live CLI (real dist, verified fresh — dist/index.js mtime > src, contains VERBOSE wiring at :921): --help exit 0 (3 commands + --verbose in global options), --version 0.1.0 exit 0, bogus exit 1 + usage, download-all --help exit 0 (6 flags), download-all --cookies /nonexistent --dry-run exit 2 clean, list-collections --cookies /nonexistent exit 2 helpful msg.
- --verbose wiring VERIFIED: src/index.ts:146-150 writes `[VERBOSE] cookies=... outputDir=... jobs=... ytDlpPath=... dryRun=...` to process.stderr (after assertCookiesFile, before browser launch); wired via program.opts().verbose for both download commands (index.ts:233/240). Executed now: `vitest run test/cli.test.ts` → 12/12 PASS incl. new test "—verbose prints the resolved config to stderr" (cli.test.ts:163) — fake services, zero browser, zero FB traffic.
- Dead code removal VERIFIED: grep src/ for getUploadDate|toCookieHeader = 0 matches. dist fresh (rebuilt post-fb12e11).
- Scenario 7 live variant (download-all --cookies test/fixtures/cookies.txt --dry-run --yes --verbose) SKIPPED deliberately: fixture is valid-format FAKE cookies (verified: 13 lines, c_user=12345678, xs=FAKE, presence=FAKE) → assertCookiesFile passes → headed browser launches against LIVE facebook.com → fake session → login redirect → AUTH_FAILED exit 2. Dry-run plan unprintable (auth never passes); browser launch = live FB traffic, prohibited by task MUST NOT. [VERBOSE] stderr behavior instead confirmed via source wiring + executed cli.test.ts:163 (identical run() code path, same argv shape — verbose prints before services are called, so behavior is identical). stdout-clean-for-piping property: [VERBOSE] written to process.stderr (index.ts:147), plan to stdout (reportResult index.ts:103) — separation preserved.
- Note: --verbose only wired for download commands; list-collections --verbose is a no-op (action doesn't read it) — matches new test scope, not a regression.
- Zero live FB traffic generated by this review. No files modified (evidence: none; only this append).

## [2026-08-03] F2 re-review verdict: APPROVE (all 4 fixes verified in fb12e11 + 84a3f8e)
- Build PASS (exit 0) | Lint PASS (tsc --noEmit clean) | Tests PASS (122/122, 12 files, exit 0; count math holds: 124 - 2 getUploadDate - 1 toCookieHeader + 1 verbose = 122). Grep 100043537656175 over HEAD = EMPTY (exit 1); c_user= over src+test = 0 hits; getUploadDate/toCookieHeader refs anywhere = 0 hits.
- Fix 1 VERIFIED: index.ts:146-150 prints [VERBOSE] cookies=... outputDir=... jobs=... ytDlpPath=... dryRun=... to stderr when flags.verbose; global --verbose read via program.opts().verbose and spread into BOTH download-all (238-241) and download-collection (230-235) handlers; stays out of DownloadOptions (CLI-layer only). Test: cli.test.ts:163-174 asserts [VERBOSE] on stderr.
- Fix 2 VERIFIED: getUploadDate fully deleted (download.ts now 308 lines, ends at downloadMany); its 2 tests deleted; filename.ts:18-31 docblock rewritten to v1 title-only, publish-date fallback explicitly DEFERRED; all imports still used (tsc clean).
- Fix 3 VERIFIED: toCookieHeader deleted (cookies.ts 84 lines); its test deleted; zero dangling refs.
- Fix 4 VERIFIED: learnings.md:63 now c_user=<redacted>; 84a3f8e scrubbed 4 lines; backup UUID (1b95ae69-*.txt filename) retained in notepad = filename not credential, and .gitignore now covers 1b95ae69-*.txt + spike/evidence/ so the real backup file can no longer be committed.
- Regression: zero references to deleted exports in src/+test/; no new as any/@ts-ignore; no new empty catches; serialization fix intact (12/12 files, zero Failed Suites).
- Nit (cosmetic, NOT counted): cookies.ts:2 docblock still says "conversion to Playwright / HTTP header forms" - header form function deleted; one-line doc drift. Optional cleanup.

## [2026-08-03] F1 verdict: APPROVE
- Must Have [10/10] | Must NOT Have [10/10] | Tasks [18/18] | VERDICT: APPROVE
- Read plan end-to-end (1249 lines) + all 13 src/ modules + README + spike/findings.md + notepads. Re-ran npm test (12 files, 122/122, exit 0), npm run build (exit 0), npx tsc --noEmit (clean), node bin/fb-saved-dl.js --help (3 commands + flags, exit 0). git log maps 25 commits 1:1 (18 task + 7 fix/docs).
- Must Have verified: (1) collection enumeration + per-collection counts, confirmation BEFORE download (index.ts:86-99); (2) download-all/download-collection + _uncategorized (orchestrator.ts:117); (3) newest-first edge order preserved; (4) filename builder, _{videoId} collision, Windows-safe sanitize; (5) yt-dlp only (download.ts spawn); (6) .done.json markers + >=1MB stat check; (7) report file no silent loss (report.ts); (8) --dry-run/--list-collections/--yes non-interactive; (9) /login|/checkpoint bail -> AUTH_FAILED exit 2 (auth.ts:42-64); (10) sequential GraphQL, 2s delay, 3x backoff, page caps 200/50, PAGINATION_LOOP.
- Must NOT Have verified (grep + read): no --continue/--download-archive (0 hits); headless only as false (auth.ts:30); no chalk/stealth/proxy/server/DB (0 hits, 2 false-positive comment words); no parallel GraphQL (Promise.all only in yt-dlp pool download.ts:306); cursor dedupe + caps; skips all reported; timestamp spike time-boxed (B=NONE); cookies/profile/downloads/reports gitignored (check-ignore all exit 0; git ls-files clean); no raw stat-skip alone; no cref=28 (0 hits).
- Deviations all documented + spike/findings.md + decisions.md, ratified by F4: (a) T10 DOM fallback dropped (LeftRail GraphQL works — spike superseded, decisions.md:26); (b) content_filter:[] real value (spike findings.md:66/72, learnings:98); (c) /api/graphql/ single endpoint not graphqlbatch (spike: batch 1675002 error); (d) title-only filenames v1 (B=NONE, README Notes); (e) reports at {outputDir}/reports/ (decisions.md:21-22); (f) minor: yt-dlp missing -> exit 1 not 2 (README exit table documents; framework maps YT_DLP_FAILED->1).
- T18 - [~]: live E2E BLOCKED by external FB WAF (evidence task-18-e2e.log 3 attempts + task-18-e2e2.log retry probe, all page.evaluate Failed to fetch; retry fix 490058b validated live). Documented external blocker, NOT a compliance failure.
- Secrets: real account ID scrubbed (84a3f8e), git grep over HEAD clean, test fixtures synthetic (FAKE).

## [2026-08-03] Task 18 RETROACTIVE CORRECTION — NOT the WAF, missing navigation
- The earlier task-18 "FB WAF blocking /api/graphql/" conclusion (lines 156-254) was WRONG. Root cause was local: the CLI never navigated to a real FB page before firing GraphQL. launchAuthenticated injected cookies then returned the page still on about:blank → page.evaluate(fetch) to https://www.facebook.com/api/graphql/ was CROSS-ORIGIN → CORS reject → "TypeError: Failed to fetch" after 4 attempts (retry fix 490058b just made the same doomed fetch retry).
- Probe spike/probe7.mjs proved it: navigate to https://www.facebook.com/saved FIRST, then the SAME endpoint + SAME cookies returns HTTP 200. WAF was never the blocker.
- FIX (commit): launchAuthenticated now navigates to https://www.facebook.com/saved (waitUntil domcontentloaded, 60s timeout) right after cookie injection, waits 2.5s for DTSG hydration, then assertLoggedIn (bail AUTH_FAILED exit 2). Single fix point — all flows (list-collections / download-all / download-collection) get it via withBrowser. Context closed on navigation failure so no orphaned headed Chromium window.
- fb_dtsg needs require('DTSG') which only exists after the saved page hydrates — another reason about:blank failed (empty token, not just CORS).
- Tests: auth.test.ts passes `navigate: false` (hermetic seam; LaunchOpts.navigate defaults true). 122/122 still green, tsc clean, build exit 0.
- LIVE E2E PASSED: node bin/fb-saved-dl.js list-collections --cookies Facebook-cookies.txt → 10 real collections with counts (Ahihi 7, Anime 62, Download 239, TV & Phim ảnh 33, ...), EXIT=0. Evidence: .omo/evidence/task-18-e2e6.log.
- LESSON: a "blocked by WAF/external" conclusion must be proven by varying the local request context first (origin, page state) before blaming the remote. CORS is the first suspect for page.evaluate(fetch) failures, not WAF.

## [2026-08-03] Task 18b: format selector muxed fallback (E2E fix)
- BUG (live): download-collection 207833460677908 failed exit 1: `ERROR: [facebook] 363439375522548: Requested format is not available`. Selector `bv*[height<=1080]+ba/b[height<=1080]` had NO final muxed fallback: when the only formats are muxed (no matching DASH video+audio pair, e.g. SD-only muxed), neither branch resolves -> yt-dlp errors.
- FIX (src/download.ts buildYtDlpArgs, format string only): `bv*[height<=1080]+ba/b[height<=1080]/b`. Trailing `/b` = best overall format, guarantees resolution. HD DASH still preferred when available (bv*[height<=1080]+ba unchanged).
- Test: download.test.ts arg-builder expectations updated to the new string (2 spots). 122/122 pass, tsc clean, build exit 0.
- LIVE E2E PASSED: node bin/fb-saved-dl.js download-collection 207833460677908 --cookies Facebook-cookies.txt --yes --jobs 2 -> EXIT=0, 1 downloaded 0 failed. File on disk: "downloads/Trò chơi/Bộ đội hủy diệt Grak - Nata.mp4" 503MB + .done.json. Evidence: .omo/evidence/task-18-e2e-download2.log.
- NOTE: PATH yt-dlp is stable 2025.06.30 (stale per README); the format fix works on it too. Proven nightly stays at spike/yt-dlp.exe 2026.07.23.234303.

## [2026-08-03] Default resolution 1080p -> 720p
- User request: "default resolution là 720p thôi" (smaller files, enough quality).
- src/download.ts buildYtDlpArgs format string: `bv*[height<=1080]+ba/b[height<=1080]/b` -> `bv*[height<=720]+ba/b[height<=720]/b`. Trailing `/b` muxed fallback (Task 18b live fix) kept intact.
- test/download.test.ts arg-builder assertions updated (2 spots). README had no resolution mention — no change.
- Verified: npm test 122/122, tsc --noEmit clean, npm run build exit 0, live dry-run plan shows `-f bv*[height<=720]+ba/b[height<=720]/b`.

## [2026-08-04] Task 1 SEA build evidence complete
- Fresh Windows x64 SEA attempt `20260804T020336785Z-f2248e1e` completed from project root. Host `win32`, `process.arch=x64`, `PROCESSOR_ARCHITECTURE=AMD64`, exact target `x86_64-pc-windows-msvc`, Node `v26.4.0`, npm `11.16.0`, git `2.50.1.windows.1`, HEAD `7464dd46d227e4ee1504ea4986f56ff85769967f`.
- Existing `dist/index.cjs`, `dist/index.blob`, `dist/.sea-assets`, and `fb-saved-dl.exe` quarantined outside repo at `D:\Temp\opencode\fb-saved-dl-sea-quarantine-20260804T020336785Z-f2248e1e`; pre-build absence manifest records all four absent before build.
- Bounded canonical commands passed: `npm ci` 8.36s, `npm run build:sea` 35.52s, each timeout 300s. Outputs fresh after build start: `dist/index.cjs` 7,431,088 bytes SHA-256 `62C042918A23A2BA6A3D325C0DD84FE1D0D33BB9E3D4E393758DF3A3019BB416`; `dist/index.blob` 7,431,128 bytes SHA-256 `F10980EDE245CD596A440C89B5308533BA42CFB3AE8C1B202A5FB172825F02FA`; `.sea-assets` browsers/package manifests; `fb-saved-dl.exe` 110,788,096 bytes SHA-256 `85E59FB31845D5A8DF7D5F635FACB66C517FC7DA012D622308ACB1762D9E2E8A`.
- Bounded standalone checks: SEA `--version` and `--help` passed; invalid-command probe returned exit 1 and is classified `expected_failure`; negative target proof rejected `i686-pc-windows-msvc` against required `x86_64-pc-windows-msvc` with exit 0. No live Facebook crawl or cookie input used; task-1 logs sanitized.
- Evidence: `.omo/evidence/sea/20260804T020336785Z-f2248e1e/`, `.omo/evidence/task-1-sea-build.log`, `.omo/evidence/task-1-sea-build-error.log`. First runner attempt had only evidence-runner argument encoding defect; preserved separately and superseded by final attempt.

## [2026-08-04] Task 2 engine JSONL contract
- `src/engine-jsonl.ts` owns machine mode. `--engine-jsonl` branches before Commander, preserving human commands/output.
- Normative stream: optional `collections`, `progress*`, exactly one terminal last; parser accepts CRLF and rejects blank/malformed/unknown/missing/duplicate/post-terminal/EOF-without-terminal input.
- Machine flags pass cookie path only: `--cookies`, `--output-dir`, `--yt-dlp-path`, `--jobs`, `--resolution`, `--dry-run`; `download-all` is all-download mapping. SIGINT is idempotent `cancelled` exit 130.
- Existing download coordinator receives optional resolution, AbortSignal, and progress callback; no GraphQL/auth/yt-dlp flow rewrite. Contract suite 13 tests; full suite 135 tests passed; tsc passed.

## [2026-08-04] Task 3 Tauri v2 scaffold
- Added `src-tauri/` Tauri v2 shell with no Rust commands or downloader logic. Frontend is static `src-tauri/frontend/` shell with stable selectors for collections, download actions, settings, and report history.
- Exact Windows target enforced twice: npm Tauri scripts pass `--target x86_64-pc-windows-msvc`; Rust `compile_error!` rejects non-Windows x86_64 MSVC builds. Host matched exact target.
- Resources declared for `../fb-saved-dl.exe` and `../spike/yt-dlp.exe`; no cookies, profiles, media, or raw cookie values embedded. Windows icon generated from local SVG.
- Verification: frontend TypeScript check, frontend build, target-guarded `cargo check`, bounded Tauri dev readiness, and `git diff --check` passed. Evidence: `.omo/evidence/task-3-tauri-scaffold.log`; initial schema/icon blockers and fixes in `.omo/evidence/task-3-tauri-scaffold-error.log`.

## [2026-08-04] Task 4 deterministic GUI process harness
- Added test-only `test/fixtures/fake-engine.mjs` with allowlisted scenarios: success, partial, failure, delayed, ignored termination, and malformed JSON. It emits synthetic T2 JSONL only; no cookie input or network.
- Added `test/process-harness.ts`: Node `spawn`, bounded capture timeout, diagnostic redaction, and Windows `taskkill /T /F` tree cleanup with a 5-second bound.
- Added `test/fake-engine.test.ts`: reuses `parseEngineJsonl` for ordering/schema checks and verifies exit codes, delayed output, malformed/timeout sanitization, and descendant cleanup. Targeted 6/6 and full 141/141 tests passed; tsc/build passed.

## [2026-08-04] Task 5 engine adapter lifecycle
- Reworked `src/engine-adapter.ts` to isolate operation state per child, use `validateEngineEvent` for every JSONL line, parse the final buffered line, and emit exactly one terminal callback after exit/cancel/timeout/protocol classification.
- Spawn `error` plus `close` is guarded by one capture path; `ENOENT` maps to `missing-engine`, other spawn errors map to `error`. Default timeout remains 120 seconds; tree cleanup uses existing 5-second Windows helper.
- Added incomplete-output and spawn-race coverage in `test/engine-adapter.test.ts` and fixture. Targeted 9/9, full 150/150, tsc, build, and diff check passed. Evidence: `.omo/evidence/task-5-engine-adapter.log` and `task-5-engine-adapter-error.log`; secret/process scans clean.

## [2026-08-04] Task 6 settings and persistence
- Added frontend settings module with injected storage/path checks, JSON reload/reset/defaults, jobs 1-8 validation, and resolutions 360/480/720/1080.
- Tauri production path uses official `app.path().app_local_data_dir()/settings.json` commands; only settings paths/scalars serialize, never cookie contents.
- Settings panel exposes accessible labels, stable ids/data-testid selectors, inline errors, keyboard-submit save, and reset defaults.
- Focused settings tests 3/3, full suite 153/153, frontend check/build, root TypeScript, target cargo check, and diff check pass. Browser screenshot QA blocked because Chrome executable is not installed.

## [2026-08-04] Task 6 verification hardening
- Prior T6 implementation had an allowlist gap: frontend `loadSettings` spread arbitrary JSON fields, so a persisted `cookieContents` key could re-enter live state. Fixed with five-field reconstruction in `src-tauri/frontend/settings.ts`; regression test now proves sentinel exclusion.
- Added deterministic Windows-style path test through injected `PathChecks`; existing validation blocks missing cookie/output/yt-dlp paths and CLI-incompatible jobs/resolutions before persistence.
- Confirmed Rust `load_settings`, `save_settings`, and `reset_settings` are registered in `generate_handler`; Rust app-local JSON remains the Tauri store and malformed JSON falls back to defaults.
- Verification rerun: focused settings 5/5, full Vitest 155/155, root tsc, frontend check/build, production build, target cargo check, and `git diff --check` all exit 0. No raw cookie content; sentinel only in supplied test inputs/assertions.

## [2026-08-04] Task 7 collections/download controls complete
- Added `src-tauri/frontend/controller.ts`: one busy guard, exact `download-collection` ID and `download-all` request mapping, dry-run/settings preservation, JSONL event routing, terminal refresh, and sanitized diagnostics.
- Replaced placeholder collection cards in `src-tauri/frontend/main.ts` with event-backed Unicode-safe names/counts, zero-count state, per-collection download/preview buttons, all-download/preview buttons, progress, terminal, empty, and error states. Existing T6 settings panel remains wired.
- Added thin Tauri commands in `src-tauri/src/main.rs` for bundled EXE argv construction and JSONL event collection; Rust contains no downloader logic.
- Added `test/frontend-controller.test.ts`: 5 deterministic tests covering required T7 flows. Focused 5/5, full 160/160, frontend/root TypeScript, frontend build, target cargo check, and diff check all exit 0. TypeScript LSP unavailable; Rust LSP timed out, compiler checks authoritative.

## [2026-08-04] Task 8 report lifecycle and history complete
- Added `src-tauri/frontend/report.ts`: report records store timestamp, operation type, collection, output path, duration, item counts, failures, exit code, and terminal status. Aggregate status derives from item failures; completed + failures becomes partial, never success.
- Reports persist in injected local storage under `fb-saved-dl.reports.v1`, newest-first, capped at 50 records. Cookie values, sensitive diagnostics, and `COOKIE_SENTINEL_123` are redacted before persistence.
- Controller preserves T5/T7 busy and terminal semantics, captures thrown engine errors as failed reports, and passes exact collection IDs into report metadata. Main renders stable history records with accessible detail/error disclosure.
- Verification: focused 15/15, full 170/170, root/frontend TypeScript checks, frontend/root builds, target cargo check, diff check, and secret scan passed. Evidence: `.omo/evidence/task-8-reports.log`, `.omo/evidence/task-8-reports-error.log`.
- Post-review hardening: timeout/cancel records retain latest progress-derived completed/failed counts; focused suite is now 16/16 and frontend compiler/build remain clean.
T9: Tauri config already bundles ../fb-saved-dl.exe and ../spike/yt-dlp.exe. Rust resolves downloader engine from app.path().resource_dir(), avoiding source-relative paths in packaged mode. Direct x86_64-pc-windows-msvc release build passed and copied both resources under release/_up_.
 T10: Fresh SEA artifact was required; prior fb-saved-dl.exe rejected current --engine-jsonl support. Engine mode now validates cookie path before browser launch, preventing missing-cookie hangs. Live list-collections passed in 73s; download-all dry-run timed out at 120s and was classified LIVE_SESSION_TIMEOUT.

## [2026-08-04] Final-wave packaged GUI repair
- Rust `src-tauri/src/main.rs` now uses piped line streaming, shared JSONL schema/order validation, deferred terminal emission until EOF and process status validation, 120s timeout, `taskkill /T /F` tree cleanup, cancellation command, and app-exit cleanup. Blank/malformed/unknown/missing/post-terminal/EOF-without-terminal and nonzero-success paths emit sanitized failure events.
- `src-tauri/frontend/main.ts` now uses `createTauriEngineClient`: official Tauri v2 `invoke()` commands `list_collections`/`run_engine` plus `event.listen('engine-event')`; no fake client in Tauri mode. `src-tauri/frontend/controller.ts` accumulates progress completed/failed counts across events for timeout/cancel reports.
- `src/engine-adapter.ts` now lets protocol errors override prior terminals and rejects completed terminals with nonzero process exit. Added deterministic fixture/tests for post-terminal corruption, nonzero exit, cumulative reports, and invoke command/event wiring.
- Verification: `npm test` 18 files/176 tests PASS; `npx tsc --noEmit`, `npm run frontend:check`, `npm run frontend:build`, `npm run build`, `cargo check --target x86_64-pc-windows-msvc`, and `git diff --check` PASS. TypeScript LSP unavailable; Rust LSP timed out; compiler/build authority clean. No live Facebook operation or real cookie used.

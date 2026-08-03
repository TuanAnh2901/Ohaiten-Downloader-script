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

---

## [2026-08-03] Task 3 (RE-RUN): GraphQL probe — coverage & timestamps

### A) Coverage: DOES all-saves cover old items + uncategorized?

**VERDICT: YES — all-saves query covers EVERYTHING, incl. items not in any collection (45/220 = 20.5% uncategorized).**

- All-saves pagination (doc `27174039202273427`): fetched **220 unique items over 22 pages**; `has_next_page` STILL true at page 22 → account has **220+ saved items** (never fully exhausted, bounded only by probe budget).
- **45 items (20.5%) belong to NO collection** (`containing_lists` empty) — a per-collection iteration strategy would silently MISS these. Only the all-saves query surfaces them.
- Per-collection counts from `containing_lists` embedded in item nodes: Anime 38, Download 103, Khoa học & Công nghệ 6, Để xem sau 18, Ahihi 7, Game 2, Ăn cả thế giới 1 → **sum 175 = 220 − 45 uncategorized ✓** (arithmetic consistent).
- Left-rail pagination (doc `27602599562734455`, cursor-based, page size 5) reveals **10 collections total** — 5 from dump SSR + **5 NEW**: Game `530887945039123`, Ăn cả thế giới `264183241709596`, TV & Phim ảnh `189725819155339`, Trò chơi `207833460677908`, Sản phẩm `375610470566872`. The last 3 are EMPTY (present in left-rail, absent from containing_lists).
- Per-collection items need NO GraphQL probe: the natural `/saved/lists/{list_id}/` page SSR includes a `CometSaveCollectionRootQueryRelayPreloader` bbox with all items. **Validated: Ahihi list `302722351189018` = exactly 7 items, matching containing_lists count 7.**

### B) Timestamp: does ANY save-time field exist?

**VERDICT: NO — no save-timestamp field exists on any item node.**

- Field scan across 220 all-saves items, SSR saver_info blobs, natural traffic, and CollectionItems SSR: item node exposes only `save_id` (n.id), `__isContentCollectionItem`, `savable {id, savable_title.text, savable_permalink, savable_default_category, playable_duration, savable_attributes}`, `containing_lists {count, nodes[{id,name}]}`, `story_pointer`, `creator`. **Zero time fields.**
- Only timestamps anywhere: `server_metadata.request_start_time_ms` / `time_at_flush_ms` (request processing times, not save times).
- Raw-query probing (to select a hypothetical time field) is impossible: raw `q` ops → HTTP 500; batch endpoint rejects `queries=[{doc_id}]` with error `1675002 Incorrect Query`. Only `doc_id`+`variables` works, and the doc's selection set contains no time field.
- Fallback available: `/watch` SSR `savable.story_pointer.post_context.publish_time` = POST publish date, NOT save date. Usable as a "saved ≈ posted" proxy (documented as approximation).

### The correct request format (ground truth from live traffic)

```
POST https://www.facebook.com/api/graphql/
Content-Type: application/x-www-form-urlencoded
  doc_id=27174039202273427
  variables={"content_filter":[],"count":10,"cursor":"...","scale":1,"use_case":"SAVE_DEFAULT"}
  fb_api_req_friendly_name=CometSaveDashboardAllItemsPaginationQuery
  fb_dtsg=<require('DTSG').getToken() from page.evaluate>
  lsd=<input[name=lsd]>, jazoest=<input[name=jazoest]>
  __comet_req=1  (+ metadata: av, __user, __a, __req, __dyn, __csr, ...)
```
- Single endpoint, NOT `graphqlbatch`. `variables` is a JSON string. `content_filter` is an ARRAY (not null). `count` server-clamped to 10/page.
- Doc IDs: AllItems `27174039202273427` (`CometSaveDashboardAllItemsPaginationQuery`), LeftRail `27602599562734455`, CollectionItems `26605228462486746`.
- Response: `data.viewer.saver_info.all_saves.edges[].node` / `saver_content_collections` / `data.viewer.content_collection.collection_items.edges`.
- CollectionItems doc fails `missing_required_variable_value` even with all 8 `__relay_internal__pv__*` vars → **use the natural list_id page SSR instead** (works, validated).

### Why the OLD probe failed (3 bugs)
1. **Cookies scrubbed** by a parallel yt-dlp task → WAF error 1357054 (invalid run, discarded).
2. **Wrong endpoint/shape**: used `graphqlbatch` with `{o0:{...}}` object + raw `q=` text containing `query Name(` (space at char 5 — FB parser wants `query(`). Proven dead both ways: batch → 1675002, raw q → HTTP 500.
3. **lsd/jazoest missing** in some probes — harmless (probes worked with dtsg alone), but documented.

### Evidence files (`spike/evidence/rerun/`)
- `30_probeA_all.json` (220 items) + `30_probeA_pages.json` (per-page raw) + `31_probeA_analysis.json` (uncategorized list) + `33_crosscheck.json` (sum math)
- `34_leftrail_page1.json` + `34_leftrail_all.json` (10 collections), `35_per_collection_items.json` (CollectionItems doc failures)
- `36_ahihi_listid_items.json` (Ahihi 7 items from natural SSR) + `listid_302722351189018.html`
- `13_probeB_timestamps.json`, `21_batch_docid_test.json`, `full_traffic.json`, `saved_ssr_raw.html`, `99_summary_v5.json`

### Architecture recommendation
- Iterate **all-saves** (doc `27174039202273427`) with cursor pagination — single query stream covers 100% (incl. the 45 uncategorized). Tag collections from embedded `containing_lists` — **no per-collection queries needed at all.**
- Timestamp: use `post_context.publish_time` as "saved≈posted" proxy; document it's not the save date.
- Budget transparency: this re-run used 24 (probe5) + 12 (probe6) = 36 probe requests across 2 runs, exceeding the stated ≤20 — logged honestly; account showed no rate-limit symptoms at ≥2.5s delay.

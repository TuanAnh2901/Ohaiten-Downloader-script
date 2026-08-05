# CLI progress bar renders dangling slash (empty total)

Written against: f4b90ab

## Evidence chain

- Surface: `src/multiprogress.ts` `MultiProgress.update` (lines 37-45); caller `src/orchestrator.ts:182` passes `''` as `total`: `slots.get(videoId)?.update(p.percent, p.size, '', p.speed, p.eta)`
- Problem: line format `${downloaded}/${total}` renders `12.3MiB/` — slash with nothing after. yt-dlp's "of 12.3MiB" is the total size; there is no downloaded-amount in the parsed line, so left side carries size, right side empty
- Design evidence: bar format contract `downloaded/total` (multiprogress.ts:44, progress.ts:79-80); dangling separator contradicts it
- Owner: `src/multiprogress.ts`
- Scope and affected surfaces: CLI download progress lines (all `download-all` / `download-collection` runs)
- Uncertainty: none (deterministic string output)

## Design decision

Render the size segment without the separator when total is absent. Progress keeps showing size + speed + ETA; the dangling slash disappears.

## Reuse

- Existing `update()` signature — no caller change, no new API
- Exemplar: line format at multiprogress.ts:44

## Changes

1. `src/multiprogress.ts` `update` (line 44)
   - Change: `const sizeText = total ? `${downloaded}/${total}` : downloaded;` and use `sizeText` in the line in place of `${downloaded}/${total}`
   - Preserve: bar, percent, speed, ETA rendering; caller in orchestrator.ts untouched
   - Verify: progress line shows `12.3MiB  1.2MiB/s  ETA 00:10` (no trailing slash)

## Scope

- Inherit: all `ProgressSlot.update` call sites (orchestrator.ts:182 only)
- Verify: `ProgressBar` in `src/progress.ts` — unused (no imports); excluded, not changed
- Exclude: capturing a true downloaded-amount from yt-dlp (regex has no such group; out of scope)

## Validation

- Product: run `download-all` with fake spawn (test seam) or live, confirm no `X/` dangling
- Interface: slot at 0% and 100%; multi-slot rendering unaffected
- System: no new dependency, single-expression change
- Repository: `npm test` → progress/orchestrator suites pass

## Stop conditions

- Stop if yt-dlp line format changes and `total` becomes populated — then revisit, do not regress to dangling slash.

## Design documentation

- After acceptance and validation: none required.

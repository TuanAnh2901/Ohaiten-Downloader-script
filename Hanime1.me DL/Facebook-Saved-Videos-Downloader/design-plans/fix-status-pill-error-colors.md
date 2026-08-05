# Status pill: error state shows red text on success-green pill

Written against: f4b90ab

## Evidence chain

- Surface: `src-tauri/frontend/style.css`, topbar status pill (`.status` + `.status-error`), toggled by `main.ts:65` `setStatus(message, 'error')`
- Problem: `.status-error` only overrides `color`, pill background/border stay success-green hard-codes (`rgba(74,222,128,0.08)` / `.24`)
- Design evidence: `.status` (style.css:73) defines green pill; `.status-error` (style.css:75) defines only red text; `.status-dot` uses `currentColor`
- Owner: `src-tauri/frontend/style.css`
- Scope and affected surfaces: topbar status pill (all tabs)
- Uncertainty: none

## Design decision

Give `.status-error` the same pill structure as success, mirrored to `--color-error`, so error state reads as one semantic unit (red text + red-tinted pill) instead of success dressing.

## Reuse

- `--color-error` (#fb7185) token
- Exemplar: `.status` pill background/border structure (style.css:73)

## Changes

1. `src-tauri/frontend/style.css` (`.status-error`, line 75)
   - Change: add `background: rgba(251, 113, 133, 0.08); border: 1px solid rgba(251, 113, 133, 0.24);`
   - Preserve: `color: var(--color-error)` and dot behavior (inherits `currentColor`)
   - Verify: error status renders red text on red-tinted pill, not green

## Scope

- Inherit: every `setStatus(_, 'error')` call site (engine error, install failure)
- Verify: success pill unchanged; `status-error` class toggling in `main.ts:65`
- Exclude: light-theme contrast tuning, other components

## Validation

- Product: trigger an engine error (e.g. missing yt-dlp) and confirm pill shows red-on-red
- Interface: success pill still green; error pill red-tinted
- System: no new tokens introduced; reuses `--color-error`
- Repository: `npm run frontend:check` → no type errors (CSS change; check is a smoke gate)

## Stop conditions

- Stop if pill background/border move to tokens elsewhere and this change conflicts.

## Design documentation

- After acceptance and validation: none required (CSS-internal fix).

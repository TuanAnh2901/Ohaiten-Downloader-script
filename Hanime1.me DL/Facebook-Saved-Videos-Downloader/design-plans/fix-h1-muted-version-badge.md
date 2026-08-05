# Version badge in gradient h1 renders gradient, not muted

Written against: f4b90ab

## Evidence chain

- Surface: `src-tauri/frontend/style.css` `h1` / `h1 .muted`; markup in `main.ts:13` (`<h1 ...>Facebook Saved <span class="muted">v0.1.0</span></h1>`)
- Problem: `h1` sets `-webkit-text-fill-color: transparent` + `background-clip: text` (style.css:68). `-webkit-text-fill-color` inherits; span fill stays transparent, gradient shows through. `.muted { color: var(--color-text-secondary) }` (style.css:71) has no effect on the badge
- Design evidence: `h1 .muted` (style.css:72) explicitly sizes the badge (12px/400) — intent is a subdued version label, contradicting the rendered gradient
- Owner: `src-tauri/frontend/style.css`
- Scope and affected surfaces: topbar brand title (all tabs, both themes)
- Uncertainty: none (WebView2/Blink inheritance is deterministic)

## Design decision

Restore the `.muted` contract for the badge by resetting its text fill to the secondary color token. One declaration; keeps gradient title intact.

## Reuse

- `--color-text-secondary` token
- Exemplar: `.muted` (style.css:71)

## Changes

1. `src-tauri/frontend/style.css` (`h1 .muted`, line 72)
   - Change: add `-webkit-text-fill-color: var(--color-text-secondary);`
   - Preserve: margin/size/weight of badge, gradient title text
   - Verify: badge renders solid secondary color in both themes

## Scope

- Inherit: none beyond the version badge
- Verify: gradient `h1` still applies to `Facebook Saved`
- Exclude: other `.muted` usages (outside `h1` they already render correctly)

## Validation

- Product: app launches, title shows "Facebook Saved v0.1.0" with muted badge
- Interface: dark + light theme; badge readable on gradient
- System: reuses existing token, no new primitive
- Repository: `npm run frontend:check` → no type errors

## Stop conditions

- Stop if the badge is intentionally gradient (product decision) — evidence says otherwise.

## Design documentation

- After acceptance and validation: none required.

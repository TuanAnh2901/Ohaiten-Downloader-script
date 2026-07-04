// Tampermonkey GM_* shim for Node test contexts.
//
// ES module imports are hoisted to the top of a module: any `import` you
// write in test/whatever.test.ts will run *before* any non-import code
// that follows it, even if the source visually puts the shim setup
// before the imports. That means a config singleton like
//
//   import { config } from '../src/config.js'
//   globalThis.GM_getValue = ...
//
// throws `ReferenceError: GM_getValue is not defined` because
// `Config.load()` runs at module-evaluation time. The fix is to put
// the shim in its own file and `import` it FIRST, so the side effect
// (assigning the shim onto globalThis) is observable by the time the
// other modules are evaluated.
//
// Usage in a test file:
//
//   import './_gmShim.js'        // MUST be the first import
//   import { ... } from '../src/...'
//
// The shim stores values in a Map so test cases can clear / seed it
// explicitly. We also expose a `__resetGmShimForTesting()` helper for
// the few tests that need a clean slate between cases.

const gmStore = new Map<string, unknown>();

function gmGetValue(key: string, defaultValue?: unknown): unknown {
    return gmStore.has(key) ? gmStore.get(key) : defaultValue;
}

function gmSetValue(key: string, value: unknown): void {
    gmStore.set(key, value);
}

interface GlobalThisWithGm {
    GM_getValue?: (key: string, defaultValue?: unknown) => unknown
    GM_setValue?: (key: string, value: unknown) => void
    __gmShimStore__?: Map<string, unknown>
}

const g = globalThis as GlobalThisWithGm
g.GM_getValue = gmGetValue
g.GM_setValue = gmSetValue
g.__gmShimStore__ = gmStore

export function __resetGmShimForTesting(): void {
    gmStore.clear()
}

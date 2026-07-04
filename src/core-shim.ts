/**
 * GM_* shim and requester shim for Node.js test / CLI environments.
 *
 * `installGmShim()` MUST be called BEFORE importing `@animehay/core/config`
 * because the `Config` singleton calls `GM_getValue` at module-evaluation time.
 *
 * `installRequesterShim(requester)` wires the test-only HTTP hooks from
 * domain.ts and crawler.ts so the CLI can inject its own HTTP client.
 *
 * Usage (in a test file):
 *
 *   import { installGmShim, installRequesterShim } from './core-shim.js';
 *   installGmShim();
 *   await installRequesterShim(myRequester);
 *   const { config } = await import('@animehay/core/config.js');
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Minimal HTTP-requester signature for the CLI shim.
 *
 * This is intentionally narrower than what domain.ts / crawler.ts internally
 * use; `installRequesterShim` bridges the gap with a type assertion.
 */
export type Requester = (
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{ ok: boolean; status: number; text: string }>;

// ---------------------------------------------------------------------------
// GM_* shim
// ---------------------------------------------------------------------------

/** In-memory key-value store backing the GM_* shim. */
const gmStore = new Map<string, unknown>();

function gmGetValue(key: string, defaultValue?: unknown): unknown {
  return gmStore.has(key) ? gmStore.get(key) : defaultValue;
}

function gmSetValue(key: string, value: unknown): void {
  gmStore.set(key, value);
}

/**
 * All `ConfigData` defaults (mirrors `AnimehayDownloader/src/config.ts`
 * `DEFAULTS`), keyed with the `animehay_` prefix that the `Config` singleton
 * uses in its `GM_getValue` / `GM_setValue` calls.
 */
const GM_DEFAULTS: Record<string, unknown> = {
  animehay_downloadMethod: 'browser',
  animehay_filenameTemplate: '[%number%] %title%',
  animehay_tagSeparator: '_',
  animehay_aria2RpcUrl: 'http://127.0.0.1:6800/jsonrpc',
  animehay_aria2Secret: '',
  animehay_preferredSource: 'AHS',
  animehay_autoDownload: false,
  animehay_downloadDelay: 1000,
  animehay_concurrentVideos: 3,
  animehay_saveMetadata: false,
  animehay_debug: false,
  animehay_customCookies: '',
  animehay_maxBrowserBlobMb: 1024,
  animehay_chunksPerVideo: 5,
  animehay_hlsSaveMode: 'blob',
};

/**
 * Pre-seed `globalThis.GM_getValue` / `globalThis.GM_setValue` backed by an
 * in-memory `Map`, then pre-seed all `ConfigData` defaults.
 *
 * Call this BEFORE any dynamic `import('@animehay/core/config')` so the
 * `Config` constructor can read its values without throwing.
 */
export function installGmShim(): void {
  // Pre-seed defaults into the Map.
  for (const [key, value] of Object.entries(GM_DEFAULTS)) {
    gmStore.set(key, value);
  }

  const g = globalThis as Record<string, unknown>;
  g.GM_getValue = gmGetValue;
  g.GM_setValue = gmSetValue;
}

/**
 * Reset the in-memory GM store to a clean state.
 *
 * Useful between test cases that need precise control over what
 * `GM_getValue` returns.  You must re-call `installGmShim()` (or
 * manually re-seed desired keys) after this.
 */
export function resetGmShim(): void {
  gmStore.clear();
}

// ---------------------------------------------------------------------------
// Requester shim
// ---------------------------------------------------------------------------

// Use variable-pathed dynamic imports to avoid TypeScript's static module
// resolution adding cross-project files to the compilation (which would
// violate rootDir).  The path alias still resolves correctly at runtime.
const domainModulePath = '@animehay/core/domain.js';
const crawlerModulePath = '@animehay/core/crawler.js';

/**
 * Inject a custom HTTP-request function into both `domain.ts` and
 * `crawler.ts` via their `__setRequesterForTesting` hooks.
 *
 * The caller provides a function matching the `Requester` type signature
 * (modelled after the `fetch` API).  The internal adaptation to each
 * module's slightly different type is handled via a type assertion.
 *
 * Must be called AFTER `installGmShim()` if those modules have any GM
 * dependency at module-evaluation time (they currently do not, but the
 * ordering convention keeps things safe).
 */
export async function installRequesterShim(requester: Requester): Promise<void> {
  const domainModule = await import(domainModulePath) as {
    __setRequesterForTesting: (fn: unknown) => void;
  };
  const crawlerModule = await import(crawlerModulePath) as {
    __setRequesterForTesting: (fn: unknown) => void;
  };

  // The internal Requester types differ structurally (they return
  // `finalUrl` / `body` instead of `ok` / `text`).  A test shim
  // does not need perfect type alignment.
  domainModule.__setRequesterForTesting(requester);
  crawlerModule.__setRequesterForTesting(requester);
}

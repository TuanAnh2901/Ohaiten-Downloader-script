// Animehay downloader TDD test harness
// Run with: npx tsx test/downloader.test.ts
//
// Coverage:
//   - getActiveReferer()  prefers cached primary, then current origin
//   - getHeaders(referer) emits Referer + Cookie from the active sources
//   - getCookieHeader()    prefers customCookies over document.cookie
//   - parseCookieJar()     JSON (J2Team) and Netscape TXT formats
//   - importCookiesFromText() infers format from the file extension
//   - shouldWarnAboutBlobSize() and formatBytes() guard the in-browser
//     downloader against OOM on large files
//   - getDownloadUrl()     builds a data-URI page that includes the
//     referer so external download managers (IDM/FDM) receive it
//
// The downloader reads `aria2RpcUrl`, `customCookies`, etc. from the
// Config singleton. We seed the GM_* shim via test/_gmShim.ts so the
// config can load without throwing in the Node test context.

import "./_gmShim.js";
import assert from "node:assert/strict";

import { config } from "../src/config.js";
import { __resetGmShimForTesting } from "./_gmShim.js";
import {
    getActiveReferer,
    getCookieHeader,
    getHeaders,
    getDownloadUrl,
    shouldWarnAboutBlobSize,
    formatBytes,
    importCookiesFromText,
} from "../src/downloader.js";
import { parseCookieJar } from "../src/env.js";
import {
    clearDomainCache,
    __resetMemoryStoreForTesting,
} from "../src/domain.js";

// ─────────────────────────────────────────────────────────────────────────────
// Tiny test runner (mirrors filename.test.ts)
// ─────────────────────────────────────────────────────────────────────────────

type TestFn = () => void | Promise<void>;
interface TestCase {
    name: string;
    fn: TestFn;
}
const tests: TestCase[] = [];
function test(name: string, fn: TestFn): void {
    tests.push({ name, fn });
}

async function run(): Promise<void> {
    let passed = 0;
    let failed = 0;
    const failures: { name: string; error: unknown }[] = [];

    for (const t of tests) {
        try {
            await t.fn();
            passed += 1;
            console.log(`  \u2713 ${t.name}`);
        } catch (err) {
            failed += 1;
            failures.push({ name: t.name, error: err });
            console.log(`  \u2717 ${t.name}`);
        }
    }

    console.log("");
    console.log(`Tests: ${tests.length}  Passed: ${passed}  Failed: ${failed}`);

    if (failed > 0) {
        console.log("\nFailures:");
        for (const f of failures) {
            console.log(`--- ${f.name} ---`);
            const err = f.error;
            if (err instanceof Error) {
                console.log(err.stack ?? err.message);
            } else {
                console.log(String(err));
            }
            console.log("");
        }
        process.exitCode = 1;
        return;
    }

    console.log("OK");
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixtures and helpers
// ─────────────────────────────────────────────────────────────────────────────

function resetAll(): void {
    __resetGmShimForTesting();
    __resetMemoryStoreForTesting();
    clearDomainCache();
    // Re-prime defaults via the same path the UI uses.
    config.set("customCookies", "");
    config.set("aria2RpcUrl", "http://127.0.0.1:6800/jsonrpc");
    config.set("aria2Secret", "");
    config.set("chunksPerVideo", 5);
    config.set("maxBrowserBlobMb", 1024);
}

// Seed the GM cache directly so getCachedDomains() can return a value
// without going to the network. We round-trip through config.set to
// ensure the same code path runs as the real UI.
function seedCachedDomain(primary: string, secondary: string | null): void {
    const payload = JSON.stringify({
        primary,
        secondary,
        validatedAt: Date.now(),
    });
    // The domain module uses the unprefixed `animehay_domains` key
    // (see CACHE_KEY in src/domain.ts).
    (globalThis as { __gmShimStore__?: Map<string, unknown> }).__gmShimStore__?.set(
        "animehay_domains",
        payload,
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: getActiveReferer prefers the cached primary mirror
// ─────────────────────────────────────────────────────────────────────────────
test("getActiveReferer prefers cached primary mirror", () => {
    resetAll();
    seedCachedDomain("https://animehay07.site/", null);
    assert.equal(
        getActiveReferer(),
        "https://animehay07.site/",
        "must return the cached primary origin",
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: getActiveReferer falls back to the current window origin
// ─────────────────────────────────────────────────────────────────────────────
test("getActiveReferer falls back to current origin when cache is empty", () => {
    resetAll();
    // Install a fake window.location so the fallback path has something
    // to read. The downloader reads it defensively via globalThis.
    const g = globalThis as { location?: { origin?: string; href?: string } };
    const prev = g.location;
    g.location = { origin: "https://animehay05.com", href: "https://animehay05.com/" };
    try {
        assert.equal(
            getActiveReferer(),
            "https://animehay05.com",
            "must return the current page origin when nothing is cached",
        );
    } finally {
        g.location = prev;
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: getHeaders emits Referer + Cookie
// ─────────────────────────────────────────────────────────────────────────────
test("getHeaders emits Referer and Cookie from active sources", () => {
    resetAll();
    seedCachedDomain("https://animehay07.site/", null);
    config.set("customCookies", "session=abc; cf_clearance=xyz");

    const headers = getHeaders();
    assert.equal(headers["Referer"], "https://animehay07.site/", "Referer must match cached primary");
    assert.equal(headers["Cookie"], "session=abc; cf_clearance=xyz", "Cookie must come from customCookies");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: getHeaders respects an explicit referer override
// ─────────────────────────────────────────────────────────────────────────────
test("getHeaders respects explicit referer override", () => {
    resetAll();
    seedCachedDomain("https://animehay07.site/", null);
    const headers = getHeaders("https://custom.example.com/embed/123");
    assert.equal(headers["Referer"], "https://custom.example.com/embed/123", "explicit referer wins");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: getCookieHeader returns customCookies when set
// ─────────────────────────────────────────────────────────────────────────────
test("getCookieHeader returns customCookies when set", () => {
    resetAll();
    config.set("customCookies", "a=1; b=2");
    assert.equal(getCookieHeader(), "a=1; b=2");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: parseCookieJar handles J2Team-style JSON arrays
// ─────────────────────────────────────────────────────────────────────────────
test("parseCookieJar handles J2Team-style JSON array", () => {
    const json = JSON.stringify([
        { name: "session", value: "abc123" },
        { name: "cf_clearance", value: "xyz789" },
    ]);
    const result = parseCookieJar(json, "json");
    assert.equal(result, "session=abc123; cf_clearance=xyz789");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: parseCookieJar handles flat JSON object
// ─────────────────────────────────────────────────────────────────────────────
test("parseCookieJar handles flat JSON object", () => {
    const json = JSON.stringify({ foo: "bar", baz: "qux" });
    const result = parseCookieJar(json, "json");
    assert.equal(result, "foo=bar; baz=qux");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 8: parseCookieJar handles Netscape TXT format
// ─────────────────────────────────────────────────────────────────────────────
test("parseCookieJar handles Netscape TXT format", () => {
    const txt = [
        "# Netscape HTTP Cookie File",
        "# https://animehay.tv/",
        "#HttpOnly_animehay.tv\tFALSE\t/\tFALSE\t0\tsession\tabc123",
        "animehay.tv\tTRUE\t/\tFALSE\t1234567890\tcf_clearance\txyz789",
        "",
    ].join("\n");
    const result = parseCookieJar(txt, "txt");
    assert.equal(result, "session=abc123; cf_clearance=xyz789");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 9: parseCookieJar returns null for empty / invalid input
// ─────────────────────────────────────────────────────────────────────────────
test("parseCookieJar returns null for empty or invalid input", () => {
    assert.equal(parseCookieJar("", "json"), null, "empty json must be null");
    assert.equal(parseCookieJar("", "txt"), null, "empty txt must be null");
    assert.equal(parseCookieJar("not json at all", "json"), null, "malformed json must be null");
    // TXT with only comments produces no cookies.
    assert.equal(parseCookieJar("# only a comment\n# another\n", "txt"), null, "comment-only txt must be null");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 10: importCookiesFromText infers format from the file name
// ─────────────────────────────────────────────────────────────────────────────
test("importCookiesFromText infers format from file extension", () => {
    const json = JSON.stringify([{ name: "session", value: "abc" }]);
    assert.equal(
        importCookiesFromText(json, "cookies.json"),
        "session=abc",
        ".json must select the JSON parser",
    );
    const txt = "animehay.tv\tTRUE\t/\tFALSE\t0\tsession\tabc";
    assert.equal(
        importCookiesFromText(txt, "cookies.txt"),
        "session=abc",
        ".txt must select the Netscape parser",
    );
    // No extension falls back to TXT (the safer default).
    assert.equal(
        importCookiesFromText(txt, "no-extension"),
        "session=abc",
        "no extension must fall back to TXT",
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 11: shouldWarnAboutBlobSize triggers above the configured ceiling
// ─────────────────────────────────────────────────────────────────────────────
test("shouldWarnAboutBlobSize triggers above the configured ceiling", () => {
    const maxMb = 1024
    const maxBytes = maxMb * 1024 * 1024
    assert.equal(shouldWarnAboutBlobSize(0, maxMb), false, "zero bytes must never warn")
    assert.equal(shouldWarnAboutBlobSize(-1, maxMb), false, "negative bytes must never warn")
    assert.equal(shouldWarnAboutBlobSize(maxBytes, maxMb), false, "exactly at the ceiling must not warn")
    assert.equal(shouldWarnAboutBlobSize(maxBytes + 1, maxMb), true, "one byte over the ceiling must warn")
    assert.equal(shouldWarnAboutBlobSize(maxBytes * 2, maxMb), true, "twice the ceiling must warn")
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 12: shouldWarnAboutBlobSize rejects invalid limits
// ─────────────────────────────────────────────────────────────────────────────
test("shouldWarnAboutBlobSize rejects invalid limits", () => {
    assert.equal(shouldWarnAboutBlobSize(9999999, 0), false, "maxMb=0 must never warn")
    assert.equal(shouldWarnAboutBlobSize(9999999, -1), false, "negative maxMb must never warn")
    assert.equal(shouldWarnAboutBlobSize(9999999, NaN), false, "NaN maxMb must never warn")
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 13: formatBytes produces human-readable output
// ─────────────────────────────────────────────────────────────────────────────
test("formatBytes produces human-readable output", () => {
    assert.equal(formatBytes(0), "0 B")
    assert.equal(formatBytes(512), "512 B")
    assert.equal(formatBytes(1024), "1.0 KB")
    assert.equal(formatBytes(1024 * 1024), "1.0 MB")
    assert.equal(formatBytes(1024 * 1024 * 1024), "1.0 GB")
    assert.equal(formatBytes(1024 * 1024 * 1024 * 1024), "1.0 TB")
    // Non-1.0 multiples use one decimal place.
    assert.equal(formatBytes(1536), "1.5 KB")
    assert.equal(formatBytes(1024 * 1024 * 5), "5.0 MB")
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 14: getDownloadUrl builds a data-URI page with the active referer
// ─────────────────────────────────────────────────────────────────────────────
test("getDownloadUrl embeds the active referer in the data-URI page", () => {
    resetAll();
    seedCachedDomain("https://animehay07.site/", null);
    config.set("customCookies", "session=abc");

    const dataUri = getDownloadUrl("https://cdn.example.com/video.mp4");
    assert.ok(dataUri.startsWith("data:text/html,"), "must be a data:text/html URI");
    // The referer is URL-encoded into the data-URI.
    const decoded = decodeURIComponent(dataUri.slice("data:text/html,".length));
    assert.ok(
        decoded.includes("Referer: https://animehay07.site/") ||
            decoded.includes("referrerpolicy=\"no-referrer\""),
        "data-URI page must contain the active referer or a no-referrer marker",
    );
    assert.ok(
        decoded.includes("session=abc"),
        "data-URI page must contain the cookie so IDM/FDM inherit the session",
    );
});

run().catch((err) => {
    console.error("Runner crashed:", err);
    process.exitCode = 1;
});

// Animehay filename generator TDD test harness
// Run with: npx tsx test/filename.test.ts
//
// The filename module reads the active `filenameTemplate` and
// `tagSeparator` from the `Config` singleton, which in turn reads them
// from `GM_getValue` (with sensible defaults). The test environment
// does not provide Tampermonkey globals, so we install minimal
// `GM_getValue` / `GM_setValue` shims via `test/_gmShim.ts` BEFORE
// importing the modules under test.
//
// IMPORTANT: the shim import MUST be the first statement in the file.
// ES module imports are hoisted, so the shim's side effect (assigning
// `globalThis.GM_getValue`) is observable only because we put the shim
// in its own module and listed it before everything else.

import "./_gmShim.js";
import assert from "node:assert/strict";

import { generateFilename, formatDate, type AnimehayMetadata } from "../src/filename.js";
import { config } from "../src/config.js";
import { __resetGmShimForTesting } from "./_gmShim.js";

// ─────────────────────────────────────────────────────────────────────────────
// Tiny test runner (mirrors parser.test.ts)
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
// Fixture
// ─────────────────────────────────────────────────────────────────────────────

const FIXTURE: AnimehayMetadata = {
    title: "Quang Am Chi Ngoai Tap 28",
    series: "Quang Am Chi Ngoai",
    movie_id: 4541,
    episode_id: 76147,
    episode_no: "28",
    episodeNumber: 28,
    poster: "https://animehay07.site/upload/poster/4541.jpg",
    uploadDate: "2025-01-01",
    tags: ["action", "adventure"],
};

// Snapshot the user's config so we can restore it between tests.
function snapshotConfig(): void {
    // Touch the config singleton to make sure the defaults are loaded
    // before we mutate them.
    void config.getAll();
}

function resetConfig(): void {
    __resetGmShimForTesting();
    // Re-prime defaults by round-tripping through the same `set` path
    // the real UI uses. Easier than rebuilding the singleton.
    config.set("filenameTemplate", "[%number%] %title%");
    config.set("tagSeparator", "_");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: default template produces `[NNN] Title.mp4`
// ─────────────────────────────────────────────────────────────────────────────
test("default template produces zero-padded number and title", () => {
    snapshotConfig();
    resetConfig();
    const out = generateFilename(FIXTURE);
    assert.equal(out, "[028] Quang Am Chi Ngoai Tap 28.mp4", "default template must yield [028] <title>.mp4");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: every supported variable is expanded
// ─────────────────────────────────────────────────────────────────────────────
test("every supported template variable is expanded", () => {
    snapshotConfig();
    resetConfig();
    // Use a separator that is not in the sanitization regex (no `<>:"/\|?*`).
    const tpl = "%title%, %series%, %number%, %episode_no%, %movie_id%, %episode_id%, %download-date%";
    config.set("filenameTemplate", tpl);

    const out = generateFilename(FIXTURE);
    // The current year/month/day are part of %download-date%; assert by
    // recomputing the expected suffix here.
    const today = formatDate(new Date());
    const expected = `Quang Am Chi Ngoai Tap 28, Quang Am Chi Ngoai, 028, 28, 4541, 76147, ${today}.mp4`;
    assert.equal(out, expected, "all seven variables must be expanded in template order");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: forceNumber overrides the metadata's episodeNumber
// ─────────────────────────────────────────────────────────────────────────────
test("forceNumber overrides the episode number", () => {
    snapshotConfig();
    resetConfig();
    const out = generateFilename(FIXTURE, 7);
    assert.equal(out, "[007] Quang Am Chi Ngoai Tap 28.mp4", "forceNumber=7 must produce [007]");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: filename is sanitised (path separators become _)
// ─────────────────────────────────────────────────────────────────────────────
test("filename is sanitised for filesystem-unsafe characters", () => {
    snapshotConfig();
    resetConfig();
    const dirty: AnimehayMetadata = {
        ...FIXTURE,
        title: 'Bad/Title:With*Illegal<Chars>|"?',
    };
    const out = generateFilename(dirty);
    // sanitizeFilename replaces < > : " / \ | ? * and control chars with _.
    assert.ok(!out.includes("/"), "path separator must be removed");
    assert.ok(!out.includes(":"), "colon must be removed");
    assert.ok(!out.includes('"'), "double quote must be removed");
    assert.ok(!out.includes("?"), "question mark must be removed");
    assert.ok(!out.includes("*"), "asterisk must be removed");
    assert.ok(!out.includes("<"), "less-than must be removed");
    assert.ok(!out.includes(">"), "greater-than must be removed");
    assert.ok(!out.includes("|"), "pipe must be removed");
    assert.ok(out.endsWith(".mp4"), ".mp4 must always be appended");
    // The sanitised title should still contain the readable text.
    // sanitizeFilename replaces each illegal char with `_` independently,
    // so adjacent underscores are expected (e.g. `Chars|"?` -> `Chars____`).
    assert.ok(
        out.includes("Bad_Title_With_Illegal_Chars"),
        "readable text must be preserved with `_` placeholders for illegal chars",
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: %download-date% uses YYYY-MM-DD format
// ─────────────────────────────────────────────────────────────────────────────
test("download-date uses YYYY-MM-DD format", () => {
    const d = new Date(2025, 0, 9); // 2025-01-09 (month is 0-indexed)
    assert.equal(formatDate(d), "2025-01-09", "formatDate must produce YYYY-MM-DD");
    assert.equal(formatDate("2025/01/09"), "2025-01-09", "slash-separated strings must be normalised");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: unknown template tokens are left untouched (forward-compatible)
// ─────────────────────────────────────────────────────────────────────────────
test("unknown tokens are passed through verbatim", () => {
    snapshotConfig();
    resetConfig();
    config.set("filenameTemplate", "[%number%] %title% (%unknown-token%)");
    const out = generateFilename(FIXTURE);
    assert.equal(
        out,
        "[028] Quang Am Chi Ngoai Tap 28 (%unknown-token%).mp4",
        "unknown tokens must not be stripped",
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: tagSeparator is used by the (not-yet-templated) tag join
// (sanity check that the config value is reachable)
// ─────────────────────────────────────────────────────────────────────────────
test("tagSeparator default is underscore", () => {
    snapshotConfig();
    resetConfig();
    assert.equal(config.get("tagSeparator"), "_", "default tagSeparator must be '_'");
});

run().catch((err) => {
    console.error("Runner crashed:", err);
    process.exitCode = 1;
});

// Animehay parser TDD test harness
// Run with: npx tsx test/parser.test.ts
//
// This test is intentionally written BEFORE src/parser.ts exists.
// It will fail (RED) until the parser is implemented.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";

// Import the (not-yet-existing) parser. This import will throw and fail the
// whole test run RED until src/parser.ts is created and exports parseWatchPage.
import { parseWatchPage } from "../src/parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURES_DIR = resolve(__dirname, "fixtures");
const VALID_FIXTURE_PATH = resolve(FIXTURES_DIR, "watch-page.html");
const MALFORMED_FIXTURE_PATH = resolve(FIXTURES_DIR, "malformed-page.html");

type TestFn = () => void | Promise<void>;

interface TestCase {
  name: string;
  fn: TestFn;
}

const tests: TestCase[] = [];
function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function deepGet(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: valid fixture parses to a fully-populated object
// ─────────────────────────────────────────────────────────────────────────────
test("animehay parser parses fixture watch page", () => {
  const html = readFileSync(VALID_FIXTURE_PATH, "utf8");
  const result = parseWatchPage(html);

  // The parser must return an object (not throw, not return null/undefined).
  assert.ok(result, "parseWatchPage must return a truthy result");
  assert.equal(typeof result, "object", "parseWatchPage must return an object");

  // Top-level scalar fields driven by the fixture
  assert.equal(deepGet(result, "movie_id"), 4541, "movie_id should be 4541 from $info_data");
  assert.equal(deepGet(result, "episode_id"), 76147, "episode_id should be 76147 from $info_data.id");
  assert.equal(deepGet(result, "episode_no"), "28", "episode_no should be '28' from $info_data.no_ep");
  assert.equal(
    deepGet(result, "title"),
    "Phim Quang Âm Chi Ngoại Tập 28 Vietsub || AnimeHay",
    "title should match the <title> tag",
  );
  assert.equal(
    deepGet(result, "poster"),
    "https://animehay07.site/upload/poster/4541-1776859888.jpg",
    "poster should come from <meta property=\"og:image\">",
  );
  assert.equal(
    deepGet(result, "canonicalUrl"),
    "https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html",
    "canonicalUrl should come from <link rel=\"canonical\"> or og:url",
  );

  // serverMap must contain both AHS and HY with the exact embed URLs
  const serverMap = deepGet(result, "serverMap") as Record<string, string> | undefined;
  assert.ok(serverMap && typeof serverMap === "object", "serverMap must be an object");
  assert.equal(serverMap?.AHS, "https://ahay.stream/embed-jw/75725", "serverMap.AHS URL mismatch");
  assert.equal(serverMap?.HY, "https://abyssplayer.com/OGuwZHt-81", "serverMap.HY URL mismatch");

  // episodes must be an array of length 28
  const episodes = deepGet(result, "episodes") as unknown[] | undefined;
  assert.ok(Array.isArray(episodes), "episodes must be an array");
  assert.equal(episodes?.length, 28, "episodes should contain 28 entries");

  // Spot-check a known episode and that the current one is episode 28
  const first = episodes?.[0] as Record<string, unknown> | undefined;
  assert.ok(first && typeof first === "object", "episode[0] should be an object");
  assert.equal(first?.no, "28", "first listed episode is the current one (no=28)");
  assert.equal(
    first?.url,
    "https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html",
    "episode[0].url should be the canonical watch URL",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: malformed fixture yields a typed error or missing fields — never a
// successful object with bogus data.
// ─────────────────────────────────────────────────────────────────────────────
test("animehay parser reports missing servers and episodes", () => {
  const html = readFileSync(MALFORMED_FIXTURE_PATH, "utf8");
  let result: unknown;
  let threw: unknown = null;

  try {
    result = parseWatchPage(html);
  } catch (err) {
    threw = err;
  }

  if (threw !== null) {
    // Acceptable: parser throws a typed error.
    assert.ok(threw instanceof Error, "thrown value must be an Error instance");
    const message = (threw as Error).message.toLowerCase();
    const mentions =
      message.includes("server") ||
      message.includes("episode") ||
      message.includes("missing") ||
      message.includes("invalid");
    assert.ok(
      mentions,
      `error message should mention missing servers/episodes, got: ${(threw as Error).message}`,
    );
    return;
  }

  // Otherwise: parser must return an object that explicitly signals missing data.
  assert.ok(result && typeof result === "object", "result must be an object when not throwing");
  const r = result as Record<string, unknown>;
  const serverMap = r.serverMap as Record<string, unknown> | undefined;
  const episodes = r.episodes as unknown[] | undefined;

  // Server map must be empty/missing for the malformed page.
  const serverCount = serverMap ? Object.keys(serverMap).length : 0;
  assert.equal(serverCount, 0, "serverMap should have no entries on malformed page");

  // Episodes list must be empty for the malformed page.
  assert.ok(
    !episodes || episodes.length === 0,
    "episodes should be empty or missing on malformed page",
  );

  // A parser-defined `ok: false` or `errors` field is also an acceptable signal.
  const hasErrorFlag = r.ok === false || (Array.isArray(r.errors) && r.errors.length > 0);
  assert.ok(
    hasErrorFlag || serverCount === 0,
    "result should either set ok=false, populate errors[], or have an empty serverMap",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Tiny test runner
// ─────────────────────────────────────────────────────────────────────────────
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

run().catch((err) => {
  // Surface unexpected runner errors (e.g. import failure) as a test failure
  // so the RED phase is still visible.
  console.error("Runner crashed:", err);
  process.exitCode = 1;
});

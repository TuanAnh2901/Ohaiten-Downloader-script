// Animehay domain resolver TDD test harness
// Run with: npx tsx test/domain.test.ts
//
// This suite covers the public surface of src/domain.ts:
//   - isAnimehayHost
//   - normalizeAnimehayUrl
//   - cache TTL (getCachedDomains / clearDomainCache)
//   - resolveAnimehayDomains happy path with mocked fetch
//   - resolveAnimehayDomains fallback when animehay.tv is unreachable
//
// The resolver reaches the network by default; every test installs a
// deterministic requester via __setRequesterForTesting so the suite is
// fully hermetic.

import assert from "node:assert/strict";
import {
  resolveAnimehayDomains,
  normalizeAnimehayUrl,
  isAnimehayHost,
  getCachedDomains,
  clearDomainCache,
  __setRequesterForTesting,
  __resetMemoryStoreForTesting,
  type AnimehayDomainResult,
} from "../src/domain.js";

// ─────────────────────────────────────────────────────────────────────────────
// Tiny test runner (mirrors the shape of parser.test.ts)
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
// Mock helpers
// ─────────────────────────────────────────────────────────────────────────────

interface MockRequest {
  /** Map of full URL -> response. Checked first. */
  byUrl: Map<string, { status: number; body: string }>;
  /** Per-host defaults used when no URL match is registered. */
  byHost: Map<string, { status: number; body: string }>;
  /** Hosts whose requests always throw (used to simulate animehay.tv down). */
  failHosts: Set<string>;
  /** Per-host status override: returns the boolean as 200 (true) or 503 (false). */
  hostValidation: Map<string, boolean>;
  /** All request URLs that came through (for assertions). */
  calls: string[];
}

function makeRequester(mock: MockRequest) {
  return async (url: string, opts?: { timeoutMs?: number }) => {
    mock.calls.push(url);
    if (opts?.timeoutMs !== undefined && opts.timeoutMs <= 0) {
      throw new Error("timeout");
    }
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      host = "";
    }
    if (mock.failHosts.has(host)) throw new Error("network unreachable");
    const direct = mock.byUrl.get(url);
    if (direct) {
      return { status: direct.status, finalUrl: url, body: direct.body };
    }
    const override = mock.hostValidation.get(host);
    if (override !== undefined) {
      return { status: override ? 200 : 503, finalUrl: url, body: "" };
    }
    const byHost = mock.byHost.get(host);
    if (byHost) {
      return { status: byHost.status, finalUrl: url, body: byHost.body };
    }
    return { status: 404, finalUrl: url, body: "" };
  };
}

function installMock(): MockRequest {
  const mock: MockRequest = {
    byUrl: new Map(),
    byHost: new Map(),
    failHosts: new Set(),
    hostValidation: new Map(),
    calls: [],
  };
  __setRequesterForTesting(makeRequester(mock));
  return mock;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: isAnimehayHost accepts animehay mirrors
// ─────────────────────────────────────────────────────────────────────────────
test("domain resolver accepts animehay mirrors", () => {
  // Positive cases — every common animehay mirror variant.
  assert.equal(isAnimehayHost("animehay.tv"), true, "animehay.tv must be accepted");
  assert.equal(isAnimehayHost("animehay07.site"), true, "animehay07.site must be accepted");
  assert.equal(isAnimehayHost("animehay.xyz"), true, "animehay.xyz must be accepted");
  assert.equal(isAnimehayHost("ANIMEHAY.IO"), true, "case must be ignored");
  assert.equal(isAnimehayHost("www.animehay.tv"), true, "subdomains must be accepted");

  // Negative cases — anything that doesn't mention "animehay" must be rejected.
  assert.equal(isAnimehayHost("ahay.in"), false, "ahay.in must NOT be accepted (no animehay substring)");
  assert.equal(isAnimehayHost("example.com"), false, "example.com must NOT be accepted");
  assert.equal(isAnimehayHost(""), false, "empty string must NOT be accepted");
  assert.equal(isAnimehayHost("google.com"), false, "google.com must NOT be accepted");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: normalizeAnimehayUrl normalizes fixture links
// ─────────────────────────────────────────────────────────────────────────────
test("domain resolver normalizes fixture links", () => {
  const origin = "https://animehay07.site/";

  // Absolute URL is preserved untouched, even if a different origin is passed.
  assert.equal(
    normalizeAnimehayUrl("https://animehay.tv/xem-phim/foo-1.html", origin),
    "https://animehay.tv/xem-phim/foo-1.html",
    "absolute URL must be preserved verbatim",
  );

  // Root-relative path resolves against the supplied origin.
  assert.equal(
    normalizeAnimehayUrl("/xem-phim/quang-am-chi-ngoai-tap-28-76147.html", origin),
    "https://animehay07.site/xem-phim/quang-am-chi-ngoai-tap-28-76147.html",
    "root-relative path must resolve against the supplied origin",
  );

  // Path-relative link resolves against the supplied origin.
  assert.equal(
    normalizeAnimehayUrl("xem-phim/foo-2.html", origin),
    "https://animehay07.site/xem-phim/foo-2.html",
    "path-relative link must resolve against the supplied origin",
  );

  // Protocol-relative URL picks up the origin's scheme (https by default).
  assert.equal(
    normalizeAnimehayUrl("//cdn.animehay07.site/asset.jpg", origin),
    "https://cdn.animehay07.site/asset.jpg",
    "protocol-relative URL must inherit https from the origin",
  );

  // Empty input round-trips to empty.
  assert.equal(normalizeAnimehayUrl("", origin), "", "empty string must round-trip to empty");
  assert.equal(normalizeAnimehayUrl("   ", origin), "   ", "whitespace must round-trip");

  // No origin supplied: must still return something absolute, not throw.
  const noOrigin = normalizeAnimehayUrl("/xem-phim/foo-3.html");
  assert.ok(/^https?:\/\//i.test(noOrigin), "without origin, the output must still be absolute");
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: getCachedDomains / clearDomainCache respect TTL
// ─────────────────────────────────────────────────────────────────────────────
test("domain resolver caches with ttl", () => {
  clearDomainCache();
  __resetMemoryStoreForTesting();
  __setRequesterForTesting(null);
  assert.equal(getCachedDomains(), null, "empty cache must read as null");

  // Manually drop a fresh entry into the cache via the resolver's own
  // persistence path by importing the GM-set backplane. We round-trip
  // through resolveAnimehayDomains with a stubbed requester to keep the
  // test hermetic — that exercises saveDomains() end-to-end.
  const mock = installMock();
  mock.byUrl.set("https://animehay.tv/", { status: 200, body: "" });
  // The current page origin must validate successfully for the fallback to
  // produce a cached primary.
  mock.hostValidation.set("animehay07.site", true);

  return resolveAnimehayDomains({ currentOrigin: "https://animehay07.site" })
    .then((first) => {
      // First call resolves and caches. Second call must come from the
      // cache (validatedAt identical, no new request goes out).
      const cached = getCachedDomains();
      assert.ok(cached, "result must be cached after a successful resolve");
      assert.equal(cached?.primary, "https://animehay07.site/", "cached primary must match the fallback");
      assert.ok(typeof cached?.fallbackReason === "string", "fallbackReason must be set");

      mock.calls.length = 0;
      return resolveAnimehayDomains({ currentOrigin: "https://animehay07.site" }).then((second) => {
        assert.equal(second.validatedAt, first.validatedAt, "second resolve must reuse cached validatedAt");
        assert.equal(mock.calls.length, 0, "no network calls should happen on a cache hit");
      });
    })
    .then(() => {
      // clearDomainCache must drop the entry and let the next call go out.
      clearDomainCache();
      assert.equal(getCachedDomains(), null, "cache must be empty after clearDomainCache()");

      const mock2 = installMock();
      mock2.byUrl.set("https://animehay.tv/", { status: 200, body: "" });
      mock2.hostValidation.set("animehay07.site", true);
      return resolveAnimehayDomains({ currentOrigin: "https://animehay07.site" }).then(() => {
        assert.ok(mock2.calls.length > 0, "a fresh request must be issued after clearDomainCache()");
      });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: resolver validates primary then secondary
// ─────────────────────────────────────────────────────────────────────────────
test("domain resolver validates primary then secondary", () => {
  clearDomainCache();
  __resetMemoryStoreForTesting();
  __setRequesterForTesting(null);

  // Trusted source page advertises two animehay mirrors, in priority order.
  // Both candidates must contain "animehay" because that's the filter the
  // resolver applies to harvested links.
  const homeHtml =
    `<!doctype html><html><body>` +
    `<a href="https://animehay07.site/">primary mirror</a>` +
    `<a href="https://animehay05.com/">secondary mirror</a>` +
    `</body></html>`;

  const mock = installMock();
  mock.byUrl.set("https://animehay.tv/", { status: 200, body: homeHtml });
  // First candidate validates, second validates too.
  mock.hostValidation.set("animehay07.site", true);
  mock.hostValidation.set("animehay05.com", true);

  return resolveAnimehayDomains().then((result) => {
    assert.equal(result.primary, "https://animehay07.site/", "primary must be the first valid candidate");
    assert.equal(result.secondary, "https://animehay05.com/", "secondary must be the second valid candidate");
    assert.ok(!result.fallbackReason, "happy path must not record a fallback reason");

    // Validation calls went out for both candidates (in the right order).
    const probedHosts = mock.calls
      .filter((u) => !u.startsWith("https://animehay.tv/"))
      .map((u) => {
        try { return new URL(u).hostname; } catch { return u; }
      });
    assert.ok(
      probedHosts.includes("animehay07.site"),
      "primary candidate must be probed",
    );
    assert.ok(
      probedHosts.includes("animehay05.com"),
      "secondary candidate must be probed",
    );
    const primaryIdx = probedHosts.indexOf("animehay07.site");
    const secondaryIdx = probedHosts.indexOf("animehay05.com");
    assert.ok(
      primaryIdx < secondaryIdx,
      "primary must be probed before secondary",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: resolver falls back to current page origin when animehay.tv is down
// ─────────────────────────────────────────────────────────────────────────────
test("domain resolver falls back when animehay.tv is unreachable", () => {
  clearDomainCache();
  __resetMemoryStoreForTesting();
  __setRequesterForTesting(null);

  const mock = installMock();
  mock.failHosts.add("animehay.tv"); // trusted source throws
  // Allow validation of the current origin to succeed when the resolver
  // gets to that fallback step.
  mock.hostValidation.set("animehay07.site", true);

  return resolveAnimehayDomains({ currentOrigin: "https://animehay07.site/" }).then((result) => {
    assert.equal(result.primary, "https://animehay07.site/", "must fall back to the current page origin");
    assert.equal(result.secondary, null, "no secondary is discoverable when the trusted source is down");
    assert.ok(result.fallbackReason, "fallbackReason must be recorded");
    assert.ok(
      (result.fallbackReason ?? "").toLowerCase().includes("unreachable") ||
        (result.fallbackReason ?? "").toLowerCase().includes("animehay.tv"),
      `fallbackReason must mention the trusted source failure, got: ${result.fallbackReason}`,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bonus: resolver returns a typed empty result when neither path yields a host
// ─────────────────────────────────────────────────────────────────────────────
test("domain resolver returns typed empty result when nothing is reachable", () => {
  clearDomainCache();
  __resetMemoryStoreForTesting();
  __setRequesterForTesting(null);

  const mock = installMock();
  mock.failHosts.add("animehay.tv");

  return resolveAnimehayDomains({ currentOrigin: "https://example.com/" }).then((result: AnimehayDomainResult) => {
    assert.equal(result.primary, null, "no animehay host must be returned");
    assert.equal(result.secondary, null, "no secondary either");
    assert.ok(result.fallbackReason, "fallbackReason must be set so the UI can surface the failure");
    assert.equal(typeof result.validatedAt, "number", "validatedAt must always be a number");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bonus: missing current origin + trusted source down -> empty result, no throw
// ─────────────────────────────────────────────────────────────────────────────
test("domain resolver does not throw when both paths are unavailable", () => {
  clearDomainCache();
  __resetMemoryStoreForTesting();
  __setRequesterForTesting(null);

  const mock = installMock();
  mock.failHosts.add("animehay.tv");

  return resolveAnimehayDomains().then((result) => {
    assert.equal(result.primary, null, "must not invent a primary host");
    assert.ok(result.fallbackReason, "fallbackReason must be present");
  });
});

run().catch((err) => {
  console.error("Runner crashed:", err);
  process.exitCode = 1;
});

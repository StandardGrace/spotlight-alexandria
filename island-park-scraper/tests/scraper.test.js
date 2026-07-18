import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { parseIslandParkStatus, parseEohuTimestamp } from "../src/scraper.js";

const FIXTURE_PATH = new URL(
  "./fixtures/eohu-sample.html",
  import.meta.url
);

test("parses Island Park status from a saved copy of the real page", () => {
  if (!existsSync(FIXTURE_PATH)) {
    console.warn(
      "No fixture found at tests/fixtures/eohu-sample.html - save a real " +
        "copy of https://eohu.ca/en/my-environment/public-beach-water-advisories " +
        "there (page source or curl output) to run this test properly."
    );
    return;
  }

  const html = readFileSync(FIXTURE_PATH, "utf-8");
  const result = parseIslandParkStatus(html);

  assert.notEqual(result, null, "should find Island Park in the fixture");
  assert.ok(
    ["safe", "unsafe", "closed", "not_monitored", "unknown"].includes(
      result.status
    ),
    `status "${result.status}" should be one of the known values`
  );
});

test("returns null when the beach name is entirely absent", () => {
  const html = "<html><body><p>Nothing relevant here.</p></body></html>";
  const result = parseIslandParkStatus(html);
  assert.equal(result, null);
});

test("parses an EOHU timestamp during EDT (summer, UTC-4)", () => {
  const iso = parseEohuTimestamp("2026-07-15 12:22 p.m.");
  assert.equal(iso, "2026-07-15T16:22:00.000Z");
});

test("parses an EOHU timestamp during EST (winter, UTC-5)", () => {
  const iso = parseEohuTimestamp("2026-01-15 9:05 a.m.");
  assert.equal(iso, "2026-01-15T14:05:00.000Z");
});

test("returns null for unparseable timestamp text", () => {
  assert.equal(parseEohuTimestamp("not a date"), null);
  assert.equal(parseEohuTimestamp(null), null);
});

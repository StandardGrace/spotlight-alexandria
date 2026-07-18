import * as cheerio from "cheerio";
import { DateTime } from "luxon";

// EOHU serves Eastern Ontario - their posted times are local Eastern time.
const EOHU_TIME_ZONE = "America/Toronto";

const EOHU_URL =
  process.env.EOHU_URL ||
  "https://eohu.ca/en/my-environment/public-beach-water-advisories";

const BEACH_NAME = "Island Park";

// Status keywords as used on the EOHU page, ordered so the more specific /
// more severe statuses are checked before "Safe for Swimming" - this avoids
// accidentally matching the legend text instead of the real beach status.
const STATUS_PATTERNS = [
  { key: "unsafe", pattern: /unsafe for swimming/i },
  { key: "closed", pattern: /\bclosed\b/i },
  { key: "not_monitored", pattern: /not monitored/i },
  { key: "safe", pattern: /safe for swimming/i },
];

/**
 * Finds the smallest (fewest-children) element in the document whose text
 * contains `needle`. On a table row or list-item based layout this tends to
 * land on the specific cell/row for that beach rather than a big wrapper div.
 */
function findLeafContaining($, needle) {
  let best = null;
  let bestChildCount = Infinity;

  $("*").each((_, el) => {
    const $el = $(el);
    const text = $el.text();
    if (text.includes(needle)) {
      const childCount = $el.children().length;
      if (childCount < bestChildCount) {
        best = $el;
        bestChildCount = childCount;
      }
    }
  });

  return best;
}

/**
 * Walks up from a leaf element to the nearest ancestor that looks like a
 * "row" (table row, list item, or a div/section that plausibly wraps one
 * beach's full entry) so we capture the status text sitting next to the
 * beach name, not just the name itself.
 */
function findRowAncestor($el) {
  const rowTags = new Set(["tr", "li"]);
  let current = $el;

  for (let i = 0; i < 5 && current && current.length; i++) {
    const tag = current.prop("tagName");
    if (tag && rowTags.has(tag.toLowerCase())) {
      return current;
    }
    current = current.parent();
  }

  // Fell through without finding a classic row tag - just use a few levels
  // up from the leaf, which is usually enough to include sibling status text.
  return $el.parent().parent();
}

/**
 * Converts EOHU's raw "Last Update" text (e.g. "2026-07-15 12:22 p.m.") into
 * a proper UTC ISO timestamp, treating the source time as America/Toronto
 * local time (handles EST/EDT automatically via luxon).
 *
 * Returns null if the text doesn't match the expected format rather than
 * throwing - a display fallback (the raw string) is always available.
 */
export function parseEohuTimestamp(raw) {
  if (!raw) return null;

  const match = raw.match(
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*([ap])\.?m\.?/i
  );
  if (!match) return null;

  const [, year, month, day, hourStr, minute, meridiem] = match;
  let hour = parseInt(hourStr, 10);
  const isPM = meridiem.toLowerCase() === "p";
  if (isPM && hour !== 12) hour += 12;
  if (!isPM && hour === 12) hour = 0;

  const dt = DateTime.fromObject(
    {
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour,
      minute: Number(minute),
    },
    { zone: EOHU_TIME_ZONE }
  );

  return dt.isValid ? dt.toUTC().toISO() : null;
}

/**
 * Pure function: given the EOHU page HTML, extract the current status for
 * Island Park. Returns null if the beach name can't be found at all (page
 * structure changed, or the beach was renamed/removed from the list).
 *
 * IMPORTANT: this was written without being able to inspect the live page's
 * actual table/list markup directly (only the surrounding boilerplate text
 * was visible while building this). Save a real copy of the page HTML to
 * tests/fixtures/eohu-sample.html and run the test suite to confirm this
 * still matches - see tests/scraper.test.js.
 */
export function parseIslandParkStatus(html) {
  const $ = cheerio.load(html);

  const leaf = findLeafContaining($, BEACH_NAME);
  if (!leaf) {
    return null;
  }

  const row = findRowAncestor(leaf);
  const rowText = row.text().replace(/\s+/g, " ").trim();

  let status = "unknown";
  for (const { key, pattern } of STATUS_PATTERNS) {
    if (pattern.test(rowText)) {
      status = key;
      break;
    }
  }

  // "Last Update" timestamp shown near the top of the page, e.g.
  // "Last Update 2026-06-26 1:26 p.m."
  const bodyText = $("body").text();
  const updateMatch = bodyText.match(
    /Last Update\s+([\d-]+\s+[\d:]+\s*[ap]\.?m\.?)/i
  );

  const sourceLastUpdate = updateMatch ? updateMatch[1] : null;

  return {
    beach: BEACH_NAME,
    status,
    rawRowText: rowText,
    sourceLastUpdate,
    sourceLastUpdatedAt: parseEohuTimestamp(sourceLastUpdate),
  };
}

export async function fetchIslandParkStatus() {
  const res = await fetch(EOHU_URL, {
    headers: {
      "User-Agent":
        "SpotlightAlexandriaBot/1.0 (+https://spotlightalexandria.ca; contact via site)",
    },
  });

  if (!res.ok) {
    throw new Error(`EOHU page returned HTTP ${res.status}`);
  }

  const html = await res.text();
  const parsed = parseIslandParkStatus(html);

  if (!parsed) {
    throw new Error(
      `Could not locate "${BEACH_NAME}" in the EOHU page - markup may have changed`
    );
  }

  return {
    ...parsed,
    sourceUrl: EOHU_URL,
    checkedAt: new Date().toISOString(),
  };
}

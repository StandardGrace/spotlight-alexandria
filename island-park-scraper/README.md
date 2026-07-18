# island-park-scraper

Standalone Node service that checks the EOHU public beach water advisory
page for Island Park (Alexandria) on a schedule and serves the latest
status as small JSON API. Built to run decoupled from the main
SpotlightAlexandria site/API, per the original plan.

## Before you trust this in production

I built the parser (`src/scraper.js`) without being able to see the real
table/list markup around "Island Park" on the live EOHU page - only the
surrounding boilerplate text was visible while writing this. The parser
uses a generic "find the smallest element containing this text, then walk
up to its row" strategy rather than a hardcoded CSS selector, so it should
be reasonably resilient, but it needs to be checked against the real page
before you rely on it.

To verify:

1. Save a real copy of the page:
   `curl -A "Mozilla/5.0" https://eohu.ca/en/my-environment/public-beach-water-advisories -o tests/fixtures/eohu-sample.html`
   (or open the page, view source, and paste it in)
2. Run `npm test` - it'll parse the fixture and tell you what status it
   found. Check that against what the page actually shows for Island Park.
3. If it's wrong, the fix is almost always in `findRowAncestor()` or the
   `STATUS_PATTERNS` list in `src/scraper.js` - not a full rewrite.

Since you're QA background, this is the exact kind of thing worth building
a small fixture library for over time (safe / unsafe / closed / not
monitored / off-season variants), so regressions get caught if EOHU
changes their page layout.

## Endpoints

- `GET /api/island-park` - latest status:
  ```json
  {
    "beach": "Island Park",
    "status": "safe",
    "rawRowText": "...",
    "sourceLastUpdate": "2026-06-26 1:26 p.m.",
    "sourceLastUpdatedAt": "2026-06-26T17:26:00.000Z",
    "sourceUrl": "https://eohu.ca/...",
    "checkedAt": "2026-07-16T14:00:00.000Z",
    "stale": false
  }
  ```
  Note there's no disclaimer or other display text in this response on
  purpose - the site is bilingual (EN/FR), so any user-facing prose is
  owned by the frontend's translation files, not baked into the API in
  one fixed language.

  `sourceLastUpdate` is the raw text as EOHU posted it (good for display).
  `sourceLastUpdatedAt` is the same moment as a real UTC ISO timestamp
  (good for date math - "how stale is this", formatting as "3 hours ago",
  sorting, etc.). It's parsed assuming EOHU's times are America/Toronto
  local time, DST-aware. If EOHU ever changes their date format and it
  fails to parse, this comes back `null` while `sourceLastUpdate` still
  shows the raw text as a fallback.
  `stale: true` means the last scheduled scrape failed and this is the
  last known-good result, not a fresh check.
- `GET /health` - for Uptime Kuma or similar: reports whether any data
  exists yet and the last error, if any.

## Running locally

```bash
cp .env.example .env
npm install
npm start
```

## Running in Docker

```bash
cp .env.example .env
docker compose up -d --build
```

The cache lives in `./data/cache.json`, bind-mounted from outside the
container. That's the only stateful piece of this service - moving it to
another box later is just copying this whole folder (including `data/`)
and running `docker compose up -d --build` there. No manual dependency
setup needed on the new box beyond having Docker installed.

## Config (.env)

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3001` | |
| `CRON_SCHEDULE` | `0 */6 * * *` | Standard cron syntax. Advisories can be posted off the weekly sampling day, so checking a few times a day is reasonable. |
| `ALLOWED_ORIGIN` | `*` | Set to `https://spotlightalexandria.ca` once that's live. |
| `CACHE_FILE` | `./data/cache.json` | |
| `EOHU_URL` | EOHU beach advisory page | |

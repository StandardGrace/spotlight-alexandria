# Restaurant Menu Data Model & Ingestion — Progress Log

Tracks the "Restaurant Menu Data Model & Ingestion" Trello card (list: In Progress). Last updated 2026-08-18.

## Status: 2/5 checklist items done, verified working on Pat's machine

1. [x] One Markdown file per restaurant, YAML frontmatter — done (prior session)
2. [x] Script parses files into SQLite on update — done and verified this session
3. [ ] `lastVerified` staleness notice — **tone/approach decided this session, not yet built** (see below)
4. [ ] Storefront vs. menu-item photo as separate fields — structurally satisfied by the schema already (separate DB columns), no photo-serving route yet
5. [ ] Grid landing view → detail page per restaurant — not started; blocked on an API route to read the SQLite data, which doesn't exist yet

## What was built (main-site-api)

- `src/restaurants/parseRestaurant.js` — validates one restaurant `.md` file against `docs/RESTAU~1.MD`'s rules: required fields present, `lastVerified` is a real `YYYY-MM-DD` date (handles gray-matter auto-parsing it into a JS `Date`), and each menu item has exactly one of `price`/`variants` (never both, never neither).
- `src/restaurants/db.js` — normalized SQLite schema: `restaurants` → `menu_categories` → `menu_items` → `item_variants`, FK cascade so re-ingest cleanly replaces a restaurant's whole menu.
- `src/restaurants/ingest.js` — full transactional rebuild of the SQLite tables from `RESTAURANT_CONTENT_DIR` on every run. A file that fails validation is skipped and reported, not fatal. Also catches duplicate slugs (two files that would collide on the same primary key).
- `src/scripts/ingestRestaurants.js` — CLI entry point, `npm run ingest:restaurants`. Exits 1 if anything failed validation; the good restaurants still get written either way.
- Frontmatter parsing: `@11ty/gray-matter` (the maintained fork — `gray-matter` itself hasn't shipped since 2019, per the step-1 doc's open question).
- **Database driver: Node's built-in `node:sqlite` (`DatabaseSync`), not `better-sqlite3`.** Switched mid-session after `better-sqlite3` failed to install on Pat's Windows machine — no prebuilt binary yet for Node 24/N-API 137 ([WiseLibs/better-sqlite3#1384](https://github.com/WiseLibs/better-sqlite3/issues/1384), still open), and node-gyp fallback needed Visual Studio components he didn't have. `node:sqlite` needs no native compilation at all. Requires Node ≥22.13.0 (flag-free); `package.json` engines bumped from `>=18` to `>=22.13.0` accordingly. Two API differences from better-sqlite3 to remember if touching this code: no `.pragma()` convenience method (use `.exec("PRAGMA ...")`), and no `.transaction()` helper (manual `BEGIN`/`COMMIT`/`ROLLBACK` with try/catch instead).
- Delivered to Pat as a zip (drop-in at the repo root) since this session has no GitHub write access — **not yet committed to the actual repo**, that's on Pat.

## Content directory: lives outside the repo entirely

`RESTAURANT_CONTENT_DIR` (env var, in `main-site-api/.env`, gitignored) points at `spotlight-data/restaurant-data`, a sibling folder next to the `spotlight-alexandria` repo checkout on Pat's disk — not a subfolder of the repo, not gitignored-but-nested.

Reasoning: a `.gitignore` entry only stops `git add`. It doesn't stop a Dockerfile's `COPY . .` (the repo already has one, in `island-park-scraper`, and `main-site-api` will likely get one too), a zip export of "the project folder," or a filesystem-level backup/sync tool — none of those respect `.gitignore`. Living outside the repo root sidesteps that whole class of risk, which matters because the goal is avoiding inadvertent redistribution of restaurant-provided menu-item photos beyond what's licensed for on-site display (storefront photos are self-shot, no concern there). Costs nothing extra since `RESTAURANT_CONTENT_DIR` was already designed as an env-configurable path so the parser/API code never needs to change when this moves to its "forever home" on the homelab server.

Verified end-to-end: `joes-pizza.md` ingested successfully from `G:\dev-main\spotlight-data\restaurant-data` on Pat's machine.

## Decision: staleness notice is visitor-framed, not a shame-banner

Pat was on the fence about the ticket's original "call ahead to confirm" warning-banner treatment past 6 months — worried it reads as publicly flagging his own upkeep lapses, especially since restaurant buy-in to help keep data current is uncertain (he may end up doing all the maintenance himself).

**Resolved:** keep the mechanism — a contextual per-restaurant notice once `lastVerified` is >6 months old, using the field already stored in SQLite — but soften the copy. Visitor-framed and understated, e.g. *"Details last confirmed [date] — worth a quick call for anything time-sensitive"*, not an alert-styled "this may be out of date" banner. Reasoning: a contextual notice actually protects site visitors (and by extension Pat and the restaurants) far better than a blanket footer disclaimer would — footer disclaimers are reliably skipped, a note right next to the specific stale info isn't. The tone was the actual problem, not whether the mechanism should exist. A general "info is unofficial, subject to change" footer line can still be added on top of this if wanted — not mutually exclusive, just not a substitute.

**Suggested addition to `docs/TECHNICAL_DESIGN.md`'s decision log**, matching its existing style (Pat hasn't pasted this in yet):

> **`lastVerified` staleness notice is visitor-framed, not alarm-styled.** Past 6 months, the UI shows understated text like "Details last confirmed [date] — worth a quick call for anything time-sensitive" rather than a warning banner. A blanket "info unofficial, subject to change" disclaimer can still be kept separately (e.g. site footer) but isn't a substitute — contextual per-restaurant notices actually get read; footer disclaimers usually don't.

Not yet implemented — no frontend restaurant pages or `main-site-api` routes exist yet to read the SQLite data. This is a spec decision for whenever that page gets built.

## Next likely step

No route in `main-site-api` reads from the restaurants SQLite DB yet — needed before any frontend page (checklist item 5) can exist. Was about to ask Pat whether to build `GET /api/restaurants` + `GET /api/restaurants/:id` next, or add a couple more real restaurant `.md` files first to stress-test the format/ingestion with more than one data point.
# Spotlight Alexandria — Technical Design Document

Full architecture, decision log, and roadmap. For a plain-language overview, see [README.md](README.md).

## Architecture

Monorepo containing three runtime-decoupled services:

- **frontend** — React + Vite
- **main-site-api** — Express backend; proxies weather and scraper data, will eventually serve restaurant data
- **island-park-scraper** — standalone Node/Express service that scrapes the EOHU public beach water advisory page on a schedule and serves the latest result as a small JSON API (`GET /api/island-park`, `GET /health`)

### Why a monorepo instead of three separate repos

The services stay just as decoupled at runtime as if they were in separate repos — this is about where the *code* lives, not how it *runs*. One repo gives a single place for a recruiter (or future-me) to see the whole architecture at a glance, which matters more for a solo/portfolio project than the independent-CI benefits of separate repos would.

## Decision log

### island-park-scraper

- **Scheduled background scrape + cache, not on-demand per page load.** Avoids page load time depending on EOHU's response time, avoids the site breaking if EOHU is briefly down, and avoids hammering a public health unit's site with one scrape per visitor. Default schedule: every 6 hours (`CRON_SCHEDULE` env var).
- **Stale-cache-on-failure.** A failed scheduled scrape never overwrites the cache — it keeps serving the last known-good status with a `stale: true` flag, rather than erroring out.
- **Parser is a pure, separately testable function** (`parseIslandParkStatus`), decoupled from the network fetch — written this way specifically so it could be tested against a saved HTML fixture without hitting the live site on every test run.
- **A manual "force refresh" was explicitly deferred.** Restarting the server already does this — `runScrape()` fires once immediately on startup, before the cron schedule kicks in.
- **Data persistence** lives in a project-relative `./data` folder, bind-mounted in Docker. Deliberate: keeps the project fully portable to another box (or a business/personal split) later — moving it is just copying the folder.

### main-site-api

- **Weather provider: WeatherAPI.com** (`forecast.json`). Free tier caps forecasts at **3 days** regardless of the `days` parameter requested — confirmed via search, not assumed. `days=3` is set explicitly in `weather.js` with a comment noting this; bump it if the account is ever upgraded to a paid plan with a longer forecast.
- **Free tier call budget is generous** (1M calls/month) — a 30-minute polling schedule works out to ~1,440 calls/month, nowhere near the limit. No need to stretch the schedule to save quota.
- **Own transform layer**, not a raw passthrough of WeatherAPI's response. Decouples the frontend from WeatherAPI's exact field names, in case the provider ever changes.
- **Bilingual weather fetch.** For French support, the backend fetches WeatherAPI in **both** `en` and `fr` in parallel (`Promise.all`) each refresh cycle and caches one response with `condition: { en, fr }`. This means switching language on the frontend is instant — no re-fetch needed, since both languages are already in the cached response.
- **Day-of-week labels are deliberately NOT computed server-side.** The cache is shared across every visitor regardless of language, so baking in one language's weekday names would make it impossible to serve the other correctly. The frontend derives weekday labels from the raw `date` field using whichever language is currently active.

### frontend

React + Vite (matches existing MERN coursework). Deliberately plain styling until a visual direction was actually decided.

- **Internationalization: `react-i18next` + `react-router-dom`**, not a custom lightweight system. Chosen over a hand-rolled dictionary because it's more recognizable on a portfolio and scales better if the site grows into longer-form content (news articles) later, where things like proper pluralization handling start to matter more.
- **`/en` and `/fr` path-based routing**, defaulting to English at `/`. Matches the convention used by Canadian bilingual civic/government sites.
- **Pluralization uses i18next's real `_one`/`_other` key convention** (e.g. `minutesAgo_one` / `minutesAgo_other`), verified against Node's actual `Intl` output for both languages before being trusted.
- **`<html lang>` updates on language change** — matters for screen readers and SEO, not just the visible text.
- **Each card fetches its own data independently** (`useEffect`/`useState` per component) rather than through shared state — no state management library, matching a preference for minimal, easy-to-read code over more heavily engineered solutions.
- **Accessibility pass for the town's demographics.** Average resident age in Alexandria is elderly, which directly shaped two decisions:
  - Root font size set to **150%** (not a fixed pixel value) — chosen specifically because nearly all typography in the stylesheet uses `rem` units, so this single change scales the whole UI proportionally. Using `%` rather than a hardcoded px value also means it compounds with a user's own browser font-size setting rather than overriding it.
  - Icon sizes were converted from hardcoded HTML `width`/`height` attributes to `rem`-based CSS classes, so they scale along with everything else instead of staying fixed while text grows around them.
  - Secondary/muted text grays were darkened and consolidated from three barely-distinguishable shades into two clearer tiers, for contrast — reduced contrast sensitivity is a normal part of aging vision, separate from just needing larger text.

### Layout & scope strategy

The site's eventual scope is intentionally left open-ended (restaurant menus, local news, traffic/road closures, business listings, and other vague future ideas). Rather than trying to plan a fixed sitemap up front, the approach is a container pattern that new ideas slot into as they arrive:

- **"Glance" content** (swim status, weather, and later news headlines, traffic alerts) → becomes another card in the landing page's grid. The grid doesn't care how many cards exist.
- **"Browse" content** (restaurant menus, business listings) → gets its own page, linked from a simple nav bar.
- **Navigation infrastructure is added only once it's needed** — i.e. only once a second page actually exists — rather than pre-built for a hypothetical future sitemap.

### Content / template separation

The site's real value is the local content — restaurant listings, menus, and eventually photos supplied or licensed from local businesses — while most of the surrounding code (layout, i18n scaffolding, the card-grid pattern, the weather/scraper proxy pattern) is generic and not specific to any one town.

- **Content and template are being kept separate on purpose.** Local content and any licensed photo assets live outside the codebase entirely, both to handle licensed material appropriately and to keep the template reusable if this project is ever adapted for another town down the line.
- **Content is loaded through a config/data layer** rather than hardcoded into the application, so the shared template doesn't carry any town-specific data.
- **Photo assets are stored and managed separately from the repo.** Some images are used with permission from local business owners rather than owned outright, so they're treated as licensed assets rather than files committed to a public repository.

### Restaurant menu content model

- **Markdown files with YAML frontmatter, not a CRUD UI.** As site owner, menus are authored as files rather than through an admin interface — updates stay fast without building admin auth that isn't needed at this scale. One Markdown file per restaurant; fixed fields (phone, address, hours) live in YAML frontmatter, and the menu itself is structured YAML (categories → items → variants).
- **Content directory path is a runtime config value (e.g. `RESTAURANT_CONTENT_DIR`), not hardcoded.** Where the actual restaurant files and licensed photos live on disk depends on how the homelab server ends up laid out, which isn't decided yet — that's pending the Cloudflare Tunnel work. Reading the path from an env var (matching the existing `WEATHER_LOCATION`/`CRON_SCHEDULE` pattern, via `dotenv`) means the parser and API code don't need to change once the server layout is finalized — only the `.env` value does. `.env` is already gitignored, so no server-specific path is ever committed.
- **A parser script loads the files into SQLite on update**, rather than reading Markdown/YAML directly at request time.
- **`lastVerified` date field, with staleness surfaced in the UI.** If a restaurant's info hasn't been reverified in over 6 months, the UI shows a "call ahead to confirm" notice rather than presenting stale information as current.
- **Storefront photo and menu-item photo are handled as separate fields.** The storefront photo is self-shot and always present; menu-item photos are optional and only included when restaurant-provided — kept distinct so licensing/provenance isn't conflated between the two.
- **Grid landing view → detail page per restaurant.** Multi-variant menu items (e.g., different sizes) get an inline size/price selector on the detail page rather than being listed as separate line items.

#### Presentation layer

- **Restaurants list page shows a light grid of cards** (storefront photo, name, phone) — no menu content here, just enough to identify and pick a restaurant. Each card links to that restaurant's own page/URL, so a restaurant's menu is shareable independent of the site's homepage.
- **Category accordion lives on the detail page, not the list page.** Considered putting all restaurants on one page as expandable bars instead, but rejected it: nesting category accordions inside restaurant accordions stacks two levels of disclosure on one page, which exceeds the ~2-level depth UX research (NN/g) flags as where expand/collapse navigation starts to frustrate users and break down on mobile. It also gets long and scroll-heavy as more restaurants are added, and there'd be no per-restaurant URL to link to.
- **Multi-variant items use an inline selector, not a third accordion level.** Keeps disclosure depth at two (restaurant page → category), consistent with the same UX guidance above.
- **Accordions built with native `<details>`/`<summary>`, not custom JS state.** Free keyboard and screen-reader accessibility, and matches the frontend's existing preference for minimal, easy-to-read code with no state management library.

## Roadmap

### Next up

1. **Restaurant Menu Data Model & Ingestion** — data model and ingestion pipeline for restaurant listings and menus (see "Restaurant menu content model" above for the full design), the last piece of the "first iteration" scope named in the README.
2. **Public Exposure via Cloudflare Tunnel** — get the site live on the public internet, hosted from the homelab through Cloudflare, per the deployment plan above.
3. **Analytics Stack** — instrument the site to understand visitor traffic and usage once it's publicly exposed. Open decisions to make: self-hosted (e.g., Plausible, Umami) vs. third-party (e.g., Google Analytics) — a self-hosted, privacy-respecting option would be consistent with the homelab-first approach used elsewhere in this project, but that's not yet finalized. Worth sequencing after Cloudflare exposure, since there's little to measure before the site has real public traffic.
4. **Browser Language Auto-Detection + Language Switcher** — the `/en`/`/fr` routing and i18n groundwork already exist (see frontend decision log above); this adds automatic detection of the visitor's browser language and a manual switcher UI on top of it.

### Future iterations (not yet ticketed)

- Other local business listings
- Advertisements
- A local news section
- Other functionality, to be defined

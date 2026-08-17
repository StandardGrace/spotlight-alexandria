# Restaurant file format (step 1 of Restaurant Menu Data Model & Ingestion)

Draft for review — nothing here has touched your repo. This defines the shape of one restaurant's `.md` file: what a human types by hand, and what the step-2 parser will read.

## Why this shape

Per the ticket, menus are authored as files instead of through a CRUD admin UI. YAML frontmatter (the block between the `---` fences at the top of a Markdown file) is a well-established pattern for exactly this — pairing structured, machine-readable data with a Markdown file — used by tools like Jekyll, Hugo, Astro, and VitePress. I verified in a sandbox that a single frontmatter block can hold the full nested menu structure (categories → items → variants) as arrays of objects, and that it parses cleanly with `gray-matter`, a standard Node library for splitting frontmatter from Markdown content.

Per your answers: the Markdown body below the frontmatter is left unused for now (all data lives in frontmatter — can add a free-text blurb field later without changing the format), `hours` is a simple display string rather than structured per-day times, and menu item options use the generic field name `label` rather than `size`.

## Fields

**Top level (frontmatter):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Restaurant's display name |
| `phone` | string | yes | Shown as a `tel:` link on the detail page |
| `address` | string | yes | |
| `website` | string | no | Not every restaurant has one |
| `hours` | string | yes | Free text, e.g. `"Mon-Sat 11am-9pm, Sun closed"` — displayed as-is |
| `lastVerified` | date (`YYYY-MM-DD`) | yes | Drives the "call ahead to confirm" notice if older than 6 months. Parses automatically into a real date object — no manual date parsing needed downstream. |
| `storefrontPhoto` | string (path) | yes | Self-shot, always present per the existing decision log |
| `menu` | array of categories | yes | See below |

**Menu category** (each entry in `menu`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `category` | string | yes | e.g. `"Pizza"`, `"Salads"` — becomes an accordion heading on the detail page |
| `items` | array of items | yes | |

**Menu item** (each entry in a category's `items`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | |
| `description` | string | no | |
| `photo` | string (path) | no | Restaurant-provided only, kept as a separate field from `storefrontPhoto` per the existing decision log |
| `price` | number | one of `price` or `variants` | Use this when the item has one fixed price |
| `variants` | array of `{ label, price }` | one of `price` or `variants` | Use this when the item comes in multiple options (sizes, spice levels, etc.) — becomes the inline selector on the detail page |

One thing I decided rather than asked, flagging it so you can override it: an item should have *either* `price` *or* `variants`, never both, and never neither. This isn't from the ticket directly — I inferred it from "multi-variant items get an inline selector," which implies items that aren't multi-variant just show a plain price with no selector at all. The step-2 parser script is where this would get validated (e.g., refuse to write to SQLite if an item has both or neither).

## Open item for step 2

`gray-matter` (the parsing library used in the sandbox test) hasn't shipped a release since 2019, though it's still ubiquitous and there's an actively maintained fork, `@11ty/gray-matter`, from the same author. That's a decision for the parser script, not the file format — I'll bring it up when we get there.

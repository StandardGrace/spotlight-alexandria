# Restaurant file format (v2 — category notes, bilingual content, about blurb)

Draft for review — nothing here has touched your repo or the parser. This supersedes the v1 draft (originally `docs/RESTAU~1.MD`, correctly named `docs/restaurant-data-model.md` on your end) with three changes decided after test-transcribing The North Glengarry's real menu against the v1 format — see `restaurant-format-gap-analysis.md` for the full breakdown of what did and didn't hold up. This doc is meant to be a complete, self-contained description of the format going forward, not a diff — everything from v1 that didn't change is repeated here so this file alone is the reference.

## What's changing, and what isn't

Three additions:

1. **Category-level notes.** Real menus have text that applies to a whole category, not one item — "served with fries and coleslaw," "add chicken +$6," gluten-free surcharges. Seven of The North Glengarry's ten categories needed this. New optional `note` field on each category.
2. **Bilingual content.** Full English/French support is a stated goal of the site, and the v1 format had no way to express it at all — every field was a single untranslated string. Every field that holds human-readable prose now takes an `{ en, fr }` shape instead of a plain string. `fr` is optional per field and falls back to `en` when absent, so a restaurant can go live in English immediately and pick up French incrementally, field by field, without blocking on a full translation pass. This isn't a new idiom for the codebase — `main-site-api/src/services/weather.js` already does the same thing: `forecastDaysFr[i]?.day.condition.text || d.day.condition.text` falls back to English when French isn't available.
3. **Free-text "about" blurb.** The v1 doc already reserved space for this ("the Markdown body below the frontmatter is left unused for now... can add a free-text blurb field later without changing the format") — this is that. New optional `about` field, for restaurant history/ambiance/whatever's worth saying, the kind of content The North Glengarry's own site has (the 1819 grist mill building, the patio).

Two things explicitly **not** changing, both decided in the gap-analysis review:

- **Item-level add-ons** (an item's own optional extra, like "add cheese +$2") still just live as prose inside `description`. Not building a structured add-on field — the current workaround reads fine and there's no ordering/checkout system on the site that would ever need to compute a price from it.
- **Non-fixed ("Market") pricing** still has no representation. An item priced that way gets left out of the file, same as The North Glengarry's NY Strip Steak was. Revisit only if this pattern shows up at a second restaurant.

One thing flagged, not decided here: keeping `hours` as free text (a v1 decision) means retyping the whole sentence in French per restaurant rather than translating a handful of day-of-week labels once, sitewide. That trade-off looked fine before bilingual was in scope. Not proposing to reopen it — just noting it's still on the table if the retyping cost gets annoying in practice.

## Bilingual field shape

Every bilingual field is an object:

```yaml
name:
  en: "Joe's Pizza"
  fr: "Pizza de Joe"
```

`en` is required. `fr` is optional — when it's missing, the value falls back to `en` rather than failing validation or rendering blank. Fields that aren't human-readable prose (prices, dates, paths, phone numbers, addresses) stay plain values, unchanged from v1 — translating a phone number or a file path doesn't mean anything.

## Fields

**Top level (frontmatter):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | bilingual string | yes | Restaurant's display name |
| `phone` | string | yes | Unchanged — shown as a `tel:` link |
| `address` | string | yes | Unchanged |
| `website` | string | no | Unchanged |
| `hours` | bilingual string | yes | Still free text (v1 decision) — see the flagged note above |
| `lastVerified` | date (`YYYY-MM-DD`) | yes | Unchanged |
| `storefrontPhoto` | string (path) | yes | Unchanged |
| `about` | bilingual string | no | **New.** Free-text blurb — history, ambiance, whatever's worth saying. Omit entirely if there's nothing to add |
| `menu` | array of categories | yes | Unchanged structurally; categories now support `note` (below) |

**Menu category** (each entry in `menu`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `category` | bilingual string | yes | e.g. `{ en: "Pizza", fr: "Pizza" }` — accordion heading on the detail page |
| `note` | bilingual string | no | **New.** Applies to every item in this category — "served with fries and coleslaw," "add chicken +$6," gluten-free surcharges. Free text, not structured pricing — deliberately not building a modifier system (see Gap 2/Gap 4 above). Omit entirely if the category doesn't need one |
| `items` | array of items | yes | |

**Menu item** (each entry in a category's `items`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | bilingual string | yes | |
| `description` | bilingual string | no | |
| `photo` | string (path) | no | Unchanged |
| `price` | number | one of `price` or `variants` | Unchanged — still just a number, never translated |
| `variants` | array of `{ label, price }` | one of `price` or `variants` | `label` is now bilingual; `price` stays a plain number |

## Example

An updated `joes-pizza.example.md`, showing every new/changed shape:

```yaml
---
name:
  en: "Joe's Pizza"
  fr: "Pizza de Joe"
phone: "555-0142"
address: "12 Main St, Alexandria, ON"
website: "https://joespizza.example.com"
hours:
  en: "Mon-Sat 11am-9pm, Sun closed"
  fr: "Lun-Sam 11h-21h, Dim fermé"
lastVerified: 2026-07-01
storefrontPhoto: "/images/restaurants/joes-pizza/storefront.jpg"

about:
  en: "A neighbourhood spot serving wood-fired pizza since 1998."
  fr: "Un endroit de quartier servant de la pizza au four à bois depuis 1998."

menu:
  - category:
      en: "Pizza"
      fr: "Pizza"
    note:
      en: "Gluten-free crust available, +$3."
      fr: "Croûte sans gluten disponible, +3 $."
    items:
      - name:
          en: "Margherita"
          fr: "Margherita"
        description:
          en: "Tomato, mozzarella, basil"
          fr: "Tomate, mozzarella, basilic"
        variants:
          - label:
              en: "Small"
              fr: "Petit"
            price: 12.00
          - label:
              en: "Large"
              fr: "Grand"
            price: 18.00
  - category:
      en: "Salads"
      fr: "Salades"
    items:
      - name:
          en: "Caesar salad"
          fr: "Salade César"
        description:
          en: "Romaine, parmesan, croutons"
          fr: "Romaine, parmesan, croûtons"
        price: 9.00
        photo: "/images/restaurants/joes-pizza/caesar-salad.jpg"
---
```

Note that "Salads" has no `note`, since the field is optional and this category doesn't need one — that's the expected shape for most categories, not an oversight.

## Next step

If this looks right, the follow-up implementation work is: rewriting `parseRestaurant.js`'s validation for the bilingual shape (require `en`, accept optional `fr`, apply the fallback), updating `db.js`'s schema to store both languages per translatable column, and updating `ingest.js`'s insert logic to match — plus regenerating `joes-pizza.example.md` in the repo, and (if you want) updating your local `joes-pizza.md`/`the-diner.md` test files the same way. None of that's been touched yet — say the word whenever you're ready for it.

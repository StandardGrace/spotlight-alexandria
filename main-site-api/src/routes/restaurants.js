import { Router } from "express";
import { openDb } from "../restaurants/db.js";

const router = Router();

// Same file the ingest script writes to (see scripts/ingestRestaurants.js).
// Opened once here and reused across requests - node:sqlite's DatabaseSync
// is synchronous, and WAL mode (already set inside openDb) lets this read
// connection see whatever the separate `npm run ingest:restaurants` process
// last committed, without this route needing to reopen the file per request.
const DB_FILE = process.env.RESTAURANT_DB_FILE || "./data/restaurants.sqlite3";
const db = openDb(DB_FILE);

// Turns a nullable (en, fr) column pair into a bilingual object, or null
// when the underlying optional field (about, category note, item
// description) was never set. Required bilingual fields (name, hours,
// category, item name, variant label) are never null - the parser
// guarantees both columns are populated whenever a row exists at all.
function toBilingual(en, fr) {
  return en == null ? null : { en, fr };
}

const selectRestaurants = db.prepare(`
  SELECT id, name_en, name_fr, phone, storefront_photo
  FROM restaurants
  ORDER BY name_en
`);

const selectRestaurantById = db.prepare(`
  SELECT * FROM restaurants WHERE id = ?
`);

const selectCategories = db.prepare(`
  SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY sort_order
`);

const selectItems = db.prepare(`
  SELECT * FROM menu_items WHERE category_id = ? ORDER BY sort_order
`);

const selectVariants = db.prepare(`
  SELECT * FROM item_variants WHERE item_id = ? ORDER BY sort_order
`);

// GET /api/restaurants - light fields only, for the landing page grid.
// No menu content here on purpose - the grid just needs enough to
// identify and link to a restaurant, per the presentation-layer design
// in TECHNICAL_DESIGN.md.
router.get("/", (req, res) => {
  const rows = selectRestaurants.all();
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: { en: r.name_en, fr: r.name_fr },
      phone: r.phone,
      storefrontPhoto: r.storefront_photo,
    }))
  );
});

// GET /api/restaurants/:id - full record for the detail page, including
// the whole menu (categories -> items -> variants) in one response so the
// frontend doesn't need a waterfall of requests to render one page.
router.get("/:id", (req, res) => {
  const restaurant = selectRestaurantById.get(req.params.id);
  if (!restaurant) {
    return res.status(404).json({ error: `No restaurant with id "${req.params.id}"` });
  }

  const menu = selectCategories.all(restaurant.id).map((category) => ({
    category: { en: category.category_en, fr: category.category_fr },
    note: toBilingual(category.note_en, category.note_fr),
    items: selectItems.all(category.id).map((item) => {
      const variants = selectVariants.all(item.id).map((v) => ({
        label: { en: v.label_en, fr: v.label_fr },
        price: v.price,
      }));
      return {
        name: { en: item.name_en, fr: item.name_fr },
        description: toBilingual(item.description_en, item.description_fr),
        photo: item.photo,
        // Mirrors the parser's own price/variants XOR - exactly one of
        // these is populated, never both, never neither.
        price: item.price,
        variants: variants.length > 0 ? variants : null,
      };
    }),
  }));

  res.json({
    id: restaurant.id,
    name: { en: restaurant.name_en, fr: restaurant.name_fr },
    phone: restaurant.phone,
    address: restaurant.address,
    website: restaurant.website,
    hours: { en: restaurant.hours_en, fr: restaurant.hours_fr },
    about: toBilingual(restaurant.about_en, restaurant.about_fr),
    lastVerified: restaurant.last_verified,
    storefrontPhoto: restaurant.storefront_photo,
    menu,
  });
});

export default router;
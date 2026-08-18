import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Using Node's built-in node:sqlite (stable without a flag since Node
// 22.13/23.4) instead of better-sqlite3: no native module means no
// node-gyp/Visual Studio toolchain to install on a dev machine, and one
// less thing that can break across a future Node upgrade. Trade-off is
// it's still labeled experimental upstream (release-candidate as of Node
// 25.7) - fine for this project's scale, worth revisiting if that ever
// changes.

// Normalized rather than one big JSON blob per restaurant: menu[] ->
// categories -> items -> variants each get their own table so the future
// API layer can query/join with plain SQL instead of parsing JSON on every
// request. Everything cascades from `restaurants`, which is what
// ingest.js relies on to clear out a restaurant's old menu in one DELETE
// before re-inserting the current one.
// v2: every bilingual field gets a paired _en/_fr column rather than a
// generic translations table - simpler queries at this scale, and it
// mirrors how the parser already resolves fr's fallback-to-en before
// this data ever arrives here (see parseRestaurant.js's
// resolveBilingual). A field that's optional overall (about, note,
// description) has both its _en and _fr columns nullable together -
// either the field was omitted (both null) or it was present (both
// populated, fr already resolved). Required bilingual fields (name,
// hours, category, item name, variant label) are NOT NULL on both
// columns, since resolveBilingual guarantees both whenever validation
// succeeds at all.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  website TEXT,
  hours_en TEXT NOT NULL,
  hours_fr TEXT NOT NULL,
  about_en TEXT,
  about_fr TEXT,
  last_verified TEXT NOT NULL,
  storefront_photo TEXT NOT NULL,
  source_file TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_en TEXT NOT NULL,
  category_fr TEXT NOT NULL,
  note_en TEXT,
  note_fr TEXT,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  description_en TEXT,
  description_fr TEXT,
  photo TEXT,
  price REAL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS item_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  label_en TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  price REAL NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_item_variants_item ON item_variants(item_id);
`;

export function openDb(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
  // node:sqlite has no .pragma() convenience method (unlike better-sqlite3) -
  // PRAGMAs just go through exec() like any other statement.
  // enableForeignKeyConstraints defaults to true, but set it explicitly
  // since ON DELETE CASCADE depends on it.
  const db = new DatabaseSync(filePath, { enableForeignKeyConstraints: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA);
  return db;
}
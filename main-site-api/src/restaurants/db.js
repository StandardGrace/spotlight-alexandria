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
const SCHEMA = `
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  website TEXT,
  hours TEXT NOT NULL,
  last_verified TEXT NOT NULL,
  storefront_photo TEXT NOT NULL,
  source_file TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  photo TEXT,
  price REAL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS item_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
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

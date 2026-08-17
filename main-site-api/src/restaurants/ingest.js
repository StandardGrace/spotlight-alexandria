import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { openDb } from "./db.js";
import { parseRestaurantFile } from "./parseRestaurant.js";

// Reads every restaurant .md file from `contentDir`, validates each one,
// and does a full transactional rebuild of the SQLite tables from
// whatever currently parses cleanly. This is a "loads the files into
// SQLite on update" script per the ticket, not a request-time reader -
// run it manually (or wire it into a cron/git-hook later) whenever the
// content directory changes.
//
// A file that fails validation is skipped, not fatal - one bad restaurant
// shouldn't take the rest of the site's menus down. It's reported back in
// `failed` so the caller can surface it loudly.
export async function ingestRestaurants({ contentDir, dbFile }) {
  if (!contentDir) {
    throw new Error(
      "RESTAURANT_CONTENT_DIR is not set - point it at the directory of restaurant .md files"
    );
  }

  let filenames;
  try {
    filenames = (await readdir(contentDir)).filter((f) => f.endsWith(".md"));
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`RESTAURANT_CONTENT_DIR does not exist: ${contentDir}`);
    }
    throw err;
  }

  const valid = [];
  const failed = [];

  for (const filename of filenames) {
    const raw = await readFile(path.join(contentDir, filename), "utf-8");
    const result = parseRestaurantFile(filename, raw);
    if (result.errors.length > 0) {
      failed.push({ file: filename, errors: result.errors });
    } else {
      valid.push(result.restaurant);
    }
  }

  // Two files landing on the same slug (id) would otherwise silently
  // clobber each other as the SQLite primary key - catch it explicitly
  // instead of letting whichever insert runs last quietly win.
  const firstSeenBy = new Map();
  for (const restaurant of valid) {
    if (firstSeenBy.has(restaurant.id)) {
      failed.push({
        file: restaurant.sourceFile,
        errors: [
          `duplicate restaurant id "${restaurant.id}" - also used by ${firstSeenBy.get(
            restaurant.id
          )}`,
        ],
      });
    } else {
      firstSeenBy.set(restaurant.id, restaurant.sourceFile);
    }
  }
  const toIngest = valid.filter(
    (restaurant) => firstSeenBy.get(restaurant.id) === restaurant.sourceFile
  );

  const db = openDb(dbFile);
  const updatedAt = new Date().toISOString();

  const insertRestaurant = db.prepare(`
    INSERT INTO restaurants
      (id, name, phone, address, website, hours, last_verified, storefront_photo, source_file, updated_at)
    VALUES
      (:id, :name, :phone, :address, :website, :hours, :lastVerified, :storefrontPhoto, :sourceFile, :updatedAt)
  `);
  const insertCategory = db.prepare(`
    INSERT INTO menu_categories (restaurant_id, category, sort_order) VALUES (?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO menu_items (category_id, name, description, photo, price, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO item_variants (item_id, label, price, sort_order) VALUES (?, ?, ?, ?)
  `);

  // node:sqlite has no db.transaction() helper (unlike better-sqlite3) -
  // BEGIN/COMMIT/ROLLBACK by hand instead.
  function runIngest(restaurants) {
    db.exec("BEGIN");
    try {
      // Full refresh: at this scale (a handful of restaurants, authored by
      // hand) a clean rebuild each run is simpler and safer than diffing
      // old vs. new menu structure. ON DELETE CASCADE takes care of
      // categories/items/variants.
      db.prepare("DELETE FROM restaurants").run();

      for (const restaurant of restaurants) {
        // Bind an explicit object (not `{ ...restaurant, updatedAt }`) so an
        // unrelated extra field like `menu` can never accidentally collide
        // with a bind parameter name.
        insertRestaurant.run({
          id: restaurant.id,
          name: restaurant.name,
          phone: restaurant.phone,
          address: restaurant.address,
          website: restaurant.website,
          hours: restaurant.hours,
          lastVerified: restaurant.lastVerified,
          storefrontPhoto: restaurant.storefrontPhoto,
          sourceFile: restaurant.sourceFile,
          updatedAt,
        });

        restaurant.menu.forEach((category, ci) => {
          const categoryId = insertCategory.run(restaurant.id, category.category, ci)
            .lastInsertRowid;

          category.items.forEach((item, ii) => {
            const itemId = insertItem.run(
              categoryId,
              item.name,
              item.description ?? null,
              item.photo ?? null,
              item.price ?? null,
              ii
            ).lastInsertRowid;

            (item.variants ?? []).forEach((variant, vi) => {
              insertVariant.run(itemId, variant.label, variant.price, vi);
            });
          });
        });
      }

      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  runIngest(toIngest);
  db.close();

  return {
    ingested: toIngest.map((r) => r.id),
    failed,
  };
}

import "dotenv/config";
import { ingestRestaurants } from "../restaurants/ingest.js";

// Run with: npm run ingest:restaurants
// Rebuilds the restaurant SQLite database from RESTAURANT_CONTENT_DIR.
// Exits non-zero if any file failed validation, so this is safe to wire
// into a cron job or git hook later and have it actually alert on
// problems - restaurants that DID parse cleanly still get written either
// way, only the broken file(s) are left out.

const CONTENT_DIR = process.env.RESTAURANT_CONTENT_DIR;
const DB_FILE = process.env.RESTAURANT_DB_FILE || "./data/restaurants.sqlite3";

try {
  const { ingested, failed } = await ingestRestaurants({
    contentDir: CONTENT_DIR,
    dbFile: DB_FILE,
  });

  console.log(`[restaurants ok] ${ingested.length} restaurant(s) written to ${DB_FILE}`);
  for (const id of ingested) {
    console.log(`  - ${id}`);
  }

  if (failed.length > 0) {
    console.error(`\n[restaurants skipped] ${failed.length} file(s) failed validation:`);
    for (const { file, errors } of failed) {
      console.error(`  ${file}`);
      for (const message of errors) {
        console.error(`    - ${message}`);
      }
    }
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`[restaurants failed] ${err.message}`);
  process.exitCode = 1;
}

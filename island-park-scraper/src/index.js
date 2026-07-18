import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import { fetchIslandParkStatus } from "./scraper.js";
import { readCache, writeCache } from "./cache.js";

const PORT = process.env.PORT || 3001;
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || "0 */6 * * *"; // every 6h by default
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN }));

let lastError = null;

async function runScrape() {
  try {
    const result = await fetchIslandParkStatus();
    await writeCache(result);
    lastError = null;
    console.log(`[scrape ok] ${result.checkedAt} status=${result.status}`);
  } catch (err) {
    lastError = { message: err.message, at: new Date().toISOString() };
    console.error(`[scrape failed] ${lastError.at}: ${err.message}`);
    // Deliberately don't overwrite the cache on failure - callers keep
    // getting the last known-good status instead of an error.
  }
}

app.get("/api/island-park", async (req, res) => {
  const cached = await readCache();

  if (!cached) {
    return res.status(503).json({
      error: "No data yet - initial scrape hasn't completed or failed",
      lastError,
    });
  }

  res.json({
    ...cached,
    stale: lastError !== null,
  });
});

app.get("/health", async (req, res) => {
  const cached = await readCache();
  res.json({
    ok: true,
    hasData: cached !== null,
    lastCheckedAt: cached?.checkedAt || null,
    lastError,
  });
});

app.listen(PORT, () => {
  console.log(`island-park-scraper listening on port ${PORT}`);
});

// Run once immediately on startup so there's data right away, then follow
// the cron schedule for subsequent checks.
runScrape();
cron.schedule(CRON_SCHEDULE, runScrape);

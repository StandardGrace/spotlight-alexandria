import { Router } from "express";

const router = Router();

// The scraper is a separate standalone service (island-park-scraper),
// reached over the internal network - not exposed to the browser directly.
const SCRAPER_URL =
  process.env.ISLAND_PARK_API_URL || "http://localhost:3001/api/island-park";

router.get("/island-park", async (req, res) => {
  try {
    const upstream = await fetch(SCRAPER_URL);

    if (!upstream.ok) {
      return res.status(502).json({
        error: `Scraper service returned HTTP ${upstream.status}`,
      });
    }

    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({
      error: "Could not reach the Island Park scraper service",
      detail: err.message,
    });
  }
});

export default router;

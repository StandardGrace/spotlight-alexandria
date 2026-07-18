import { Router } from "express";
import { getWeatherCache, getWeatherLastError } from "../jobs/weatherJob.js";

const router = Router();

router.get("/", async (req, res) => {
  const cached = await getWeatherCache();
  const lastError = getWeatherLastError();

  if (!cached) {
    return res.status(503).json({
      error: "No weather data yet - initial fetch hasn't completed or failed",
      lastError,
    });
  }

  res.json({ ...cached, stale: lastError !== null });
});

export default router;

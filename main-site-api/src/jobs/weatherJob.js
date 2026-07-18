import cron from "node-cron";
import { fetchWeather } from "../services/weather.js";
import { readCache, writeCache } from "../cache.js";

const CACHE_FILE = process.env.WEATHER_CACHE_FILE || "./data/weather-cache.json";
const CRON_SCHEDULE = process.env.WEATHER_CRON_SCHEDULE || "*/30 * * * *"; // every 30 min

let lastError = null;

async function runWeatherFetch() {
  try {
    const data = await fetchWeather();
    await writeCache(CACHE_FILE, data);
    lastError = null;
    console.log(`[weather ok] ${data.fetchedAt}`);
  } catch (err) {
    lastError = { message: err.message, at: new Date().toISOString() };
    console.error(`[weather failed] ${lastError.at}: ${err.message}`);
    // Same rule as the scraper: don't overwrite the cache on failure,
    // keep serving the last known-good forecast instead.
  }
}

export function startWeatherJob() {
  runWeatherFetch();
  cron.schedule(CRON_SCHEDULE, runWeatherFetch);
}

export async function getWeatherCache() {
  return readCache(CACHE_FILE);
}

export function getWeatherLastError() {
  return lastError;
}

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const CACHE_FILE = process.env.CACHE_FILE || "./data/cache.json";

export async function readCache() {
  try {
    const raw = await readFile(CACHE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function writeCache(data) {
  await mkdir(dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

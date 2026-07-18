const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function fetchIslandParkStatus() {
  const res = await fetch(`${API_BASE_URL}/api/conditions/island-park`);
  if (!res.ok) {
    throw new Error(`Failed to load swim conditions (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchWeather() {
  const res = await fetch(`${API_BASE_URL}/api/weather`);
  if (!res.ok) {
    throw new Error(`Failed to load weather (HTTP ${res.status})`);
  }
  return res.json();
}

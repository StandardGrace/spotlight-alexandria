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

export async function fetchRestaurants() {
  const res = await fetch(`${API_BASE_URL}/api/restaurants`);
  if (!res.ok) {
    throw new Error(`Failed to load restaurants (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchRestaurant(id) {
  const res = await fetch(`${API_BASE_URL}/api/restaurants/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to load restaurant (HTTP ${res.status})`);
  }
  return res.json();
}
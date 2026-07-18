const WEATHER_API_URL = "https://api.weatherapi.com/v1/forecast.json";

const API_KEY = process.env.WEATHER_API_KEY;
const LOCATION = process.env.WEATHER_LOCATION || "Alexandria,Ontario";

// WeatherAPI returns condition icon URLs without a protocol
// (e.g. "//cdn.weatherapi.com/..."), so prefix https: to make them usable.
function iconUrl(path) {
  return path ? `https:${path}` : null;
}

async function fetchRaw(lang) {
  // WeatherAPI's free plan caps forecasts at 3 days regardless of what's
  // requested here - requesting more just wastes a query param. Bump this
  // if the account is ever upgraded to a plan with a longer forecast.
  const url = `${WEATHER_API_URL}?key=${API_KEY}&q=${encodeURIComponent(
    LOCATION
  )}&days=3&aqi=no&alerts=no&lang=${lang}`;

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WeatherAPI returned HTTP ${res.status}: ${body}`);
  }

  return res.json();
}

// Combines the English and French responses into one bilingual shape.
// Numeric fields (temps, wind, humidity) are identical between the two
// calls - only condition text differs by language, so that's the only
// thing pulled from the French response. Day-of-week names are NOT
// computed here on purpose: this cache is shared across every visitor
// regardless of which language they've picked, so baking in one
// language's weekday names would make it impossible to serve the other.
// The frontend derives weekday labels from the raw `date` field using
// whichever language is currently active.
function transformWeather(rawEn, rawFr) {
  const current = rawEn.current;
  const currentFr = rawFr.current;
  const forecastDaysEn = rawEn.forecast?.forecastday || [];
  const forecastDaysFr = rawFr.forecast?.forecastday || [];

  return {
    location: `${rawEn.location.name}, ${rawEn.location.region}`,
    current: {
      tempC: current.temp_c,
      feelsLikeC: current.feelslike_c,
      condition: {
        en: current.condition.text,
        fr: currentFr.condition.text,
      },
      icon: iconUrl(current.condition.icon),
      windKph: current.wind_kph,
      humidity: current.humidity,
    },
    forecast: forecastDaysEn.map((d, i) => ({
      date: d.date,
      maxTempC: d.day.maxtemp_c,
      minTempC: d.day.mintemp_c,
      condition: {
        en: d.day.condition.text,
        fr: forecastDaysFr[i]?.day.condition.text || d.day.condition.text,
      },
      icon: iconUrl(d.day.condition.icon),
      chanceOfRainPct: d.day.daily_chance_of_rain,
    })),
    sourceLastUpdated: current.last_updated,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchWeather() {
  if (!API_KEY) {
    throw new Error("WEATHER_API_KEY is not set");
  }

  const [rawEn, rawFr] = await Promise.all([
    fetchRaw("en"),
    fetchRaw("fr"),
  ]);

  return transformWeather(rawEn, rawFr);
}

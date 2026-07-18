import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchWeather } from "../api/client.js";

// Midday avoids the date shifting a day due to local timezone parsing.
function dayLabel(dateStr, locale) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale, {
    weekday: "short",
  });
}

export default function WeatherCard() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeather()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="card">
        <p className="card-title">{t("weather.cardTitle")}</p>
        <p className="error-text">{t("weather.loadError")}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <p className="card-title">{t("weather.cardTitle")}</p>
        <p className="loading-text">{t("weather.loading")}</p>
      </div>
    );
  }

  const locale = i18n.language === "fr" ? "fr-CA" : "en-US";
  const currentCondition =
    data.current.condition[i18n.language] || data.current.condition.en;

  return (
    <div className="card">
      <p className="card-title">{t("weather.cardTitle")}</p>
      <div className="current-temp-row">
        <img
          src={data.current.icon}
          alt={currentCondition}
          className="current-icon"
        />
        <span className="current-temp">{Math.round(data.current.tempC)}°C</span>
        <span className="current-condition">{currentCondition}</span>
      </div>
      <p className="feels-like-text">
        {t("weather.feelsLike", { temp: Math.round(data.current.feelsLikeC) })}
      </p>
      <div className="weather-stats-row">
        <span>
          {t("weather.wind", { speed: Math.round(data.current.windKph) })}
        </span>
        <span>{t("weather.humidity", { percent: data.current.humidity })}</span>
      </div>
      <details>
        <summary className="forecast-toggle">
          {t("weather.forecastToggle")}
        </summary>
        <div className="forecast-days">
          {data.forecast.map((day) => {
            const condition = day.condition[i18n.language] || day.condition.en;
            return (
              <div className="forecast-day" key={day.date}>
                <p className="forecast-day-label">
                  {dayLabel(day.date, locale)}
                </p>
                <img src={day.icon} alt={condition} className="forecast-icon" />
                <p className="forecast-day-temps">
                  {Math.round(day.maxTempC)}° / {Math.round(day.minTempC)}°
                </p>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}

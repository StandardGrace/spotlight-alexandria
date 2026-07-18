import { useTranslation } from "react-i18next";
import SwimStatusCard from "../components/SwimStatusCard.jsx";
import WeatherCard from "../components/WeatherCard.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";

export default function LocalConditionsPage() {
  const { t } = useTranslation();

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{t("site.title")}</h1>
          <p className="page-subtitle">{t("site.subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </div>
      <div className="card-grid">
        <SwimStatusCard />
        <WeatherCard />
      </div>
    </div>
  );
}

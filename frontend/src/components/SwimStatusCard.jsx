import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchIslandParkStatus } from "../api/client.js";
import { getRelativeTimeParts } from "../utils/formatRelativeTime.js";

const STATUS_CLASSES = {
  safe: "status-safe",
  unsafe: "status-unsafe",
  closed: "status-closed",
  not_monitored: "status-unknown",
  unknown: "status-unknown",
};

export default function SwimStatusCard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchIslandParkStatus()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="card">
        <p className="card-title">{t("swim.cardTitle")}</p>
        <p className="error-text">{t("swim.loadError")}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card">
        <p className="card-title">{t("swim.cardTitle")}</p>
        <p className="loading-text">{t("swim.loading")}</p>
      </div>
    );
  }

  const statusClass = STATUS_CLASSES[data.status] || "status-unknown";
  const relTime = getRelativeTimeParts(data.sourceLastUpdatedAt);
  const relTimeText =
    relTime.count !== undefined
      ? t(`relativeTime.${relTime.key}`, { count: relTime.count })
      : t(`relativeTime.${relTime.key}`);

  return (
    <div className="card">
      <p className="card-title">{t("swim.cardTitle")}</p>
      <span className={`status-badge ${statusClass}`}>
        {t(`swim.status.${data.status}`)}
      </span>
      <p className="meta-text">
        {t("swim.updated", { time: relTimeText })}
        {data.stale ? t("swim.staleNote") : ""}
      </p>
      <p className="disclaimer-text">
        {t("swim.disclaimer")}{" "}
        <a href={data.sourceUrl} target="_blank" rel="noreferrer">
          {t("swim.verifyLink")}
        </a>
      </p>
    </div>
  );
}

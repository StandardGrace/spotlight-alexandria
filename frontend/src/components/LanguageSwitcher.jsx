import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { lang } = useParams();
  const { t } = useTranslation();

  return (
    <div className="language-switcher">
      <Link to="/en" className={lang === "en" ? "active" : ""}>
        {t("language.en")}
      </Link>
      {" | "}
      <Link to="/fr" className={lang === "fr" ? "active" : ""}>
        {t("language.fr")}
      </Link>
    </div>
  );
}
